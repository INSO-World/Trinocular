import Joi from 'joi';
import { logger } from '../../common/index.js';
import { createToken } from '../lib/csrf.js';
import {
  ensureUser,
  setUserRepoSettings,
  getUserRepoSettings,
  setRepoSettings,
  getRepositoryByUuid
} from '../lib/database.js';
import { ErrorMessages } from '../lib/error-messages.js';
import { repositoryImportingState } from '../lib/currently-importing.js';
import {
  deleteRepositoryEverywhere,
  deleteRepositoryOnSchedulerService,
  getRepositoryFromAPIService,
  getScheduleFromSchedulerService,
  sendRepositoryUpdateToService,
  sendScheduleUpdate
} from '../lib/requests.js';
import { RepositorySettings } from '../lib/repo-settings.js';
import { userRequestIsAuthenticated } from '../../auth-utils/index.js';

const settingsValidator = Joi.object({
  userType: Joi.string().valid('admin', 'user').required().label('User Type'),
  isFavorite: Joi.string().valid('on').default('').label('Favorite Flag'), // Checkboxes only set an 'on' value when they are checked
  isActive: Joi.string().valid('on').default('').label('Active Flag'),
  enableSchedule: Joi.string().valid('on').default('').label('Enable Schedule Flag'),
  repoColor: Joi.string()
    .pattern(/^#[A-Fa-f0-9]{6}$/)
    .required()
    .label('Repository Color'),
  repoName: Joi.string().trim().max(500).label('Name'),
  repoUrl: Joi.string().uri().max(255).label('URL'),
  repoAuthToken: Joi.string().trim().max(100).label('Authentication Token'),
  repoType: Joi.string().valid('gitlab', 'github').label('Repository Type'),
  scheduleCadenceValue: Joi.number()
    .integer()
    .positive()
    .label('Schedule cadence value'),
  scheduleCadenceUnit: Joi.string()
    .valid('hours', 'days', 'weeks')
    .label('Schedule cadence unit'),
  scheduleStartTime: Joi.string().isoDate().label('Schedule Start Time')
// When the user type is set to admin we require that all settings are present
}).when(
  Joi.object({userType: Joi.valid('admin')}).unknown(), {
  then: {
    repoName: Joi.required(),
    repoUrl: Joi.required(),
    repoAuthToken: Joi.required(),
    repoType: Joi.required(),
    scheduleCadenceValue: Joi.required(),
    scheduleCadenceUnit: Joi.required(),
    scheduleStartTime: Joi.required()
  }
})
  .unknown(true)
  .required() // Allow unknown fields for other stuff like csrf tokens

function renderSettingsPage(req, res, repo, errorMessage = null, status = 200) {
  repo.updateFlags();
  res.status(errorMessage && status === 200 ? 400 : status).render('settings', {
    user: req.user,
    userType: req.user.isAdminUser ? 'admin' : 'user',
    repo,
    errorMessage,
    csrfToken: createToken(req.sessionID),
    scriptSource: '/static/settings.js'
  });
}

function renderErrorPage(req, res, errorMessage, backLink, status) {
  res.status(status).render('error', {
    user: req.user,
    isAuthenticated: userRequestIsAuthenticated(req),
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
      isAuthenticated: userRequestIsAuthenticated(req),
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

  // Make sure we have the old name as a fallback for the error pages
  const {name: oldRepoName}= getRepositoryByUuid(repoUuid);

  if (req.csrfError) {
    // As we have a csrf error we need to use the unsafeBody object instead
    const settings = RepositorySettings.fromFormBody(repoUuid, req.unsafeBody);
    settings.ensureName( oldRepoName );
    return renderSettingsPage(req, res, settings, ErrorMessages.CSRF(), 400);
  }

  // Validate form data
  const { error, value } = settingsValidator.validate(req.body);
  if (error) {
    const settings = RepositorySettings.fromFormBody(repoUuid, req.body);
    settings.ensureName( oldRepoName );
    return renderSettingsPage(req, res, settings, ErrorMessages.Invalid('settings', error.message), 422);
  }

  const newRepoSettings = RepositorySettings.fromFormBody(repoUuid, value);

  // Store the new values on the various services
  if( req.body.userType === 'user' ) {
    await saveOnlyUserSettings( req, res, repoUuid, userUuid, newRepoSettings );
  } else {
    await saveAllSettingsOnServices( req, res, repoUuid, userUuid, newRepoSettings );
  }
}

/**
 * Save only the user settings on the local frontend
 * @param {Request} req 
 * @param {Response} res 
 * @param {string} repoUuid 
 * @param {string} userUuid 
 * @param {RepositorySettings} newRepoSettings 
 */
async function saveOnlyUserSettings( req, res, repoUuid, userUuid, newRepoSettings ) {
  // TODO: Database transaction here so we rollback if we fail here somewhere
  ensureUser(userUuid);
  setUserRepoSettings(userUuid, newRepoSettings);

  res.redirect(`/dashboard/${repoUuid}/settings`);
}

/**
 * Save all (admin) settings on all the different services
 * @param {Request} req 
 * @param {Response} res 
 * @param {string} repoUuid 
 * @param {string} userUuid 
 * @param {RepositorySettings} newRepoSettings 
 */
async function saveAllSettingsOnServices(req, res, repoUuid, userUuid, newRepoSettings) {
  // Force certain settings based on other ones
  // Set color to grey when deactivated
  if (!newRepoSettings.isActive) {
    newRepoSettings.color = '#BEBEBE';
  }
  // Update schedules can only be enabled for active repositories
  newRepoSettings.enableSchedule = newRepoSettings.isActive && newRepoSettings.enableSchedule;

  // TODO: Database transaction here so we rollback if we fail here somewhere
  ensureUser(userUuid);
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


export async function deleteRepository(req, res) {
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
