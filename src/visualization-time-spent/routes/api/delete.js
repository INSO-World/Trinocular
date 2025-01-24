import { logger } from "../../../common/index.js";
import Joi from 'joi';
import {removeRepositoryByUuid} from "../../lib/database.js";

const uuidValidator = Joi.string().uuid().required();

export async function deleteRepository(req, res) {
  const { value: uuid, error } = uuidValidator.validate(req.params.uuid);
  if (error) {
    logger.error('Delete Repository: Validation error', error);
    return res.status(422).send(error.details || 'Validation error');
  }

  await removeRepositoryByUuid(uuid);

  logger.info(`Successfully deleted repository with uuid: ${uuid}`);
  res.sendStatus(204);
}
