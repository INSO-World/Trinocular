import { createToken } from '../lib/csrf.js';

export function getNewRepoPage(req, res) {
  res.render('new', {
    user: req.user,
    csrfToken: createToken( req.sessionID )
  });
}

export function postNewRepo(req, res) {
  
  if( req.csrfError ) {
    // TODO: Show an error message
    res.redirect(`/repos`);
    return;
  }

  // TODO: Validation of the body data

  const {name, url, authToken, type}= req.body;

  // Check if repo with this url already exists
  // Create new repository on the api bridge
  // Run the scheduler

  // TODO: Redirect to the waiting page
  res.redirect(`/repos`);
}
