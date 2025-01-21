import { formatInsertManyValues, pool } from '../../postgres-utils/index.js';

export async function getPipelineRunsData(uuid) {
  const result = await pool.query(
    `SELECT date, branch, success_count, failed_count
     FROM pipeline_daily_stats
     WHERE uuid = $1
     ORDER BY date`,
    [uuid]
  );
  return result.rows;
}

export async function insertPipelineRunsData(uuid, pipelineRunsData) {
  const { valuesString, parameters } = formatInsertManyValues(
    pipelineRunsData,
    (parameters, run) => {
      parameters.push(uuid, run.branch, run.date, run.success, run.failed);
    });

  return await pool.query(
    `INSERT INTO pipeline_daily_stats (uuid, branch, date, success_count, failed_count)
     VALUES
       ${valuesString} ON CONFLICT
     ON CONSTRAINT unique_uuid_branch_date
       DO
    UPDATE SET
      id = EXCLUDED.id,
      success_count = EXCLUDED.success_count,
      failed_count = EXCLUDED.failed_count
      RETURNING id`,
    parameters
  );
}

export async function removeRepositoryDataByUuid(uuid) {
  const resultIssue = await pool.query(
    `DELETE FROM pipeline_daily_stats
     WHERE uuid = $1`,
    [uuid]
  );
}

