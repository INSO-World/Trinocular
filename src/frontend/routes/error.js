import { ErrorMessages } from '../lib/error-messages.js';

export function getErrorPage(req, res) {
  
  let errorMessage= 'Something went wrong.';
  let backLink= '/';
  
  if( req.query.hasOwnProperty('logout_error') ) {
    errorMessage= '500 Could not perform logout';

  } else if( req.query.hasOwnProperty('login_error') ) {
    errorMessage= '500 Could not perform login';

  } else if( req.query.hasOwnProperty('internal') ) {
    errorMessage= '500 There was an internal server error';

  } else if( req.query.hasOwnProperty('not_found') ) {
    const what= req.query.not_found || 'resource';
    errorMessage= ErrorMessages.NotFound( what );
  }

  res.render('error', {
    user: req.user,
    isAuthenticated: req.isAuthenticated(),
    errorMessage,
    backLink
  });
}
