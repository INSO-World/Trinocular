import { clientWithTransaction, formatInsertManyValues } from '../../postgres-utils/index.js';
import {Repository} from "./repository.js";

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
 * Fetches the repository with given UUID from the database
 * @param uuid
 * @returns {Promise<Repository>}
 */
export async function getRepositoryByUuid ( uuid ){
  return clientWithTransaction( async client => {
    const repoResult = await client.query(
        'SELECT * FROM repository WHERE uuid = $1', [uuid]);

    if (!repoResult.rows || repoResult.rows.length < 1) {
      throw new Error(`Repository with UUID ${uuid} not found`);
    }
    const row = repoResult.rows[0];

    return new Repository(row.name, row.id, row.uuid,
        row.git_url, row.type, null, null);

    //TODO add loading members and so on
  });


}
