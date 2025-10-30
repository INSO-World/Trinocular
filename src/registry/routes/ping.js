import { Registry } from '../lib/registry.js';

export function putPing(req, res) {
  const { serviceName, hostname } = req.params;
  const service = Registry.the().service(serviceName);
  if (!service) {
    res.status(404).end(`Unknown service '${serviceName}'\n`);
    return;
  }
  
  if( !service.pingInstance(hostname) ) {
    res.status(404).end(`Unknown service instance '${serviceName}/${hostname}'\n`);
    return;
  }

  res.sendStatus(200);
}
