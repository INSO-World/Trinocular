import { formatInsertManyValues, pool } from '../../postgres-utils/index.js';

export async function getCommitData(uuid) {
  const result = await pool.query(
    `SELECT 
      branch_name, 
      contributor_email, 
      DATE_TRUNC('week', commit_date) AS commit_week, 
      SUM(commit_count) AS weekly_count
    FROM commit_stats
    WHERE uuid = $1
    GROUP BY branch_name, contributor_email, commit_week
    ORDER BY commit_week`,
    [uuid]
  );
  return result.rows;
}

export async function insertCommitCount(uuid, commitCount) {
  const { valuesString, parameters } = formatInsertManyValues(commitCount, (parameters, data) => {
    parameters.push(
      uuid,
      data.branch_name,
      data.contributor_email,
      data.commit_date,
      data.commit_count
    );
  });

  return await pool.query(
    `INSERT INTO commit_stats (uuid, branch_name, contributor_email, commit_date, commit_count)
    VALUES
       ${valuesString} ON CONFLICT
    ON CONSTRAINT unique_uuid_branch_contributor_date
    DO UPDATE SET
      id = EXCLUDED.id,
      commit_count = EXCLUDED.commit_count
    RETURNING id`,
    parameters
  );
}

export async function removeRepositoryDataByUuid(uuid) {
  await pool.query(
    `DELETE FROM commit_stats
     WHERE uuid = $1`,
    [uuid]
  );
}
