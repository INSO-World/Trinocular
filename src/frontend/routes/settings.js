import { createToken } from '../lib/csrf.js';
import { ensureUser, setUserRepoSettings, database, getUserRepoSettings } from '../lib/database.js';

export function getSettingsPage(req, res) {
  const repoUuid= req.params.repoUuid;
  const userUuid= req.user.sub;

  const userSettings= getUserRepoSettings( userUuid, repoUuid ) || {};
  console.log( 'user Settings', userSettings );

  // TODO: Get the repo settings from the repo service

  const repo= {
    uuid: repoUuid,
    isFavorite: userSettings.is_favorite || false,
    color: userSettings.color || 'bababa',
    name: `repo-${repoUuid}`,
    isActive: true,
    url: 'https://www.gitlab.com',
    authToken: 'abcdefg',
    type: 'gitlab',

    get isGitLab() { return this.type === 'gitlab' }
  };

  res.render('settings', {
    user: req.user,
    repo,
    csrfToken: createToken( req.sessionID )
  });
}

export function postSettings(req, res) {
  const repoUuid= req.params.repoUuid;
  const userUuid= req.user.sub;
  
  if( req.csrfError ) {
    // TODO: Show an error message
    res.redirect(`/dashboard/${repoUuid}/settings`);
    return;
  }

  // TODO: Validation of the body data

  const {isFavorite, isActive, repoColor, repoName, repoUrl, repoAuthToken, repoType}= req.body;
  console.log('Got settings:', req.body);

  // TODO: Database transaction here so we rollback if we fail here somewhere
  ensureUser( userUuid );
  setUserRepoSettings(userUuid, repoUuid, repoColor.replace('#', ''), isFavorite);

  // TODO: Update the name of the repo in the local db
  // TODO: Send settings to the repo service

  res.redirect(`/dashboard/${repoUuid}/settings`);
}
