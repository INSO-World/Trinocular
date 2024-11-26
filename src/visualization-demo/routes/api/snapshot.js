import { sendSchedulerCallback } from '../../../common/index.js';

export async function postSnapshot(req, res) {
  const { transactionId } = req.query;

  console.log(`Visualization '${process.env.SERVICE_NAME}' creates snapshot...`);

  res.sendStatus(200);

  // Wait a little bit and simulate work...
  await new Promise(res => setTimeout(res, 5000));

  await sendSchedulerCallback(transactionId, 'ok');
}
