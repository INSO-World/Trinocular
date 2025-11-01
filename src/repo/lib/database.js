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
      'INSERT INTO repository (name, uuid, type, git_url, auth_token) VALUES($1, $2, $3, $4, $5) RETURNING id',
      [repo.name, repo.uuid, repo.type, repo.gitUrl, repo.authToken]
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
    r.auth_token AS repository_auth_token,
    
    c.id AS contributor_db_id,
    c.uuid AS contributor_uuid,
    c.email AS contributor_email,
    c.author_name AS contributor_name
    
    FROM repository r
    LEFT JOIN contributor c ON r.id = c.repository_id`
  );

  const branchResult = await pool.query(
    `SELECT DISTINCT
    r.uuid AS repository_uuid,
    b.name AS branch_name
    FROM repository r 
    JOIN repo_snapshot s ON r.id = s.repository_id
    JOIN branch_snapshot b ON s.id = b.repo_snapshot_id`
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
        [], // Empty contributors array,
        [], // Start with empty branchNames array
        row.repository_auth_token
      );

      repositories.set(repoUuid, repo);
    }

    // Add contributor if it exists in the row
    if (row.contributor_db_id) {
      repo.contributors.push(
        new Contributor(
          row.contributor_name,
          row.contributor_email,
          row.contributor_db_id,
          row.contributor_uuid
        )
      );
    }
  });

  branchResult.rows.forEach(row => {
    const repoUuid = row.repository_uuid;
    let repo = repositories.get(repoUuid);
    //only if repo exists in map, should always be the case at this point
    if (repo) {
      repo.branchNames.push(row.branch_name);
    }
  });
}

/**
 * @param {Repository} repository
 */
export async function updateRepositoryInformation(repository) {
  const result = await pool.query(
    `UPDATE repository SET name = $1, type = $2, git_url = $3, auth_token = $4 WHERE id = $5`,
    [repository.name, repository.type, repository.gitUrl, repository.authToken, repository.dbId]
  );
}

/**
 * Delete all git data of a repository, but keep the repository record
 * itself. This resets the repository as if it was newly created.
 * @param {string} uuid
 * @param {import('pg').PoolClient?} client Provide own client when running the function
 * as part of a transaction
 */
export async function removeRepositoryGitDataByUuid(uuid, client= null) {
  client ||= pool;

  await client.query(
    `DELETE FROM git_commit
    USING contributor c, repository r
    WHERE git_commit.contributor_id = c.id
      AND c.repository_id = r.id
      AND r.uuid = $1`,
    [uuid]
  );
}

/**
 * Delete the entire repository
 * @param {string} uuid
 */
export async function removeRepositoryByUuid(uuid) {
  await clientWithTransaction(async client => {
    await removeRepositoryGitDataByUuid( uuid, client );

    await client.query('DELETE FROM repository WHERE uuid = $1', [uuid]);
  });
}

/**
 * @param {Repository} repository
 * @returns {Promise<Set<string>>}
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
      parameters.push(contributor.uuid, contributor.email, repository.dbId, contributor.authorName);
    }
  );

  const result = await pool.query(
    `INSERT INTO contributor (uuid, email, repository_id,author_name) 
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
      parameters.push(
        commitInfo.hash,
        commitInfo.isoDate,
        commitInfo.isMergeCommit,
        commitInfo.contributorDbId
      );
    }
  );

  await pool.query(
    `INSERT INTO git_commit (hash, time, is_merge_commit, contributor_id) 
    VALUES ${valuesString} 
    ON CONFLICT (hash) 
    DO UPDATE SET
      time = EXCLUDED.time,
      is_merge_commit = EXCLUDED.is_merge_commit,
      contributor_id = EXCLUDED.contributor_id`,
    parameters
  );
}

/**
 * @param {pg.PoolClient} client
 * @param {Repository} repository
 * @param {Date} startTime
 * @returns {Promise<number>} repo_snapshot dbId
 */
export async function insertRepoSnapshot(client, repository, startTime) {
  const result = await client.query(
    `INSERT INTO repo_snapshot 
    (repository_id, creation_start_time, creation_end_time)
    VALUES ($1, $2, $3)
    RETURNING id`,
    [repository.dbId, startTime.toISOString(), null]
  );

  if (!result.rows || result.rows.length < 1) {
    throw Error('Expected repo_snapshot record ID after insertion');
  }

  return result.rows[0].id;
}

/**
 *
 * @param {number} repoSnapshotId
 * @param {Date} endTime
 */
export async function insertRepoSnapshotEndTime(repoSnapshotId, endTime) {
  const result = await pool.query(`UPDATE repo_snapshot SET creation_end_time = $1 WHERE id = $2`, [
    endTime.toISOString(),
    repoSnapshotId
  ]);
}

/**
 * @param {pg.PoolClient} client
 * @param {number} repoSnapshotId
 * @param {string} branchName
 * @param {string[]} commitList Array of commit hashes
 */
