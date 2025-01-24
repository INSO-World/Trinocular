import { sendSchedulerCallback } from '../../common/scheduler.js';
import { ApiBridge } from '../lib/api-bridge.js';
import {logger} from "../../common/index.js";

export async function postSnapshot(req, res) {
  const { uuid } = req.params;
  const { transactionId } = req.query;

  if (!ApiBridge.the().repos.has(uuid)) {
    return res.status(404).end(`Unknown repository UUID '${uuid}'`);
  }

  // Immediately send response and perform callback when we are done
  res.sendStatus(200);

  let success = false;
  try {
    await ApiBridge.the().createSnapshot(uuid);
    success = true;
  } catch (e) {
    logger.error(`Could not perform snapshot for repository '${uuid}': %s`, e);
    success = false;
  } finally {
    // TODO: In case of error also send a error message back to the scheduler
    await sendSchedulerCallback(transactionId, success ? 'ok' : 'error');
  }
}
