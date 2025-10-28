import Joi from 'joi';
import { Registry } from '../lib/registry.js';
import { logger } from '../../common/logger.js';

const serviceInstanceValidator = Joi.object({
  hostname: Joi.string().required(),
  healthCheck: Joi.string().required(),
  data: Joi.object().default({})
})
  .unknown(false)
  .required();

export function postService(req, res) {
  const { value, error } = serviceInstanceValidator.validate(req.body);
  if (error) {
    logger.warning('Post Service: Validation error', error);
    res.status(422).send(error.details || 'Validation error');
    return;
  }

  // Try creating a new instance
  const { name } = req.params;
  const { hostname, healthCheck, data } = value;
  const service = Registry.the().ensureService(name);
  const {createdId, existingId} = service.createInstance(hostname, healthCheck, data);
  if (createdId) {
    return res.json({ id: createdId });
  }
  
  // We may not replace an existing instance -> error
  const instanceCanReplace= Object.hasOwn(req.query, 'replace');
  if( !instanceCanReplace ) {
    res.status(409).send(`Duplicate hostname '${hostname}' for service '${name}'`);
    return;
  }
  
  // Replace the instance
  const didUpdate = service.updateInstance(existingId, hostname, healthCheck, data);
  if( !didUpdate ) {
    res.status(500).end(`Could not replace service instance '${name}/${existingId}'\n`);
    return;
  }

  return res.json({ id: existingId });
}

export function deleteService(req, res) {
  const { name, id } = req.params;
  const service = Registry.the().service(name);
  if (!service) {
    res.status(404).end(`Unknown service '${name}'\n`);
    return;
  }

  const didRemove = service.removeInstance(id);
  if (!didRemove) {
    res.status(404).end(`Unknown service instance '${name}/${id}'\n`);
    return;
  }

  res.sendStatus(200);
}

export function putService(req, res) {
  const { name, id } = req.params;
  const service = Registry.the().service(name);
  if (!service) {
    res.status(404).end(`Unknown service '${name}'\n`);
    return;
  }

  const { value, error } = serviceInstanceValidator.validate(req.body);
  if (error) {
    logger.warning('Put Service: Validation error', error);
    res.status(422).send(error.details || 'Validation error');
    return;
  }

  const { hostname, healthCheck, data } = value;
  const didUpdate = service.updateInstance(id, hostname, healthCheck, data);
  if (!didUpdate) {
    res.status(404).end(`Unknown service instance '${name}/${id}'\n`);
    return;
  }

  res.sendStatus(200);
}

export function getService(req, res) {
  const { name } = req.params;
  const service = Registry.the().service(name);
  if (!service) {
    res.status(404).end(`Unknown service '${name}'\n`);
    return;
  }

  res.json(service.serviceData());
}