export async function persistBranchSnapshot(client, repoSnapshotId, branchName, commitList) {
  const oldBranchSnapshotId = await getLatestBranchSnapshotId(client, repoSnapshotId, branchName);

  const newBranchSnapshotId = await insertBranchSnapshot(
    client,
    repoSnapshotId,
    branchName,
    commitList
  );

  await insertBranchCommitList(client, newBranchSnapshotId, oldBranchSnapshotId, commitList);
}

async function getLatestBranchSnapshotId(client, repoSnapshotId, branchName) {
  const result = await client.query(
    `SELECT bs.id as id
    FROM repo_snapshot rs
    JOIN branch_snapshot bs
      ON rs.id = bs.repo_snapshot_id
    WHERE bs.name = $1
      AND rs.repository_id = (
        SELECT repository_id FROM repo_snapshot WHERE id = $2
      )
    ORDER BY rs.creation_start_time DESC
    LIMIT 1`,
    [branchName, repoSnapshotId]
  );

  return result.rows.length ? result.rows[0].id : null;
}

/**
 * @param {pg.PoolClient} client
 * @param {number} repoSnapshotId
 * @param {string} branchName
 * @param {string[]} commitList
 */
async function insertBranchSnapshot(client, repoSnapshotId, branchName, commitList) {
  const result = await client.query(
    `INSERT INTO branch_snapshot (uuid, name, repo_snapshot_id, commit_count) 
    VALUES ($1, $2, $3, $4)
    RETURNING id`,
    [randomUUID(), branchName, repoSnapshotId, commitList.length]
  );

  if (!result.rows || result.rows.length < 1) {
    throw Error('Expected branch_snapshot record ID after insertion');
  }

  return result.rows[0].id;
}

/**
 * @param {pg.PoolClient} client
 * @param {number} newBranchSnapshotId
 * @param {number} oldBranchSnapshotId
 * @param {string[]} commitList
 */
async function insertBranchCommitList(
  client,
  newBranchSnapshotId,
  oldBranchSnapshotId,
  commitList
) {
  const { valuesString, parameters } = formatInsertManyValues(
    commitList,
    (parameters, commit, ctr) => {
      parameters.push(commit, newBranchSnapshotId, commitList.length - ctr);
    },
    [oldBranchSnapshotId]
  );

  await client.query(
    `WITH new_commits (commit_hash, new_branch_snapshot_id, commit_index) AS (
      VALUES
        ${valuesString}
    ),
    new_commits_with_id (commit_id, new_branch_snapshot_id, commit_index) AS (
      SELECT id AS commit_id, CAST(new_branch_snapshot_id AS integer), CAST(commit_index AS integer)
      FROM new_commits nc
      JOIN git_commit gc
        ON nc.commit_hash = gc.hash
    ),
    updated AS (
        UPDATE branch_commit_list AS cl
        SET branch_snapshot_id = nc.new_branch_snapshot_id
        FROM new_commits_with_id nc
        WHERE cl.commit_id = nc.commit_id
          AND cl.commit_index = nc.commit_index 
          AND cl.branch_snapshot_id = $1
        RETURNING cl.commit_id, cl.branch_snapshot_id, cl.commit_index
    )
    INSERT INTO branch_commit_list (commit_id, branch_snapshot_id, commit_index)
    SELECT nc.commit_id, nc.new_branch_snapshot_id, nc.commit_index
    FROM new_commits_with_id nc
    LEFT JOIN updated u
      ON nc.commit_id = u.commit_id AND nc.commit_index = u.commit_index
    WHERE u.commit_id IS NULL`,
    parameters
  );
}

export async function getCommitsPerContributor(
  repository,
  startTime,
  endTime,
  branchName,
  contributorDbIds
) {
  const { valuesString, parameters } = formatInsertManyValues(
    contributorDbIds,
    (parameters, conId) => {
      parameters.push(conId);
    },
    [repository.dbId, startTime?.toISOString(), endTime?.toISOString(), branchName]
  );

  const result = await pool.query(
    `
    -- List of pre-filter branch snapshots (only for current repo, optionally for branch name)
    WITH branch_snapshot_filtered AS (
      SELECT bs.id, bs.name, rs.creation_start_time, bs.commit_count
      FROM repo_snapshot rs
      JOIN branch_snapshot bs
        ON bs.repo_snapshot_id = rs.id
      WHERE rs.repository_id = $1
        AND (bs.name = $4 OR $4 IS NULL)
    ), 

    -- List of pre-filter branch snapshots within specific creation-date range
    branch_snapshot_span AS (
      SELECT * 
      FROM branch_snapshot_filtered
      WHERE (creation_start_time >= $2 OR $2 IS NULL)
        AND (creation_start_time <= $3 OR $3 IS NULL)
    ),

    -- Add creation-date of branch_snapshot to each entry of the commit list
    branch_commit_list_dated AS (
      SELECT bs.id, bs.name, bs.creation_start_time, bcl.commit_id, bcl.commit_index 
      FROM branch_commit_list bcl
      JOIN branch_snapshot_filtered bs
        ON bcl.branch_snapshot_id = bs.id
    ),

    -- Reconstruct each branch snapshot
    branch_snapshot_reconstructed AS (
      SELECT DISTINCT ON (bs.id, bcl.commit_index) 
        bs.id, bcl.commit_index, bs.name, bs.creation_start_time, bcl.commit_id
      FROM branch_commit_list_dated bcl
      CROSS JOIN branch_snapshot_span bs
      WHERE bs.creation_start_time <= bcl.creation_start_time
        AND bs.commit_count >= bcl.commit_index
        AND bs.name = bcl.name
      ORDER BY bs.id, bcl.commit_index, bcl.creation_start_time ASC
    ),
    contributor_list (id) AS (
      VALUES ${valuesString}
    )
    SELECT 
    bs.name as branch_name, bs.creation_start_time, 
    con.uuid as contributor_uuid, con.email as contributor_email, 
    COUNT(gc.id) AS commits_per_contributor
    FROM branch_snapshot_reconstructed bs
    JOIN git_commit gc
      ON bs.commit_id = gc.id
    JOIN contributor_list cl
      ON gc.contributor_id = CAST(cl.id AS integer)
    JOIN contributor con
      ON gc.contributor_id = con.id
    GROUP BY bs.name, bs.creation_start_time, con.uuid, con.email
    `,
    parameters
  );

  return result.rows;
}

