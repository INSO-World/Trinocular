import { sendSchedulerCallback } from '../../../common/index.js';
import {
  getAllRepositories,
  getDatasourceForRepositoryFromApiBridge,
  getRepositoryForUuid
} from '../../lib/requests.js';
import { formatInsertManyValues, pool } from '../../../postgres-utils/index.js';

export async function postSnapshot(req, res) {
  const { transactionId } = req.query;
  const uuid = req.params.uuid;

  res.sendStatus(200);

  //TODO remove all testing logging output

  // 1. Fetch all repos from api-bridge
  const tmp = await getRepositoryForUuid(uuid);
  console.log('tmp', tmp);
  const result = await pool.query(
    `INSERT INTO repo_details (uuid, created_at, updated_at)
      VALUES
      ($1, $2, $3)
     ON CONFLICT (uuid)
      DO UPDATE SET
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at
      RETURNING id`,
    [uuid, tmp.data[0].created_at, tmp.data[0].updated_at]
  );
  // console.log('repos', tmp);
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
    // const dataRange = getDynamicDateRange(issueData);
    // console.log('dataRange', dataRange);
    // const filledData = mapDataToRange(issueData, dataRange);
    // console.log('filledData', filledData);

    return { issues: issueData, uuid };
  });
  const reposIssues = await Promise.all(issuePromises);
  //console.log('reposIssues', reposIssues);
  //console.log('reposIssues[0]', reposIssues[0].issues);

  // 4. Store issues in database
  const dbPromises = reposIssues.map(async repoIssues => {
    const { valuesString, parameters } = formatInsertManyValues(
      repoIssues.issues,
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
  });

  await Promise.all(dbPromises);

  // 5. Send callback
  console.log(`Visualization '${process.env.SERVICE_NAME}' creates snapshot...`);

  await sendSchedulerCallback(transactionId, 'ok');
}
