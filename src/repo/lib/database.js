import Cursor from 'pg-cursor';
import { randomUUID } from 'node:crypto';
import { formatInsertManyValues, clientWithTransaction, pool } from '../../postgres-utils/index.js';
import { Contributor, repositories, Repository } from './repository.js';

/**
 * @param {Repository} repo
 */
export async function insertNewRepositoryAndSetIds(repo) {
  await clientWithTransaction(async client => {
    const repoResult = await client.query(
      'INSERT INTO repository (name, uuid, type, git_url) VALUES($1, $2, $3, $4) RETURNING id',
      [repo.name, repo.uuid, repo.type, repo.gitUrl]
    );

    if (!repoResult.rows || repoResult.rows.length < 1) {
      throw Error('Expected repository record ID after insertion');
    }

    repo.dbId = repoResult.rows[0].id;
  });
}

/**
 * Stores all repositories from the database in the cache map
 */
export async function loadAllRepositoriesIntoCache() {
  // Fetch repository
  const result = await pool.query(
    `SELECT 
    r.id AS repository_db_id,
    r.uuid AS repository_uuid,
    r.name AS repository_name,
    r.git_url AS repository_git_url,
    r.type AS repository_type,

    c.id AS contributor_db_id,
    c.uuid AS contributor_uuid,
    c.email AS contributor_email

    FROM repository r
    LEFT JOIN contributor c ON r.id = c.repository_id`

  );

  // Bail if there is not a single repository
  if (!result.rows.length) {
    return;
  }

  result.rows.forEach(row => {
    const repoUuid = row.repository_uuid;
    let repo = repositories.get(repoUuid);

    // If repo does not already exist in map
    if (!repo) {
      repo = new Repository(
        row.repository_name,
        row.repository_db_id,
        repoUuid,
        row.repository_git_url,
        row.repository_type,
        [] // Empty contributors array
      );

      repositories.set(repoUuid, repo);
    }

    // Add contributor if it exists in the row
    if (row.contributor_db_id) {
      repo.contributors.push(
        new Contributor(
          row.contributor_email, 
          row.contributor_db_id, 
          row.contributor_uuid
        )
      );
    }
  });
}



/**
 * @param {Repository} repository
 */
export async function updateRepositoryInformation(repository) {
  const result = await pool.query(
    `UPDATE repository SET name = $1, type = $2, git_url = $3 WHERE id = $4`,
    [repository.name, repository.type, repository.gitUrl, repository.dbId]
  );
}

/**
 * @param {string} uuid 
 */
export async function removeRepositoryByUuid(uuid) {

  await clientWithTransaction(async client => {
    await client.query(
      `DELETE FROM git_commit
      USING contributor c, repository r
      WHERE git_commit.contributor_id = c.id
        AND c.repository_id = r.id
        AND r.uuid = $1`,
      [uuid]
    );

    await client.query('DELETE FROM repository WHERE uuid = $1', [uuid]);
  });
}

/**
 * @param {Repository} repository
 * @returns {Set<string>}
 */
export async function getAllCommitHashes(repository) {
  let client = null;
  const hashes = new Set();

  try {
    client = await pool.connect();

    const cursor = await client.query(
      new Cursor(
        `SELECT 
        g.hash AS commit_hash
  
        FROM repository r
        JOIN contributor c ON r.id = c.repository_id
        JOIN git_commit g ON c.id = g.contributor_id
        
        WHERE r.uuid = $1`,
        [repository.uuid]
      )
    );

    // Read batches of 100 commit hashes from the db to
    // add to the set
    while (true) {
      const rows = await cursor.read(100);

      if (!rows.length) {
        break;
      }

      for (const row of rows) {
        hashes.add(row.commit_hash);
      }
    }

    cursor.close();
  } catch (error) {
    throw Error('Could not load commit hashes for repository with uuid: ' + repository.uuid, {
      cause: error
    });
  } finally {
    client.release();
  }

  return hashes;
}

/**
 * @param {Repository} repository
 */
