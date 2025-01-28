import { sendSchedulerCallback } from '../../../common/index.js';
import {
  getDatasourceForRepositoryFromApiBridge,
  getRepositoryForUuid
} from '../../lib/requests.js';
import { calculatePipelineStatus } from '../../lib/pipeline-utils.js';
import { insertPipelineRunsData } from '../../lib/database.js';

export async function postSnapshot(req, res) {
  const { transactionId } = req.query;
  const uuid = req.params.uuid;

  res.sendStatus(200);

  const { getRepoError, data } = await getRepositoryForUuid(uuid);
  const repo = data[0];
  if (getRepoError) {
    console.error(getRepoError);
    return null;
  }

  const { getDataSourceError, data: pipelineData } = await getDatasourceForRepositoryFromApiBridge(
    'pipelines',
    uuid
  );
  if (getDataSourceError) {
    console.error(getDataSourceError);
    return null;
  }

  const startDate = new Date(repo.created_at);
  const endDate = repo.updated_at ? new Date(repo.updated_at) : new Date();

  const pipelinesPerBranch = calculatePipelineStatus(pipelineData, startDate, endDate);
  const preparedData = []
  for (const [branch, dates] of Object.entries(pipelinesPerBranch)) {
    for (const [date, { success, failed }] of Object.entries(dates)) {
      preparedData.push({ branch, date, success, failed });
    }
  }

  await insertPipelineRunsData(uuid, preparedData)

  console.log(`Visualization '${process.env.SERVICE_NAME}' creates snapshot for uuid: ${uuid}`);

  await sendSchedulerCallback(transactionId, 'ok');
}
