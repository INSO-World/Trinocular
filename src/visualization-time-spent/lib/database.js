import {formatInsertManyValues, pool} from '../../postgres-utils/index.js';

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
export async function getIssuesWithMemberInfoFromDatabase(uuid) {
  const query = `
    SELECT
      i.iid,
      i.title,
      i.created_at,
      i.closed_at,
      i.total_time_spent,
      json_agg(json_build_object('id', m.id,
                                 'name', m.name,
                                 'username', m.username,
                                 'email', m.email,
                                 'time_spent', user_agg.agg_user_time_spent)) AS user_data
    FROM issue i
    JOIN (
      SELECT t.uuid, t.issue_iid, t.user_id, SUM(t.time_spent) AS agg_user_time_spent
      FROM timelog t
      WHERE t.uuid = $1
      GROUP BY t.uuid, t.issue_iid, t.user_id
    ) user_agg ON i.uuid = user_agg.uuid AND i.iid = user_agg.issue_iid
    JOIN member m ON user_agg.uuid = m.uuid AND user_agg.user_id = m.id
    WHERE i.uuid = $1
    GROUP BY i.iid, i.title, i.created_at, i.closed_at, i.total_time_spent;
  `;

  const result = await pool.query(query, [uuid]);
  return result.rows;
}

export async function getHourlyAvgTimelogFromDatabase(uuid) {
  const result = await pool.query(
    `SELECT
       EXTRACT(HOUR FROM t.spent_at) AS hour_of_day,
       m.username,
       m.name,
       -- Compute the average time per day
       -- First sum the time_spent for that hour_of_day for all entries,
       -- then divide by the count of distinct days in the range to get a daily average.
       (SUM(t.time_spent)::numeric / (COUNT(DISTINCT DATE_TRUNC('day', t.spent_at)))) AS avg_time_spent
     FROM timelog t
            JOIN member m ON t.uuid = m.uuid AND t.user_id = m.id
     WHERE t.uuid = $1
     GROUP BY hour_of_day, m.username, m.name
     ORDER BY hour_of_day;`,
    [uuid]
  );
  return result.rows;
}

export async function getDailyAvgTimelogFromDatabase(uuid) {
  const result = await pool.query(
    `SELECT
       EXTRACT(DOW FROM t.spent_at) AS day_of_week,
       m.username,
       m.name,
       -- Compute the average time per day of week.
       -- First sum the time_spent for that day_of_week,
       -- then divide by the count of distinct weeks in the data to get a weekly average for that weekday.
       (SUM(t.time_spent)::numeric / COUNT(DISTINCT DATE_TRUNC('week', t.spent_at))) AS avg_time_spent
     FROM timelog t
     JOIN member m ON t.uuid = m.uuid AND t.user_id = m.id
     WHERE t.uuid = $1
     GROUP BY day_of_week, m.username, m.name
     ORDER BY day_of_week;`,
    [uuid]
  );
  return result.rows;
}

export async function getWeeklyAvgTimelogFromDatabase(uuid) {
  const result = await pool.query(
    `SELECT
       EXTRACT(WEEK FROM DATE_TRUNC('week', t.spent_at)) AS calendar_week,
       m.username,
       m.name,
       -- Compute the weekly average time spent per week by dividing the sum by the count of distinct weeks.
       (SUM(t.time_spent)::numeric / COUNT(DISTINCT DATE_TRUNC('week', t.spent_at))) AS avg_time_spent
     FROM timelog t
     JOIN member m ON t.uuid = m.uuid AND t.user_id = m.id
     WHERE t.uuid = $1
     GROUP BY calendar_week, m.username, m.name
     ORDER BY calendar_week`,
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
    ${valuesString}
   ON CONFLICT ON CONSTRAINT unique_uuid_user_id_spent_at
    DO UPDATE SET
    time_spent = EXCLUDED.time_spent,
    issue_iid = EXCLUDED.issue_iid,
    merge_request_iid = EXCLUDED.merge_request_iid
    RETURNING id`,
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