export async function getCommitsPerContributorPerDay(
  repository,
  startTime,
  endTime,
  contributorDbIds,
  includeMergeCommits
) {
  const { valuesString, parameters } = formatInsertManyValues(
    contributorDbIds,
    (parameters, conId) => {
      parameters.push(conId);
    },
    [repository.dbId, startTime?.toISOString(), endTime?.toISOString(), includeMergeCommits ? 1 : 0]
  );

  const result = await pool.query(
    `
    -- List of pre-filter most recent branch snapshots (only for current repo, optionally for branch name)
    WITH branch_snapshot_filtered AS (
      SELECT DISTINCT ON (bs.name) bs.id, bs.name, rs.creation_start_time, bs.commit_count
      FROM repo_snapshot rs
      JOIN branch_snapshot bs
        ON bs.repo_snapshot_id = rs.id
      WHERE rs.repository_id = $1
      ORDER BY bs.name, rs.creation_start_time DESC
    ),
    contributor_list (id) AS (
      VALUES ${valuesString}
    )
    SELECT 
      DATE(gc.time) AS commit_date, 
      bs.name AS branch_name, 
      con.uuid as contributor_uuid, 
      con.email as contributor_email,
      COUNT(gc.id) AS commit_count
    FROM branch_snapshot_filtered bs
    JOIN branch_commit_list bcl
      ON bcl.branch_snapshot_id = bs.id
    JOIN git_commit gc
      ON bcl.commit_id = gc.id
    JOIN contributor_list cl
      ON gc.contributor_id = CAST(cl.id AS integer)
    JOIN contributor con
      ON gc.contributor_id = con.id
    WHERE (gc.time >= $2 OR $2 IS NULL)
      AND (gc.time <= $3 OR $3 IS NULL)
      AND (gc.is_merge_commit = FALSE OR $4 = 1 )
    GROUP BY 
      bs.name, con.uuid, con.email, commit_date
    ORDER BY 
      bs.name, con.uuid, con.email, commit_date;
    `,
    parameters
  );

  // TODO: Only pick most recent snapshot, Use distinct on commit ID
  const result2 = await pool.query(
    `
     -- List of most recent branch snapshots (only for current repo)
    WITH branch_snapshot_filtered AS (
      SELECT DISTINCT ON (bs.name) bs.id, bs.name, rs.creation_start_time, bs.commit_count
      FROM repo_snapshot rs
      JOIN branch_snapshot bs
        ON bs.repo_snapshot_id = rs.id
      WHERE rs.repository_id = $1
      ORDER BY bs.name, rs.creation_start_time DESC
    ),
    contributor_list (id) AS (
      VALUES ${valuesString}
    )
    SELECT 
      DATE(gc.time) AS commit_date, 
      'All Branches' AS branch_name, 
      con.uuid as contributor_uuid, 
      con.email as contributor_email,
      COUNT(DISTINCT gc.id) AS commit_count
    FROM branch_snapshot_filtered bs
    JOIN branch_commit_list bcl
      ON bcl.branch_snapshot_id = bs.id
    JOIN git_commit gc
      ON bcl.commit_id = gc.id
    JOIN contributor_list cl
      ON gc.contributor_id = CAST(cl.id AS integer)
    JOIN contributor con
      ON gc.contributor_id = con.id
    WHERE (gc.time >= $2 OR $2 IS NULL)
      AND (gc.time <= $3 OR $3 IS NULL)
      AND (gc.is_merge_commit = FALSE OR $4 = 1 )
    GROUP BY 
      con.uuid, con.email, commit_date
    ORDER BY 
      con.uuid, con.email, commit_date;
    `,
    parameters
  );

  return result.rows.concat(result2.rows);
}
