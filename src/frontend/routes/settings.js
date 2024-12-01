import Joi from 'joi';
import { createToken } from '../lib/csrf.js';
import {
  ensureUser,
  setUserRepoSettings,
  getUserRepoSettings,
  deleteRepositoryByUuid
} from '../lib/database.js';
import { ErrorMessages } from '../lib/error-messages.js';
import { repositoryIsCurrentlyImporting } from '../lib/currently-importing.js';
import { deleteRepositoryOnService } from '../lib/requests.js';

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
  scheduleCadence: Joi.string()
    .pattern(/^\d+:\d+$/)
    .required()
    .label('Schedule cadence'),
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
    scheduleStartTime: body.scheduleStartTime || ''
  };
}

export function getSettingsPage(req, res) {
  const repoUuid = req.params.repoUuid;
  const userUuid = req.user.sub;

  // Redirect to the waiting page in case we are currently importing the
  // repository for the first time
  if (repositoryIsCurrentlyImporting(repoUuid)) {
    return res.redirect(`/wait/${repoUuid}`);
  }

  const userSettings = getUserRepoSettings(userUuid, repoUuid) || {};
  console.log('user Settings', userSettings);

  // TODO: Get the repo settings from the api bridge service
  // TODO: Get the repo settings from the scheduler

  // FIXME: We only show a name if we currently have user settings stored for the repo
  // -> Just always take the name from the api_bridge instead

  const repo = {
    uuid: repoUuid,
    isFavorite: userSettings.is_favorite || false,
    color: '#' + (userSettings.color || 'bababa'),
    name: userSettings.name,
    isActive: true,
    url: 'https://www.gitlab.com',
    authToken: 'abcdefg',
    type: 'gitlab',
    enableSchedule: true,
    scheduleCadence: '00:00',
    scheduleStartTime: '2024-11-12T23:30',

    get isGitLab() {
      return this.type === 'gitlab';
    }
  };

  renderSettingsPage(req, res, repo);
}

export function postSettings(req, res) {
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
  const {
    isFavoriteString,
    isActiveString,
    repoColor,
    repoName,
    repoUrl,
    repoAuthToken,
    repoType,
    enableScheduleString,
    scheduleCadence,
    scheduleStartTime
  } = value;
  const isFavorite = !!isActiveString;
  const isActive = !!isActiveString;
  const enableSchedule = isActive && !!enableScheduleString;

  // TODO: Database transaction here so we rollback if we fail here somewhere
  ensureUser(userUuid);
  setUserRepoSettings(userUuid, repoUuid, repoColor.replace('#', ''), isFavorite);

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

  // delete from own database
  deleteRepositoryByUuid(repoUuid);

  console.log('on API');
  // delete on API service
  const { error: apiBridgeError } = await deleteRepositoryOnService(
    process.env.API_BRIDGE_NAME,
    repoUuid
  );
  if (apiBridgeError) {
    console.log(apiBridgeError);
    return renderSettingsPage(req, res, repoDataFromFormBody(repoUuid, {}), apiBridgeError, 400);
  }

  console.log('on repo');
  // delete on Repo service
  const { error: repoServiceError } = await deleteRepositoryOnService(
    process.env.REPO_NAME,
    repoUuid
  );
  if (repoServiceError) {
    return renderSettingsPage(req, res, repoDataFromFormBody(repoUuid, {}), repoServiceError, 400);
  }

  console.log('on scheduler');
  // delete on Scheduler service
  const { error: schedulerError } = await deleteRepositoryOnService(
    process.env.SCHEDULER_NAME,
    repoUuid
  );
  if (schedulerError) {
    return renderSettingsPage(req, res, repoDataFromFormBody(repoUuid, {}), schedulerError, 400);
  }

  res.sendStatus(204);
}
