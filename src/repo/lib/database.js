import { clientWithTransaction, formatInsertManyValues } from '../../postgres-utils/index.js';

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

    repo.members.forEach( (member, idx) => member.dbId= membersResult.rows[idx].id );
  });
}
