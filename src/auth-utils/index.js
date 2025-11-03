import passport from 'passport';
import expressSession from 'express-session';
import ConnectMemcached from 'connect-memcached';

import { apiRequestIsAuthenticated } from '../common/index.js';

export { passport };

export function sessionAuthentication() {
  // Setup session middleware with memcached store
  const MemcachedStore = ConnectMemcached(expressSession);
  const store = new MemcachedStore({
    hosts: [process.env.MEMCACHED_HOST],
    prefix: 'session'
  });

  const session = expressSession({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store
  });

  // Return middleware array
  return [session, passport.initialize(), passport.session()];
}

export function userRequestIsAuthenticated( req ) {
  return req.isAuthenticated() && req.user?.isFilterAccepted;
}

export function protectedPage(req, res, next) {
  if (userRequestIsAuthenticated(req)) {
    return next();
  }

  res.redirect(req.app.get('unauthenticated redirect') || '/');
}

export function protectedApi(req, res, next) {
  if (userRequestIsAuthenticated(req)) {
    return next();
  }

  res.sendStatus(401);
}

export function protectedOrInternal(req, res, next) {
  if (userRequestIsAuthenticated(req) || apiRequestIsAuthenticated(req)) {
    return next();
  }

  res.sendStatus(401);
}
