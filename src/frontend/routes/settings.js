import Joi from 'joi';
import { createToken } from '../lib/csrf.js';
import { addNewUser, setUserRepoSettings, database, getUserRepoSettings } from '../lib/database.js';
import { ErrorMessages } from '../lib/error-messages.js';
import { repositoryIsCurrentlyImporting } from '../lib/currently-importing.js';

const settingsValidator= Joi.object({
  isFavorite: Joi.string().valid('on').default('').label('Favorite Flag'), // Checkboxes only set an 'on' value when they are checked
  isActive: Joi.string().valid('on').default('').label('Active Flag'),
  repoColor: Joi.string().pattern(/^#[A-Fa-f0-9]{6}$/).required().label('Repository Color'),
  repoName: Joi.string().trim().max(500).required().label('Name'),
  repoUrl: Joi.string().uri().max(255).required().label('URL'),
  repoAuthToken: Joi.string().trim().max(100).required().label('Authentication Token'),
  repoType: Joi.string().valid('gitlab', 'github').required().label('Repository Type')
}).unknown(true).required(); // Allow unknown fields for other stuff like csrf tokens

function renderSettingsPage( req, res, repo, errorMessage= null ) {
  res.render('settings', {
    user: req.user,
    repo,
    errorMessage,
    csrfToken: createToken( req.sessionID )
  });
}

function repoDataFromFormBody( uuid, body ) {
  return {
    uuid,
    isFavorite: !!(body.isFavorite || ''),
    color: body.repoColor || '#bababa',
    name: body.repoName || '',
    isActive: !!(body.isActive || ''),
    url: body.repoUrl || '',
    authToken: body.repoAuthToken || '',
    type: body.repoType || 'gitlab'
  };
}


export function getSettingsPage(req, res) {
  const repoUuid= req.params.repoUuid;
  const userUuid= req.user.sub;

  // Redirect to the waiting page in case we are currently importing the
  // repository for the first time
  if( repositoryIsCurrentlyImporting(repoUuid) ) {
    return res.redirect(`/wait/${repoUuid}`);
  }

  const userSettings= getUserRepoSettings( userUuid, repoUuid ) || {};
  console.log( 'user Settings', userSettings );

  // TODO: Get the repo settings from the api bridge service
  // TODO: Get the repo settings from the scheduler

  // FIXME: We only show a name if we currently have user settings stored for the repo 
  // -> Just always take the name from the api_bridge instead

  const repo= {
    uuid: repoUuid,
    isFavorite: userSettings.is_favorite || false,
    color: '#'+ (userSettings.color || 'bababa'),
    name: userSettings.name,
    isActive: true,
    url: 'https://www.gitlab.com',
    authToken: 'abcdefg',
    type: 'gitlab',

    get isGitLab() { return this.type === 'gitlab' }
  };

  renderSettingsPage( req, res, repo );
}

export function postSettings(req, res) {
  const repoUuid= req.params.repoUuid;
  const userUuid= req.user.sub;
  
  if( req.csrfError ) {
    // As we have an csrf error we need to use the unsafeBody object instead
    return renderSettingsPage( req, res, repoDataFromFormBody(repoUuid, req.unsafeBody), ErrorMessages.CSRF() );
  }

  // Validate form data
  const {error, value}= settingsValidator.validate( req.body );
  if( error ) {
    return renderSettingsPage( req, res, repoDataFromFormBody(repoUuid, req.body), ErrorMessages.Invalid('settings', error.message) );
  }

  console.log('Got settings:', value);
  const {isFavoriteString, isActiveString, repoColor, repoName, repoUrl, repoAuthToken, repoType}= value;
  const isFavorite= !!isActiveString, isActive= !!isActiveString;

  // TODO: Database transaction here so we rollback if we fail here somewhere
  addNewUser( userUuid );
  setUserRepoSettings(userUuid, repoUuid, repoColor.replace('#', ''), isFavorite);

  // TODO: Update the name of the repo in the local db
  // TODO: Send settings to the repo service

  res.redirect(`/dashboard/${repoUuid}/settings`);
}
