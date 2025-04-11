
import { logger } from '../../common/index.js';
import { getIssuerClient } from '../lib/issuer.js';
import { UrlConstants } from '../lib/urls.js';

export async function startLogout(req, res) {
  const client= await getIssuerClient();
  res.redirect(client.endSessionUrl());
}

export function logoutCallback(req, res) {
  // Clears the user from the session store
  req.logout(err => {
    if (err) {
      logger.error('Could not logout user: %s', err);

      res.redirect(UrlConstants.frontendError('logout_error'));
      return;
    }

    // Redirects the user to a public route
    res.redirect(UrlConstants.frontendLogoutSuccess);
  });
}

