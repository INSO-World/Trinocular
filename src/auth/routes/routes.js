import { Router } from 'express';

import { isPassThroughMode } from '../lib/passThroughMode.js';
import { loginCallback, loginFilter, passThroughLogin, startLogin } from './login.js';
import { getProtectedRoute, getTestRoute, getUnprotectedRoute } from './state.js';
import { protectedPage } from '../../auth-utils/index.js';
import { logoutCallback, startLogout } from './logout.js';
import { UrlConstants } from '../lib/urls.js';

export function routes() {
  const routes = Router();

  if( !isPassThroughMode() ) {
    routes.get('/login', startLogin);
    routes.get('/login/callback', loginCallback);
    routes.get('/login/filter', loginFilter);

    routes.get('/logout', startLogout);
    routes.get('/logout/callback', logoutCallback);

  } else {
    routes.get('/login', passThroughLogin);
    routes.get('/login/callback', (req, res) => res.redirect(UrlConstants.login));

    routes.get('/logout', (req, res) => res.redirect(UrlConstants.logoutCallback));
    routes.get('/logout/callback', logoutCallback);
  }


  // Protected route
  routes.get('/protected', protectedPage, getProtectedRoute);

  // Unprotected route
  routes.get('/unprotected', getUnprotectedRoute);

  routes.get('/test', getTestRoute);

  return routes;
}
