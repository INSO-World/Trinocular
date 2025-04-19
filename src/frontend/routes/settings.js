import Joi from 'joi';
import { logger } from '../../common/index.js';
import { createToken } from '../lib/csrf.js';
import {
  ensureUser,
  setUserRepoSettings,
  getUserRepoSettings,
  deleteRepositoryByUuid,
  setRepoSettings,
  getRepositoryByUuid
} from '../lib/database.js';
import { ErrorMessages } from '../lib/error-messages.js';
import { repositoryImportingState } from '../lib/currently-importing.js';
import {
  deleteRepositoryOnAllVisualizationServices,
  deleteRepositoryOnSchedulerService,
  deleteRepositoryOnService,
  getRepositoryFromAPIService,
  getScheduleFromSchedulerService,
  sendRepositoryUpdateToService,
  sendScheduleUpdate
} from '../lib/requests.js';
import { RepositorySettings } from '../lib/repo-settings.js';

const settingsValidator = Joi.object({
  isFavorite: Joi.string().valid('on').default('').label('Favorite Flag'), // Checkboxes only set an 'on' value when they are checked
  isActive: Joi.string().valid('on').default('').label('Active Flag'),
  enableSchedule: Joi.string().valid('on').default('').label('Enable Schedule Flag'),
  repoColor: Joi.string()
    .pattern(/^#[A-Fa-f0-9]{6}$/)
    .required()
    .label('Repository Color'),
  repoName: Joi.string().trim().max(500).required().label('Name'),
  repoUrl: Joi.string().uri().max(255).required().label('URL'),
  repoAuthToken: Joi.string().trim().max(100).required().label('Authentication Token'),
  repoType: Joi.string().valid('gitlab', 'github').required().label('Repository Type'),
  scheduleCadenceValue: Joi.number()
    .integer()
    .positive()
    .required()
    .label('Schedule cadence value'),
  scheduleCadenceUnit: Joi.string()
    .valid('hours', 'days', 'weeks')
    .required()
    .label('Schedule cadence unit'),
  scheduleStartTime: Joi.string().isoDate().required().label('Schedule Start Time')
})
  .unknown(true)
  .required(); // Allow unknown fields for other stuff like csrf tokens

function renderSettingsPage(req, res, repo, errorMessage = null, status = 200) {
  repo.updateFlags();
  res.status(errorMessage && status === 200 ? 400 : status).render('settings', {
    user: req.user,
    repo,
    errorMessage,
    csrfToken: createToken(req.sessionID),
    scriptSource: '/static/settings.js'
  });
}

function renderErrorPage(req, res, errorMessage, backLink, status) {
  res.status(status).render('error', {
    user: req.user,
    isAuthenticated: req.isAuthenticated(),
    errorMessage: errorMessage,
    backLink
  });
}

export async function getSettingsPage(req, res) {
  const repoUuid = req.params.repoUuid;
  const userUuid = req.user.sub;

  // Redirect to the waiting page in case we are currently importing the
  // repository for the first time
  const importingState = await repositoryImportingState(repoUuid);
  if (importingState.isActive()) {
    return res.redirect(`/wait/${repoUuid}`);
  }

  // Show the error page if we could not import the repository
  if(importingState.isInitialImportError()) {
    return res.status(500).render('error', {
      user: req.user,
      isAuthenticated: req.isAuthenticated(),
      errorMessage: ErrorMessages.ImportFailed(importingState.errorMessage),
      backLink: '/repos'
    });
  }

  const userSettings = getUserRepoSettings(userUuid, repoUuid) || {};
  const repoSettings = getRepositoryByUuid(repoUuid);

  // If repo doesn't exist, show not-found page
  if (!repoSettings) {
    return renderErrorPage(req, res, ErrorMessages.NotFound('repository'), '/repos', 404);
  }

  // Get the repo settings from the api bridge & repo services
  const apiBridgeSettings = await getRepositoryFromAPIService(repoUuid);
  const schedulerSettings = await getScheduleFromSchedulerService(repoUuid);

  const serviceError = apiBridgeSettings.error || schedulerSettings.error;
  if (serviceError) {
    logger.error('Could not lookup settings: %s', serviceError);
    return renderErrorPage(req, res, `Could not lookup settings: ${serviceError}`, '/repos', 500);
  }

  // Combine the settings objects into a single repository settings object
  const repo = RepositorySettings.fromServiceSettings(
    repoUuid,
    repoSettings,
    userSettings,
    apiBridgeSettings,
    schedulerSettings
  );

  renderSettingsPage(req, res, repo);
}

/**
 * POST method since html forms only support GET and POST
 */
export async function postSettings(req, res) {
  const repoUuid = req.params.repoUuid;
  const userUuid = req.user.sub;

  if (req.csrfError) {
    // As we have a csrf error we need to use the unsafeBody object instead
    const settings = RepositorySettings.fromFormBody(repoUuid, req.unsafeBody);
    return renderSettingsPage(req, res, settings, ErrorMessages.CSRF());
  }

  // Validate form data
  const { error, value } = settingsValidator.validate(req.body);
  if (error) {
    const settings = RepositorySettings.fromFormBody(repoUuid, req.body);
    return renderSettingsPage(req, res, settings, ErrorMessages.Invalid('settings', error.message));
  }

  const newRepoSettings = RepositorySettings.fromFormBody(repoUuid, value);

  // Force certain settings based on other ones
  // Set color to grey when deactivated
  if (!newRepoSettings.isActive) {
    newRepoSettings.color = '#BEBEBE';
  }
  // Update schedules can only be enabled for active repositories
  newRepoSettings.enableSchedule = newRepoSettings.isActive && newRepoSettings.enableSchedule;

  // TODO: Database transaction here so we rollback if we fail here somewhere
  await ensureUser(userUuid);
  // update in frontend database
  setUserRepoSettings(userUuid, newRepoSettings);
  setRepoSettings(newRepoSettings);

  // Send Settings to the API bridge
  const apiBridgeErrorMsg = await sendRepositoryUpdateToService(
    process.env.API_BRIDGE_NAME,
    repoUuid,
    newRepoSettings.toApiBridgeSettings()
  );
  if (apiBridgeErrorMsg) {
    return renderSettingsPage(req, res, newRepoSettings, apiBridgeErrorMsg, 400);
  }

  // Send settings to the repo service
  const repoServiceErrorMsg = await sendRepositoryUpdateToService(
    process.env.REPO_NAME,
    repoUuid,
    newRepoSettings.toRepoServiceSettings()
  );
  if (repoServiceErrorMsg) {
    return renderSettingsPage(req, res, newRepoSettings, repoServiceErrorMsg, 400);
  }

  // Send schedule settings to scheduler
  // disable automatic updates -> delete schedule on scheduler service
  let schedulerErrorMsg;
  if (!newRepoSettings.enableSchedule) {
    schedulerErrorMsg = await deleteRepositoryOnSchedulerService(repoUuid);
  } else {
    schedulerErrorMsg = await sendScheduleUpdate(
      repoUuid,
      newRepoSettings.scheduleCadenceValueInSeconds(),
      new Date(newRepoSettings.scheduleStartTime)
    );
  }

  if (schedulerErrorMsg) {
    return renderSettingsPage(req, res, newRepoSettings, schedulerErrorMsg, 400);
  }

  res.redirect(`/dashboard/${repoUuid}/settings`);
}

/**
 * Deletes a repository from the system
 * @param {string} repoUuid 
 * @returns {Promise<string?>} Error message
 */
export async function deleteRepositoryEverywhere( repoUuid ) {

  // TODO: what if one fails? We might need to deal with inconsistencies later on

  // Delete from own database
  let frontendErrorMsg= null;
  try {
    logger.info(`Deleting repository '${repoUuid}' on frontend`);
    deleteRepositoryByUuid(repoUuid);
  } catch( e ) {
    logger.error('Could not delete repository in frontend database', e);
    frontendErrorMsg= 'Could not delete repository in frontend database';
  }

  // Delete on API bridge service
  logger.info(`Deleting repository '${repoUuid}' on API bridge`);
  const apiBridgeErrorMsg = await deleteRepositoryOnService(process.env.API_BRIDGE_NAME, repoUuid);
  if (apiBridgeErrorMsg) {
    logger.error('Could not delete repository on API bridge: %s', apiBridgeErrorMsg);
  }

  // Delete on Repo service
  logger.info(`Deleting repository '${repoUuid}' on repo service`);
  const repoServiceErrorMsg = await deleteRepositoryOnService(process.env.REPO_NAME, repoUuid);
  if (repoServiceErrorMsg) {
    logger.error('Could not delete repository on repo service: %s', repoServiceErrorMsg);
  }

  // Delete on Scheduler service
  logger.info(`Deleting repository '${repoUuid}' on scheduler service`);
  const schedulerErrorMsg = await deleteRepositoryOnSchedulerService(repoUuid);
  if (schedulerErrorMsg) {
    logger.error('Could not delete repository on scheduler service: %s', schedulerErrorMsg);
  }

  // Delete on all visualization services
  console.log(`Deleting repository '${repoUuid}' on all visualization services`);
  const visErrorMsg = await deleteRepositoryOnAllVisualizationServices(repoUuid);
  if (visErrorMsg) {
    console.error('Could not delete repository on some visualization service:', visErrorMsg);
  }

  // Return the first error message
  return frontendErrorMsg || apiBridgeErrorMsg || repoServiceErrorMsg || schedulerErrorMsg || visErrorMsg || null;
}

export async function deleteRepositoryHandler(req, res) {
  const repoUuid = req.params.repoUuid;
  const settingsPageLink = `/dashboard/${repoUuid}/settings`;

  if (req.csrfError) {
    return renderErrorPage(req, res, ErrorMessages.CSRF(), settingsPageLink, 400);
  }

  const errorMessage= await deleteRepositoryEverywhere( repoUuid );
  if( errorMessage ) {
    return renderErrorPage(req, res, errorMessage, settingsPageLink, 500);
  }

  res.sendStatus(204);
}
