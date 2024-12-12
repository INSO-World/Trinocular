import {formatInsertManyValues, pool} from '../../postgres-utils/index.js';

// TODO do some error checking of the result if deemed necessary

/**
 * @param {string} uuid
 */
export async function getIssuesFromDatabase(uuid) {
  const result = await pool.query(
    `SELECT iid, title, created_at, closed_at, total_time_spent
     FROM issue
     WHERE uuid = $1`,
    [uuid]
  );
  return result.rows;
}

/**
 * @param {string} uuid
 */
export async function getTimelogsFromDatabase(uuid) {
  const result = await pool.query(
    `SELECT spent_at, user_id, issue_iid, merge_request_iid
     FROM timelog
     WHERE uuid = $1`,
    [uuid]
  );
  return result.rows;
}

export async function getRepoDetailsFromDatabase(uuid) {
  const result = await pool.query(
    `SELECT created_at, updated_at
     FROM repo_details
     WHERE uuid = $1`,
    [uuid]
  );
  console.log('db result', result);
  return result.rows[0];
}

export async function insertRepoDetailsIntoDatabase(uuid, repoDetails) {
  const result = await pool.query(
    `INSERT INTO repo_details (uuid, created_at, updated_at)
      VALUES
      ($1, $2, $3)
     ON CONFLICT (uuid)
      DO UPDATE SET
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at
      RETURNING id`,
    [uuid, repoDetails.data[0].created_at, repoDetails.data[0].updated_at]
  );
}

export async function insertIssuesIntoDatabase(uuid, issueData) {
  const { valuesString, parameters } = formatInsertManyValues(
    issueData,
    (parameters, issue) => {
      //console.log(`ID : ${issue.id}, ${issue.title}`);
      const iid = issue.id;
      parameters.push(
        uuid,
        iid,
        issue.title,
        issue.created_at,
        issue.closed_at,
        issue.total_time_spent
      );
    }
  );

  const result = await pool.query(
    `INSERT INTO issue (uuid, iid, title, created_at, closed_at, total_time_spent)
    VALUES
    ${valuesString}
   ON CONFLICT ON CONSTRAINT unique_uuid_iid
    DO UPDATE SET
    iid = EXCLUDED.iid,
    title = EXCLUDED.title,
    created_at = EXCLUDED.created_at,
    closed_at = EXCLUDED.closed_at,
    total_time_spent = EXCLUDED.total_time_spent
    RETURNING id`,
    parameters
  );
}
