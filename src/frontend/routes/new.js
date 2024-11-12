
import Joi from 'joi';
import { createToken } from '../lib/csrf.js';
import { ErrorMessages } from '../lib/error-messages.js';

const newRepositoryValidator= Joi.object({
  name: Joi.string().trim().min(0).required().label('Name'), // The name may be empty, so we try to load it via the API
  url: Joi.string().uri().required().label('URL'),
  authToken: Joi.string().trim().required().label('Authentication Token'),
  type: Joi.string().valid('github', 'gitlab').required().label('Type')
}).unknown(true).required(); // Allow unknown fields for other stuff like csrf tokens

function renderNewRepoPage(req, res, name, url, authToken, errorMessage) {
  // FIXME: This (and the hbs-template) does not have support for different repo types
  res.render('new', {
    user: req.user,
    csrfToken: createToken( req.sessionID ),
    errorMessage,
    name, url, authToken
  });
}

export function getNewRepoPage(req, res) {
  // Just render the page with empty input fields
  renderNewRepoPage( req, res );
}

export function postNewRepo(req, res) {
  
  if( req.csrfError ) {
    // As we have an csrf error we need to use the unsafeBody object instead
    const {name, url, authToken}= req.unsafeBody;
    return renderNewRepoPage( req, res, name, url, authToken, ErrorMessages.CSRF() );
  }

  const {value, error}= newRepositoryValidator.validate( req.body );
  if( error ) {
    const {name, url, authToken}= req.body;
    return renderNewRepoPage( req, res, name, url, authToken, ErrorMessages.Invalid('repository', error.message) );
  }

  const {name, url, authToken, type}= value;

  // Create new repository on the api bridge
  // Get the name of the repo if none is set here

  // Create scheduler default schedule
  // Run scheduler task now -> Get the transaction ID for polling

  // TODO: Redirect to the waiting page
  res.redirect(`/repos`);
}
