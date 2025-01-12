import { apiRequestIsAuthenticated } from './api.js';

export function requestIsLocal( req ) {
  const localIPRegex= /^(127\.[\d.]+|[0:]+1|localhost)$/;
  return req.ip && localIPRegex.test(req.ip);
}

export function healthCheck(path= '/health') {
  return function( req, res, next ) {
    if( req.path !== path ) {
      next();
      return;
    }

    if (!apiRequestIsAuthenticated(req) && !requestIsLocal(req)) {
      res.sendStatus(403);
      return;
    }

    res.sendStatus(200);
  }
}
