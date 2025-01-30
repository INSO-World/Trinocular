import { logger } from '../../../common/index.js';
import Joi from 'joi';
import { removeRepositoryDataByUuid } from '../../lib/database.js';

const uuidValidator = Joi.string().uuid().required();

export async function deleteRepositoryData(req, res) {
  const { value: uuid, error } = uuidValidator.validate(req.params.uuid);
  if (error) {
    logger.error('Delete Repository Data: Validation error', error);
    return res.status(422).send(error.details || 'Validation error');
  }

  await removeRepositoryDataByUuid(uuid);

  logger.info(`Successfully deleted repository data with uuid: ${uuid}`);
  res.sendStatus(204);
}
