import { withSchedulerCallback } from '../../common/index.js';
import { ApiBridge } from '../lib/api-bridge.js';
import { logger } from '../../common/index.js';

export async function postSnapshot(req, res) {
  const { uuid } = req.params;
  const { transactionId } = req.query;

  if (!ApiBridge.the().repos.has(uuid)) {
    return res.status(404).end(`Unknown repository UUID '${uuid}'`);
  }

  // Immediately send response and perform callback when we are done
  res.sendStatus(200);

  await withSchedulerCallback(
    transactionId,
    async () => {
      await ApiBridge.the().createSnapshot(uuid);
    },
    e => Error(`Could not perform snapshot for repository '${uuid}'`, { cause: e })
  );
}

export async function deleteSnapshot(req, res) {
  const { uuid } = req.params;

  const success = await ApiBridge.the().clearSnapshot(uuid);
  if (!success) {
    return res.status(404).end(`Unknown repository UUID '${uuid}'`);
  }

  logger.info(`Successfully deleted repository snapshot with uuid ${uuid}`);
  res.sendStatus(204);
}
