import {
  getDatasourceForRepositoryFromApiBridge,
  getRepositoryForUuid
} from '../../lib/requests.js';
import { getDynamicDateRange, mapDataToRange } from '../../lib/burndown-chart-utils.js';
import { formatInsertManyValues, pool } from '../../../postgres-utils/index.js';
import { sendSchedulerCallback } from '../../../common/index.js';

export async function postSnapshot(req, res) {
  const { transactionId } = req.query;
  const uuid = req.params.uuid;

  res.sendStatus(200);

  // 1. Fetch all repos from api-bridge
  const tmp = await getRepositoryForUuid(uuid);
  const repos = tmp.data;

  // 2. Per Repo fetch issues from api-bridge
  const issuePromises = repos.map(async repo => {
    const { error, data: issueData } = await getDatasourceForRepositoryFromApiBridge(
      'issues',
      uuid
    );

    if (error) {
      console.error(error);
      return null;
    }
    // 3. Process issues to get burndown data
    const dataRange = getDynamicDateRange(issueData, repo);
    const filledData = mapDataToRange(issueData, dataRange);

    return { burndownIssues: filledData, uuid: repo.uuid };
  });
  const reposIssues = await Promise.all(issuePromises);

  // 4. Store burndown data in database
  const dbPromisesDay = reposIssues.map(async repoIssues => {
    const { valuesString, parameters } = formatInsertManyValues(
      repoIssues.burndownIssues.dailyData,
      (parameters, issue) => {
        parameters.push(uuid, issue.date, issue.openIssues, issue.open_issues_info);
      }
    );

    const result = await pool.query(
      `INSERT INTO issue_day (uuid, date, open_issues, open_issues_info)
      VALUES
      ${valuesString}
   ON CONFLICT ON CONSTRAINT unique_uuid_day
      DO UPDATE SET
      id = EXCLUDED.id,
      date = EXCLUDED.date,
      open_issues = EXCLUDED.open_issues,
      open_issues_info = EXCLUDED.open_issues_info
      RETURNING id`,
      parameters
    );
  });
  await Promise.all(dbPromisesDay);
  // 4. Store burndown data in database
  const dbPromisesWeek = reposIssues.map(async repoIssues => {
    const { valuesString, parameters } = formatInsertManyValues(
      repoIssues.burndownIssues.weeklyData,
      (parameters, issue) => {
        parameters.push(uuid, issue.date, issue.openIssues, issue.open_issues_info);
      }
    );

    const result = await pool.query(
      `INSERT INTO issue_week (uuid, date, open_issues, open_issues_info)
      VALUES
      ${valuesString}
   ON CONFLICT ON CONSTRAINT unique_uuid_week
      DO UPDATE SET
      id = EXCLUDED.id,
      date = EXCLUDED.date,
      open_issues = EXCLUDED.open_issues,
      open_issues_info = EXCLUDED.open_issues_info
      RETURNING id`,
      parameters
    );
  });
  await Promise.all(dbPromisesWeek);
  // 4. Store burndown data in database
  const dbPromisesMonth = reposIssues.map(async repoIssues => {
    const { valuesString, parameters } = formatInsertManyValues(
      repoIssues.burndownIssues.monthlyData,
      (parameters, issue) => {
        parameters.push(uuid, issue.date, issue.openIssues, issue.open_issues_info);
      }
    );

    const result = await pool.query(
      `INSERT INTO issue_month (uuid, date, open_issues, open_issues_info)
      VALUES
      ${valuesString}
   ON CONFLICT ON CONSTRAINT unique_uuid_month
      DO UPDATE SET
      id = EXCLUDED.id,
      date = EXCLUDED.date,
      open_issues = EXCLUDED.open_issues,
      open_issues_info = EXCLUDED.open_issues_info
      RETURNING id`,
      parameters
    );
  });
  await Promise.all(dbPromisesMonth);

  // 5. Send callback
  console.log(`Visualization '${process.env.SERVICE_NAME}' creates snapshot...`);

  await sendSchedulerCallback(transactionId, 'ok');
}
