import { sendSchedulerCallback } from '../../../common/index.js';
import {
  getAllRepositories,
  getDatasourceForRepositoryFromApiBridge,
  getRepositoryForUuid
} from '../../lib/requests.js';
import { formatInsertManyValues, pool } from '../../../postgres-utils/index.js';
import {insertIssuesIntoDatabase, insertRepoDetailsIntoDatabase} from "../../lib/database.js";

export async function postSnapshot(req, res) {
  // TODO validate parameters
  const { transactionId } = req.query;
  const uuid = req.params.uuid;

  res.sendStatus(200);

  //TODO remove all testing logging output

  // 1. Fetch all repos from api-bridge
  const repoDetails = await getRepositoryForUuid(uuid);
  console.log('repoDetails', repoDetails);
  await insertRepoDetailsIntoDatabase(uuid, repoDetails);

  // 2. Fetch issues from api-bridge
  const { error, data: issueData } = await getDatasourceForRepositoryFromApiBridge(
    'issues',
    uuid
  );

  if (error) {
    console.error(error);
    return null;
  }

  console.table(issueData);

  // 4. Store issues in database
  await insertIssuesIntoDatabase(uuid, issueData)

  // 5. Send callback
  console.log(`Visualization '${process.env.SERVICE_NAME}' creates snapshot...`);

  await sendSchedulerCallback(transactionId, 'ok');
}
