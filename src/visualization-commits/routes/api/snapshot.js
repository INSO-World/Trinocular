import { sendSchedulerCallback } from '../../../common/index.js';
import {
  getCommitCountForRepositoryFromRepoService,
  getRepositoryForUuid
} from '../../lib/requests.js';
import { insertCommitCount } from '../../lib/database.js';

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

  // Fet commit count data from Repo service
  const { getCommitCountError, data: commitCount } = await getCommitCountForRepositoryFromRepoService(uuid);
  if (getCommitCountError) {
    console.error(getCommitCountError);
    return null;
  }

  await insertCommitCount(uuid, commitCount)

  console.log(`Visualization '${process.env.SERVICE_NAME}' creates snapshot for uuid: ${uuid}`);
  await sendSchedulerCallback(transactionId, 'ok');
}
