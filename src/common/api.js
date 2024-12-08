export function apiRequestIsAuthenticated(req) {
  const authHeader = req.header('authorization');
  if (authHeader && authHeader.substring(0, 6).toLowerCase() === 'bearer') {
    if (!process.env.INTERNAL_API_SECRET) {
      console.error('The secret for internal API authentication is not set');
      return false;
    }

    const token = authHeader.substring(7);
    if (token === process.env.INTERNAL_API_SECRET) {
      return true;
    }
  }

  return false;
}

export function internalApi(req, res, next) {
  if (apiRequestIsAuthenticated(req)) {
    next();
    return;
  }

  res.status(401).end('Unauthorized');
}

export function apiAuthHeader(options = {}) {
  if (!options.hasOwnProperty('headers')) {
    options.headers = {};
  }

  options.headers.authorization = `bearer ${process.env.INTERNAL_API_SECRET}`;
  return options;
}
