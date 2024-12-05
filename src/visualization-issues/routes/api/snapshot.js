import {getAllRepositories, getDatasourceForRepositoryFromApiBridge} from '../../lib/requests.js';
import {getDynamicDateRange, mapDataToRange} from '../../lib/burndown-chart-utils.js';
import {formatInsertManyValues, pool} from '../../../postgres-utils/index.js';
import {sendSchedulerCallback} from '../../../common/index.js';

export async function postSnapshot(req, res) {
  const {transactionId} = req.query;

  res.sendStatus(200);


  // 1. Fetch all repos from api-bridge
  const tmp = await getAllRepositories();
  console.log('repos', tmp);
  const repos = tmp.data;

  // 2. Per Repo fetch issues from api-bridge

  const issuePromises = repos.map(async repo => {
    const {uuid} = repo;
    const {error, data: issueData} = await getDatasourceForRepositoryFromApiBridge('issues', uuid);

    if (error) {
      console.error(error);
      return null;
    }
    // 3. Process issues to get burndown data
    const dataRange = getDynamicDateRange(issueData);
    console.log('dataRange', dataRange);
    const filledData = mapDataToRange(issueData, dataRange);
    console.log('filledData', filledData);

    return {burndownIssues: filledData, uuid: repo.uuid};
  });
  const reposIssues = await Promise.all(issuePromises);
  console.log('reposIssues', reposIssues);
  console.log('reposIssues[0]', reposIssues[0].burndownIssues);

  // 4. Store burndown data in database
  const dbPromises = reposIssues.map(async repoIssues => {
    const {valuesString, parameters} =
      formatInsertManyValues(repoIssues.burndownIssues, (parameters, issue) => {
        parameters.push(
          repoIssues.uuid,
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
