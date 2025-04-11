import { Router } from 'express';

import { isPassThroughMode } from '../lib/passThroughMode.js';
import { loginCallback, passThroughLogin, startLogin } from './login.js';
import { getProtectedRoute, getTestRoute, getUnprotectedRoute } from './state.js';
import { protectedPage } from '../../auth-utils/index.js';
import { logoutCallback, startLogout } from './logout.js';

export const routes = Router();

if( !isPassThroughMode() ) {
  routes.get('/login', startLogin);
  routes.get('/login/callback', loginCallback);

  routes.get('/logout', startLogout);
  routes.get('/logout/callback', logoutCallback);

} else {
  routes.get('/login', passThroughLogin);
  routes.get('/login/callback', (req, res) => res.redirect('/login'));

  routes.get('/logout', (req, res) => res.redirect(`http://${process.env.HOST_NAME}/logout/callback`));
  routes.get('/logout/callback', logoutCallback);
}


// Protected route
routes.get('/protected', protectedPage, getProtectedRoute);

// Unprotected route
routes.get('/unprotected', getUnprotectedRoute);

routes.get('/test', getTestRoute);
