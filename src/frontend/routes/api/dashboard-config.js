import Joi from 'joi';
import { ensureUser, getRepoDashboardConfig, setRepoDashboardConfig } from '../../lib/database.js';

const dashboardConfigValidator= Joi.object({
  mergedAuthors: Joi.array().items(
    Joi.object({
      memberName: Joi.string().trim().required(),
      contributors: Joi.array().items(
        Joi.object({
          authorName: Joi.string().trim().required(),
          email: Joi.string().trim().email({ tlds: false }).required()
        }).unknown(false)
      ).required()
    }).unknown(false)
  ).required(),
  milestones: Joi.array().items(
    Joi.object({
      title: Joi.string().trim().required(),
      due_date: Joi.string().trim().isoDate().required(),
      isCustom: Joi.boolean().strip()
      // Make sure to store it as 'due_date' in the db, so it matches the API bridge
    }).rename('dueDate', 'due_date').unknown(false)
  ).required()
}).unknown(false).required();

export function getDashboardConfig(req, res) {
  const repoUuid = req.params.repoUuid;
  const userUuid = req.user.sub

  res.json( getRepoDashboardConfig(userUuid, repoUuid) );
}

export function postDashboardConfig(req, res) {
  const repoUuid = req.params.repoUuid;
  const userUuid = req.user.sub;

  const {value, error}= dashboardConfigValidator.validate(req.body);
  if( error ) {
    console.warn('Post author merging config: Validation error', error);
    return res.status(422).send(error.details || 'Validation error');
  }

  ensureUser( userUuid );
  setRepoDashboardConfig(userUuid, repoUuid, value);

  res.sendStatus(200);
}
