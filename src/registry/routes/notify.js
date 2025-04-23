import { Registry } from '../lib/registry.js';
import { getSubPath } from '../lib/util.js';

export function postNotify(type, req, res) {
  const { name, subscriber } = req.params;
  const path = getSubPath(req.path, `notify/${subscriber}/broadcast`);

  const service = Registry.the().ensureService(name);
  service.addNotifySubscriber(subscriber, type, path);

  res.sendStatus(200);
}

export function deleteNotify(type, req, res) {
  const { name, subscriber } = req.params;
  const path = getSubPath(req.path, `notify/${subscriber}/broadcast`);

  const service = Registry.the().service(name);
  if (!service) {
    res.status(404).end(`Unknown service '${name}'\n`);
    return;
  }

  const didRemove = service.removeNotifySubscriber(subscriber, type, path);
  if (!didRemove) {
    res.status(404).end(`Unknown notifier '${subscriber}/${type}: ${path}' on service '${name}'\n`);
    return;
  }

  res.sendStatus(200);
}
