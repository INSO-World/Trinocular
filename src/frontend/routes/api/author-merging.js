import Joi from 'joi';
import { ensureUser, getRepoAuthorMergingConfig, setRepoAuthorMergingConfig } from '../../lib/database.js';

const authorMergingConfigValidator= Joi.array().items(
  Joi.object({
    memberName: Joi.string().trim().required(),
    contributors: Joi.array().items(
      Joi.object({
        authorName: Joi.string().trim().required(),
        email: Joi.string().trim().email({ tlds: false }).required()
      }).unknown(false)
    ).required()
  }).unknown(false)
).required();

export function getAuthorMergingConfig(req, res) {
  const repoUuid = req.params.repoUuid;
  const userUuid = req.user.sub

  res.json( getRepoAuthorMergingConfig(userUuid, repoUuid) );
}

export function postAuthorMergingConfig(req, res) {
  const repoUuid = req.params.repoUuid;
  const userUuid = req.user.sub;

  const {value, error}= authorMergingConfigValidator.validate(req.body);
  if( error ) {
    console.warn('Post author merging config: Validation error', error);
    return res.status(422).send(error.details || 'Validation error');
  }

  ensureUser( userUuid );
  setRepoAuthorMergingConfig(userUuid, repoUuid, value);

  res.sendStatus(200);
}