export async function insertContributors(repository) {
  const { valuesString, parameters } = formatInsertManyValues(
    repository.contributors,
    (parameters, contributor) => {
      parameters.push(
        contributor.uuid,
        contributor.email,
        repository.dbId
      );
    }
  );

  const result = await pool.query(
    `INSERT INTO contributor (uuid, email, repository_id) 
    VALUES ${valuesString} 
    ON CONFLICT (email, repository_id)
    DO UPDATE SET
      uuid = EXCLUDED.uuid
    RETURNING id`,
    parameters
  );

  if (!result.rows || result.rows.length < repositories.length) {
    throw Error('Expected record IDs after insertion');
  }

  repository.contributors.forEach((contributor, idx) => (contributor.dbId = result.rows[idx].id));
}

export async function insertCommits(commitInfos) {
  if (!commitInfos || commitInfos.length < 1) {
    return;
  }

  const { valuesString, parameters } = formatInsertManyValues(
    commitInfos,
    (parameters, commitInfo) => {
      parameters.push(commitInfo.hash, commitInfo.isoDate, commitInfo.contributorDbId);
    }
  );

  await pool.query(
    `INSERT INTO git_commit (hash, time, contributor_id) 
    VALUES ${valuesString} 
    ON CONFLICT (hash) 
    DO UPDATE SET
      time = EXCLUDED.time,
      contributor_id = EXCLUDED.contributor_id`,
    parameters
  );
}

/**
 * @param {Repository} repository 
 * @param {Map<string:string[]>} branchCommitMap Map<branchName, commitList>
 */
export async function createRepositorySnapshot(repository, branchCommitMap) {
  
  await clientWithTransaction(async client => {
    
    const repoSnapshotId = await insertRepoSnapshot(client, repository);

    const branchIdMap = await insertBranchSnapshots(client, branchCommitMap, repoSnapshotId);

    await insertBranchCommitList(client, branchCommitMap, branchIdMap);


    // Timestamp at end of snapshot
    await client.query(
      `UPDATE repo_snapshot SET creation_end_time = $1 WHERE id = $2`,
      [new Date().toISOString(), repoSnapshotId]
    );
  });
}

/**
 * @param {pg.PoolClient} client 
 * @param {Repository} repository 
 * @returns {number} repo_snapshot dbId
 */
async function insertRepoSnapshot(client, repository) {
  const startTime= new Date().toISOString();

  const result= await client.query(
    `INSERT INTO repo_snapshot 
    (created, repository_id, creation_start_time, creation_end_time)
    VALUES ($1, $2, $3, $4)
    RETURNING id`,
    [startTime, repository.dbId, startTime, null]
  );

  if (!result.rows || result.rows.length < 1) {
    throw Error('Expected repo_snapshot record ID after insertion');
  }

  return result.rows[0].id;
}

/**
 * @param {pg.PoolClient} client 
 * @param {Map<string:string[]>} branchCommitMap Map<branchName, commitList>
 * @param {number} repoSnapshotId 
 * @returns {Map<string:number>}  Map<branchName, branch_snapshot_dbId>
 */
async function insertBranchSnapshots(client, branchCommitMap, repoSnapshotId) {
  const { valuesString, parameters } = formatInsertManyValues(
    branchCommitMap,
    (parameters, entry) => {
      const branchName = entry[0];
      const commitList = entry[1];
      parameters.push(randomUUID(), branchName, repoSnapshotId, commitList.length);
    }
  );

  const result = await client.query(    
    `INSERT INTO branch_snapshot (uuid, name, repo_snapshot_id, commit_count) 
    VALUES ${valuesString}
    RETURNING name, id`,
    parameters
  );

  if (!result.rows || result.rows.length < 1) {
    throw Error('Expected branch_snapshot record ID after insertion');
  }

  return new Map(result.rows.map(branch => [branch.name, branch.id]));

}

/**
 * @param {pg.PoolClient} client 
 * @param {Map<string:string[]>} branchCommitMap Map<branchName, commitList>
 * @param {Map<string:number>} branchIdMap Map<branchName, branch_snapshot_dbId>
 */
async function insertBranchCommitList(client, branchCommitMap, branchIdMap) {
}
