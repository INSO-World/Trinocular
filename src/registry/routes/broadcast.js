import { Registry } from '../lib/registry.js';
import { getSubPath } from '../lib/util.js';

export async function broadcast(req, res) {
  const { serviceName } = req.params;
  const path = getSubPath(req.path, `${serviceName}/broadcast`);

  const service = Registry.the().service(serviceName);
  if (!service) {
    res.status(404).end(`Unknown service '${serviceName}'\n`);
    return;
  }

  const success = await service.broadcast(req.method, path, req.query, req.body);
  res.sendStatus(success ? 200 : 502);
}
