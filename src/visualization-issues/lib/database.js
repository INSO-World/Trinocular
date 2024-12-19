import { formatInsertManyValues, pg, pool } from '../../postgres-utils/index.js';

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
  const { valuesString, parameters } = formatInsertManyValues(
    issueData,
    (parameters, issue) => {
      parameters.push(uuid, issue.date, issue.openIssues, issue.open_issues_info);
    });

  return await pool.query(
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
