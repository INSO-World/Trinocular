import { sendSchedulerCallback } from '../../../common/index.js';

export async function postSnapshot(req, res) {
  const { transactionId } = req.query;
  const uuid = req.params.uuid;

  res.sendStatus(200);

  await sendSchedulerCallback(transactionId, 'ok');
}
