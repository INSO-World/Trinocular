import Cursor from 'pg-cursor';
import { clientWithTransaction, pool } from '../../postgres-utils/index.js';
import {Contributor, Member, repositories, Repository} from "./repository.js";

/**
 * @param {Repository} repo 
 */
export async function insertNewRepositoryAndSetIds( repo ) {
  await clientWithTransaction( async client => {
    const repoResult= await client.query(
      'INSERT INTO repository (name, uuid, type, git_url) VALUES($1, $2, $3, $4) RETURNING id',
      [repo.name, repo.uuid, repo.type, repo.gitUrl]
    );
  
    if( !repoResult.rows || repoResult.rows.length < 1 ) {
      throw Error('Expected repository record ID after insertion');
    }
  
    repo.dbId= repoResult.rows[0].id;

    /*
    const {valuesString, parameters}= formatInsertManyValues( repo.members, (parameters, member) => {
      parameters.push( member.name, member.uuid, member.username, member.email, member.gitlabId, repo.dbId );
    });

    const membersResult= await client.query(
      `INSERT INTO members (name, uuid, username, email, gitlab_id, repository_id) VALUES ${valuesString} RETURNING id`,
      parameters
    );

    if( !membersResult.rows || membersResult.rows.length < repo.members ) {
      throw Error('Expected member record IDs after insertion');
    }

    repo.members.forEach( (member, idx) => member.dbId= membersResult.rows[idx].id );*/
  });
}



/**
 * Stores all repositories from the database in the cache map
 */
export async function loadAllRepositoriesIntoCache() {
 

  // Fetch repository & member data
  const member_result= await pool.query(
    `SELECT 
    r.id AS repository_db_id,
    r.uuid AS repository_uuid,
    r.name AS repository_name,
    r.git_url AS repository_git_url,
    r.type AS repository_type,

    m.id AS member_db_id,
    m.uuid AS member_uuid,
    m.gitlab_id AS member_gitlab_id,
    m.name AS member_name,
    m.username AS member_username,
    m.email AS member_email

    FROM repository r
    LEFT JOIN member m ON r.id = m.repository_id`
  );

  // Bail if there is not a single repository
  if( !member_result.rows.length ) {
    return;
  }

  member_result.rows.forEach(row => { 
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
        [],    // Empty members array
        []     // Empty contributors array
      );

      repositories.set(repoUuid, repo);
    }
    
    // Add member if it exists in the row
    if (row.member_db_id) {
      repo.members.push(new Member(
        row.member_name,
        row.member_db_id,
        row.member_uuid,
        row.member_gitlab_id,
        row.member_username,
        row.member_email
      ));
    }
  });

  // Fetch contributor data
  const contributor_result= await pool.query(
    `SELECT    
    r.uuid AS repository_uuid,

    c.id AS contributor_db_id,
    c.uuid AS contributor_uuid,
    c.email AS contributor_email,
    c.member_id AS contributor_member_id

    FROM repository r
    LEFT JOIN contributor c ON r.id = c.repository_id`
  );

  contributor_result.rows.forEach(row => { 
    const repoUuid = row.repository_uuid;
    const repo = repositories.get(repoUuid);

    // Add contributor if it exists in the row
    if (row.contributor_db_id) {

      // Get Member object if Contributor has one
      let member = null;
      if(row.contributor_member_id) {
        member = repo.members.find(member => member.dbId == row.contributor_member_id) || null;
      }

      repo.contributors.push(new Contributor(
        row.contributor_email,
        row.contributor_db_id,
        row.contributor_uuid,
        member
      ));
    }
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
    while(true) {
      const rows = await cursor.read(100);

      if(!rows.length) {
        break;
      }

      for(const row of rows) {
        hashes.add(row.commit_hash);
      }
    }

    cursor.close();
  } catch(error) {
    throw Error('Could not load commit hashes for repository with uuid: ' + repository.uuid, {cause: error});

  } finally {
    client.release();
  }

  return hashes;
}
