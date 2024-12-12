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
    `SELECT
       timelog.id AS timelog_id,
       timelog.time_spent,
       timelog.spent_at,
       timelog.user_id,
       timelog.issue_iid,
       timelog.merge_request_iid,
       member.id AS member_id,
       member.username,
       member.name,
       member.email
     FROM
       timelog JOIN member
        ON timelog.uuid = member.uuid AND timelog.user_id = member.id
     WHERE timelog.uuid = $1;;
    `,
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
  // console.log('db result', result);
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

export async function insertTimelogsIntoDatabase(uuid, timelogData) {
  const { valuesString, parameters } = formatInsertManyValues(
    timelogData,
    (parameters, timelog) => {
      parameters.push(
        uuid,
        timelog.issue_iid,
        timelog.time_spent,
        timelog.spent_at,
        timelog.user_id,
        timelog.merge_request_iid
      );
    }
  );

  const result = await pool.query(
    `INSERT INTO timelog (uuid, issue_iid, time_spent, spent_at, user_id, merge_request_iid)
    VALUES
    ${valuesString}`,
   // ON CONFLICT ON CONSTRAINT unique_uuid_iid
   //  DO UPDATE SET
   //  iid = EXCLUDED.iid,
   //  title = EXCLUDED.title,
   //  created_at = EXCLUDED.created_at,
   //  closed_at = EXCLUDED.closed_at,
   //  total_time_spent = EXCLUDED.total_time_spent
   //  RETURNING id`,
    parameters
  );
}

export async function insertMembersIntoDatabase(uuid, memberData) {
  const { valuesString, parameters } = formatInsertManyValues(
    memberData,
    (parameters, member) => {
      parameters.push(
        uuid,
        member.id,
        member.username,
        member.name,
        member.email
      );
    }
  );

  const result = await pool.query(
    `INSERT INTO member (uuid, id, username, name, email)
    VALUES
    ${valuesString}
    ON CONFLICT ON CONSTRAINT unique_uuid_id
      DO UPDATE SET
      id = EXCLUDED.id,
      username = EXCLUDED.username,
      name = EXCLUDED.name,
      email = EXCLUDED.email
      RETURNING id`,
    parameters
  );
}
