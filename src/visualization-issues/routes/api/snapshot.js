import {
  getAllRepositories,
  getDatasourceForRepositoryFromApiBridge,
  getRepositoryForUuid
} from '../../lib/requests.js';
import {getDynamicDateRange, mapDataToRange} from '../../lib/burndown-chart-utils.js';
import {formatInsertManyValues, pool} from '../../../postgres-utils/index.js';
import {sendSchedulerCallback} from '../../../common/index.js';

export async function postSnapshot(req, res) {
  const {transactionId} = req.query;
  const uuid = req.params.uuid;

  res.sendStatus(200);

  //TODO remove all testing logs

  // 1. Fetch all repos from api-bridge
  const tmp = await getRepositoryForUuid(uuid);
  //console.log('repos', tmp);
  const repos = tmp.data;

  // 2. Per Repo fetch issues from api-bridge

  const issuePromises = repos.map(async repo => {
    const {error, data: issueData} = await getDatasourceForRepositoryFromApiBridge('issues', uuid);

    if (error) {
      console.error(error);
      return null;
    }
    // 3. Process issues to get burndown data
    const startDate = new Date(repo.created_at);
    const dataRange = getDynamicDateRange(issueData, startDate);
    const filledData = mapDataToRange(issueData, dataRange);

    return {burndownIssues: filledData, uuid: repo.uuid};
  });
  const reposIssues = await Promise.all(issuePromises);

  // 4. Store burndown data in database
  const dbPromises = reposIssues.map(async repoIssues => {
    const {valuesString, parameters} =
      formatInsertManyValues(repoIssues.burndownIssues, (parameters, issue) => {
        parameters.push(
          uuid,
          issue.date,
          issue.openIssues,
          issue.open_issues_info
        );
      });

    const result = await pool.query(
      `INSERT INTO issue (uuid, date, open_issues, open_issues_info)
      VALUES
      ${valuesString}
   ON CONFLICT ON CONSTRAINT unique_uuid_date
      DO UPDATE SET
      id = EXCLUDED.id,
      date = EXCLUDED.date,
      open_issues = EXCLUDED.open_issues,
      open_issues_info = EXCLUDED.open_issues_info
      RETURNING id`,
      parameters
    );
  });

  await Promise.all(dbPromises);

  // 5. Send callback
  console.log(`Visualization '${process.env.SERVICE_NAME}' creates snapshot...`);

  await sendSchedulerCallback(transactionId, 'ok');
}
