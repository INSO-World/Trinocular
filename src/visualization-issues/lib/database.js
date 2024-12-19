import { formatInsertManyValues, pg, pool } from '../../postgres-utils/index.js';

/**
 * @param {string} uuid
 */
export async function getBurndownChartData(uuid, timeGranularity) {
  pg.types.setTypeParser(1082, val => val); // 1082 is the OID for date type
  let tableName = 'issue_day';
  if (timeGranularity === 'week') tableName = 'issue_week';
  if (timeGranularity === 'month') tableName = 'issue_month';
  const result = await pool.query(
    `SELECT date, open_issues, open_issues_info
     FROM ${tableName}
     WHERE uuid = $1
     ORDER BY date`,
    [uuid]
  );
  return result.rows;
}

export async function storeMilestones(uuid, milestones) {
  console.log(milestones);
  const { valuesString, parameters } = formatInsertManyValues(
    milestones,
    (parameters, milestone) => {
      parameters.push(uuid, milestone.iid, milestone.title, milestone.description,
        milestone.due_date, milestone.start_date, milestone.state,
        milestone.updated_at, milestone.created_at, milestone.expired);
    }
  );

  const result = await pool.query(
    `INSERT INTO milestone (uuid, iid, title, description, due_date, start_date,
                        state, updated_at, created_at, expired)
     VALUES
       ${valuesString} ON CONFLICT
     ON CONSTRAINT unique_uuid_iid
       DO
    UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      due_date = EXCLUDED.due_date,
      start_date = EXCLUDED.start_date,
      state = EXCLUDED.state,
      updated_at = EXCLUDED.updated_at,
      expired = EXCLUDED.expired
      RETURNING id`,
    parameters
  );
}
