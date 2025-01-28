import { logger, sendSchedulerCallback, withSchedulerCallback } from '../../../common/index.js';
import {
  getCommitCountForRepositoryFromRepoService,
  getRepositoryForUuid
} from '../../lib/requests.js';
import { insertCommitCount } from '../../lib/database.js';

export async function postSnapshot(req, res) {
  const { transactionId } = req.query;
  const uuid = req.params.uuid;

  res.sendStatus(200); // Respond to the scheduler immediately to avoid keeping the connection open
 
  await withSchedulerCallback(transactionId, async () => {
    // Retrieve the repository information to create data from repo creation to end/today
    const { getRepoError, data } = await getRepositoryForUuid(uuid);
    const repo = data[0];
    if (getRepoError) {
      throw Error("Could not get repository from Api Bridge: " + getRepoError);
    }
    const startDate = new Date(repo.created_at);
    const endDate = repo.updated_at ? new Date(repo.updated_at) : new Date();

    // Fet commit count data from Repo service
    const { error: getCommitCountError, data: commitCount } = await getCommitCountForRepositoryFromRepoService(uuid);
    if (getCommitCountError) {
      throw Error("Could not get commit counts from Repo Service: " + getCommitCountError);
    }

    await insertCommitCount(uuid, commitCount);

    logger.info(`Visualization '${process.env.SERVICE_NAME}' creates snapshot for uuid: ${uuid}`);
  },
    e => Error(`Could not create commit visualization snapshot for uuid: ${uuid}`, {cause: e})
  );
}
