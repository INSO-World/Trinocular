import Joi from 'joi';
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
import { repositoryIsCurrentlyImporting } from '../lib/currently-importing.js';
import {
  deleteRepositoryOnSchedulerService,
  deleteRepositoryOnService,
  getRepositoryFromAPIService,
  getScheduleFromSchedulerService
} from '../lib/requests.js';

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
  res.status(status).render('settings', {
    user: req.user,
    repo,
    errorMessage,
    csrfToken: createToken(req.sessionID),
    scriptSource: '/static/settings.js'
  });
}

function repoDataFromFormBody(uuid, body) {
  return {
    uuid,
    isFavorite: !!(body.isFavorite || ''),
    color: body.repoColor || '#bababa',
    name: body.repoName || '',
    isActive: !!(body.isActive || ''),
    url: body.repoUrl || '',
    authToken: body.repoAuthToken || '',
    type: body.repoType || 'gitlab',
    enableSchedule: !!(body.enableSchedule || ''),
    scheduleCadence: body.scheduleCadence || '',
    scheduleCadenceValue: body.scheduleCadenceValue || 0,
    scheduleCadenceUnit: body.scheduleCadenceUnit || 'days',
    scheduleStartTime: body.scheduleStartTime || ''
  };
}

/**
 * @param {Date} date
 */
function _getDateTimeLocal(date) {
  // Utility to pad numbers to 2 digits
  const pad = num => String(num).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1); // Months are 0-based
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export async function getSettingsPage(req, res) {
  const repoUuid = req.params.repoUuid;
  const userUuid = req.user.sub;

  // Redirect to the waiting page in case we are currently importing the
  // repository for the first time
  if (repositoryIsCurrentlyImporting(repoUuid)) {
    return res.redirect(`/wait/${repoUuid}`);
  }

  const userSettings = getUserRepoSettings(userUuid, repoUuid) || {};
  const repoSettings = getRepositoryByUuid(repoUuid) || {};

  // Get the repo settings from the api bridge service
  const { name, authToken, url, type } = await getRepositoryFromAPIService(repoUuid);
  // Get the repo schedule info from the scheduler
  const { enableSchedule, cadenceValue, cadenceUnit, startDate } =
    await getScheduleFromSchedulerService(repoUuid);

  const repo = {
    uuid: repoUuid,
    isFavorite: userSettings.is_favorite || false,
    color: '#' + (userSettings.color || 'bababa'),
    name: name,
    isActive: repoSettings.is_active || false,
    url: url,
    authToken: authToken,
    type: type,
    enableSchedule: enableSchedule,
    scheduleCadenceValue: enableSchedule ? cadenceValue : 1,
    scheduleCadenceUnit: enableSchedule ? cadenceUnit : 'days',
    scheduleStartTime: _getDateTimeLocal(enableSchedule ? startDate : new Date()),

    get isGitLab() {
      return this.type === 'gitlab';
    },

    get isCadenceInHours() {
      return this.scheduleCadenceUnit === 'hours';
    },

    get isCadenceInDays() {
      return this.scheduleCadenceUnit === 'days';
    },

    get isCadenceInWeeks() {
      return this.scheduleCadenceUnit === 'weeks';
    }
  };

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
    return renderSettingsPage(
      req,
      res,
      repoDataFromFormBody(repoUuid, req.unsafeBody),
      ErrorMessages.CSRF()
    );
  }

  // Validate form data
  const { error, value } = settingsValidator.validate(req.body);
  if (error) {
    return renderSettingsPage(
      req,
      res,
      repoDataFromFormBody(repoUuid, req.body),
      ErrorMessages.Invalid('settings', error.message)
    );
  }

  console.log('Got settings:', value);
  let {
    isFavorite: isFavoriteString,
    isActive: isActiveString,
    repoColor,
    repoName,
    repoUrl,
    repoAuthToken,
    repoType,
    enableSchedule: enableScheduleString,
    scheduleCadence,
    scheduleStartTime
  } = value;
  const isFavorite = !!isFavoriteString;

  const isActive = !!isActiveString;
  if (!isActive) {
    repoColor = '#BEBEBE'; // set to grey when deactivated
  }
  const enableSchedule = isActive && !!enableScheduleString;

  // TODO: Database transaction here so we rollback if we fail here somewhere
  await ensureUser(userUuid);
  setUserRepoSettings(userUuid, repoUuid, repoColor.replace('#', ''), isFavorite);
  setRepoSettings(repoUuid, repoName, isActive);

  // TODO: Update the name of the repo in the local db
  // TODO: Send settings to the repo service

  res.redirect(`/dashboard/${repoUuid}/settings`);
}

export async function deleteRepository(req, res) {
  const repoUuid = req.params.repoUuid;

  console.log('deleting');
  //TODO in case of error show prior data
  if (req.csrfError) {
    // As we have a csrf error we need to use the unsafeBody object instead
    return renderSettingsPage(
      req,
      res,
      repoDataFromFormBody(repoUuid, req.unsafeBody),
      ErrorMessages.CSRF()
    );
  }
  //TODO what if one fails? in frontend already deleted, but not in other service

  // delete from own database
  deleteRepositoryByUuid(repoUuid);

  console.log('on API');
  // delete on API service
  const apiBridgeErrorMsg = await deleteRepositoryOnService(process.env.API_BRIDGE_NAME, repoUuid);
  if (apiBridgeErrorMsg) {
    console.log(apiBridgeErrorMsg);
    return renderSettingsPage(req, res, repoDataFromFormBody(repoUuid, {}), apiBridgeError, 400);
  }

  console.log('on repo');
  // delete on Repo service
  const repoServiceErrorMsg = await deleteRepositoryOnService(process.env.REPO_NAME, repoUuid);
  if (repoServiceErrorMsg) {
    return renderSettingsPage(
      req,
      res,
      repoDataFromFormBody(repoUuid, {}),
      repoServiceErrorMsg,
      400
    );
  }

  console.log('on scheduler');
  // delete on Scheduler service
  const schedulerErrorMsg = await deleteRepositoryOnSchedulerService(repoUuid);
  if (schedulerErrorMsg) {
    return renderSettingsPage(req, res, repoDataFromFormBody(repoUuid, {}), schedulerErrorMsg, 400);
  }

  res.sendStatus(204);
}
