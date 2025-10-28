import Joi from 'joi';
import { Registry } from '../lib/registry.js';
import { logger } from '../../common/logger.js';

const serviceInstanceValidator = Joi.object({
  healthCheck: Joi.string().required(),
  data: Joi.object().default({})
})
  .unknown(false)
  .required();

const serviceNamesValidator = Joi.object({
  serviceName: Joi.string().hostname().required(),
  hostname: Joi.string().hostname().required()
})
  .unknown(false)
  .required();

export function putService(req, res) {
  const { value: instance, error: instanceError } = serviceInstanceValidator.validate(req.body);
  if (instanceError) {
    logger.warning('Post Service: Validation error', instanceError);
    res.status(422).send(instanceError.details || 'Validation error');
    return;
  }

  const { value: names, error: namesError } = serviceNamesValidator.validate(req.params);
  if (namesError) {
    logger.warning('Post Service: Validation error', namesError);
    res.status(422).send(namesError.details || 'Validation error');
    return;
  }

  const { serviceName, hostname } = names;
  const { healthCheck, data } = instance;
  const service = Registry.the().ensureService(serviceName);
  const didCreate = service.setInstance(hostname, healthCheck, data);

  res.sendStatus( didCreate ? 201 : 200);
}

export function deleteService(req, res) {
  const { serviceName, hostname } = req.params;
  const service = Registry.the().service(serviceName);
  if (!service) {
    res.status(404).end(`Unknown service '${serviceName}'\n`);
    return;
  }

  const didRemove = service.removeInstance(hostname);
  if (!didRemove) {
    res.status(404).end(`Unknown service instance '${serviceName}/${id}'\n`);
    return;
  }

  res.sendStatus(200);
}

export function getService(req, res) {
  const { serviceName } = req.params;
  const service = Registry.the().service(serviceName);
  if (!service) {
    res.status(404).end(`Unknown service '${serviceName}'\n`);
    return;
  }

  res.json(service.serviceData());
}
