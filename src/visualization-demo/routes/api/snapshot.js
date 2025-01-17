import { sendSchedulerCallback } from '../../../common/index.js';
import {
  getDatasourceForRepositoryFromApiBridge,
  getRepositoryForUuid
} from '../../lib/requests.js';
import { demoHelper } from '../../lib/demo-utils.js';
import { insertDemoData } from '../../lib/database.js';

// TODO: Create a function to handle the POST request to create a snapshot
export async function postSnapshot(req, res) {
  const { transactionId } = req.query;
  const uuid = req.params.uuid;

  res.sendStatus(200); // Respond to the scheduler immediately to avoid keeping the connection open

  // Retrieve the repository information to create data from repo creation to end/today
  const { getRepoError, data } = await getRepositoryForUuid(uuid);
  const repo = data[0];
  if (getRepoError) {
    console.error(getRepoError);
    return null;
  }
  const startDate = new Date(repo.created_at);
  const endDate = repo.updated_at ? new Date(repo.updated_at) : new Date();

  // TODO: Retrieve data from correct datasource of API-Bridge
  const { getDataSourceError, data: demoData } = await getDatasourceForRepositoryFromApiBridge(
    'demo',
    uuid
  );

  // Any helper functions should be defined in the lib folder
  demoHelper(demoData, startDate, endDate);

  await insertDemoData(uuid, [])

  console.log(`Visualization '${process.env.SERVICE_NAME}' creates snapshot for uuid: ${uuid}`);
  await sendSchedulerCallback(transactionId, 'ok');
}
