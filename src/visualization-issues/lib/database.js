import { formatInsertManyValues, pg, pool } from '../../postgres-utils/index.js';

export async function getTimelineChartData(uuid) {
  const result = await pool.query(
    `SELECT title, labels, created_at, closed_at, human_total_time_spent, time_estimate
     FROM issue
     WHERE uuid = $1
     ORDER BY created_at`,
    [uuid]
  );
  return result.rows;
}

export async function insertIssues(uuid, issueData) {
  if(!issueData.length) {
    return;
  }

  const { valuesString, parameters } = formatInsertManyValues(issueData, (parameters, issue) => {
    parameters.push(
      uuid,
      issue.id,
      issue.title,
      issue.labels,
      issue.created_at,
      issue.closed_at,
      issue.human_total_time_spent,
      issue.time_estimate
    );
  });

  const query = `
    INSERT INTO issue (uuid, project_id, title, labels, created_at, closed_at,
                       human_total_time_spent, time_estimate)
    VALUES ${valuesString} ON CONFLICT
    ON CONSTRAINT unique_uuid_project_id
      DO
    UPDATE SET
      title = EXCLUDED.title,
      labels = EXCLUDED.labels,
      closed_at = EXCLUDED.closed_at,
      human_total_time_spent = EXCLUDED.human_total_time_spent,
      time_estimate = EXCLUDED.time_estimate
      RETURNING id;
  `;

  await pool.query(query, parameters);
}

/**
 * @param {string} uuid
 */
export async function getBurndownChartData(uuid, timeGranularity) {
  pg.types.setTypeParser(1082, val => val); // 1082 is the OID for date type
  const result = await pool.query(
    `SELECT date, open_issues, open_issues_info
     FROM issue_${timeGranularity}
     WHERE uuid = $1
     ORDER BY date`,
    [uuid]
  );
  return result.rows;
}

export async function insertBurndownChartData(uuid, issueData, timeGranularity) {
  if(!issueData.length) {
    return;
  }

  const { valuesString, parameters } = formatInsertManyValues(issueData, (parameters, issue) => {
    parameters.push(uuid, issue.date, issue.openIssues, issue.open_issues_info);
  });

  await pool.query(
    `INSERT INTO issue_${timeGranularity} (uuid, date, open_issues, open_issues_info)
     VALUES
       ${valuesString} ON CONFLICT
     ON CONSTRAINT unique_uuid_${timeGranularity}
       DO
    UPDATE SET
      id = EXCLUDED.id,
      date = EXCLUDED.date,
      open_issues = EXCLUDED.open_issues,
      open_issues_info = EXCLUDED.open_issues_info
      RETURNING id`,
    parameters
  );
}

export async function removeRepositoryDataByUuid(uuid) {
  const resultIssue = await pool.query(
    `DELETE FROM issue
     WHERE uuid = $1`,
    [uuid]
  );

  const resultIssueDay = await pool.query(
    `DELETE FROM issue_day
     WHERE uuid = $1`,
    [uuid]
  );

  const resultIssueWeek = await pool.query(
    `DELETE FROM issue_week
     WHERE uuid = $1`,
    [uuid]
  );

  const resultIssueMonth = await pool.query(
    `DELETE FROM issue_month
     WHERE uuid = $1`,
    [uuid]
  );
}
