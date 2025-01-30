import { ErrorMessages } from '../lib/error-messages.js';

export function errorHandler(err, req, res, next) {
  // The error happened after we have already started to transmit
  // the response. Nothing we can do now
  if (res.headersSent) {
    return next(err);
  }

  const traceFlag = process.env.SHOW_ERROR_STACKTRACE;
  const includeTrace = traceFlag && traceFlag.trim().toLowerCase() === 'true';
  const errorMessage = includeTrace ? err.message : 'Something went wrong.';
  const stackTrace = includeTrace ? err.stack : null;

  res.status(500).render('error', {
    user: req.user,
    isAuthenticated: req.isAuthenticated(),
    stackTrace,
    errorMessage,
    backLink: '/'
  });
}

export function notFoundHandler(req, res) {
  res.status(404).render('error', {
    user: req.user,
    isAuthenticated: req.isAuthenticated(),
    errorMessage: ErrorMessages.NotFound('page'),
    backLink: '/'
  });
}

export function getErrorPage(req, res) {
  let errorMessage = 'Something went wrong.';
  let backLink = '/';
  let status = 500;

  if (req.query.hasOwnProperty('logout_error')) {
    errorMessage = '500 Could not perform logout';
  } else if (req.query.hasOwnProperty('login_error')) {
    errorMessage = '500 Could not perform login';
  } else if (req.query.hasOwnProperty('internal')) {
    errorMessage = '500 There was an internal server error';
  } else if (req.query.hasOwnProperty('not_found')) {
    const what = req.query.not_found || 'resource';
    errorMessage = ErrorMessages.NotFound(what);
    status = 404;
  }

  res.status(status).render('error', {
    user: req.user,
    isAuthenticated: req.isAuthenticated(),
    errorMessage,
    backLink
  });
}
