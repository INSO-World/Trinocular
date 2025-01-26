import Joi from 'joi';
import { removeRepositoryDataByUuid } from "../../lib/database.js";

const uuidValidator = Joi.string().uuid().required();

export async function deleteRepositoryData(req, res) {
  const { value: uuid, error } = uuidValidator.validate(req.params.uuid);
  if (error) {
    return res.status(422).send(error.details || 'Validation error');
  }

  await removeRepositoryDataByUuid(uuid);

  res.sendStatus(204);
}
