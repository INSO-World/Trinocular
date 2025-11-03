
import { passport } from '../../auth-utils/index.js';
import { logger } from '../../common/index.js';
import { UrlConstants } from '../lib/urls.js';
import { filterUser, userFilteringEnabled } from '../lib/userFilter.js';


export function startLogin(req, res, next) {
  passport.authenticate('oidc')(req, res, next);
}

export function loginCallback(req, res, next) {
  passport.authenticate('oidc', {
    successRedirect: UrlConstants.loginFilter,
    failureRedirect: UrlConstants.frontendError('login_error=oidc')
  })(req, res, next);
}

export function loginFilter(req, res) {
  if( !req.isAuthenticated() ) {
    return res.redirect(UrlConstants.frontendError('login_error=invalid'));
  }

  if( userFilteringEnabled() && !filterUser(req.user) ) {
    logger.info(`User filter did not accept user (${req.user.name} ${req.user.email})`);

    return req.logout( err => {
      if( err ) {
        logger.error('Could not end session: %s', err);
        return res.redirect(UrlConstants.frontendError('login_error=session'));
      }

      res.redirect(UrlConstants.frontendError('login_error=filter'));
    });
  }

  req.user.isFilterAccepted= req.session.passport.user.isFilterAccepted= true;

  req.session.save( err => {
    if( err ) {
      logger.error('Could not save session: %s', err);
      return res.redirect(UrlConstants.frontendError('login_error=session'));
    }

    res.redirect(UrlConstants.frontendLoginSuccess);
  });
}

function makeDummyUser() {
  const currentTime= Date.now();
  const expirationTime= currentTime+ (100* 60* 60* 1000); // a 100h from now
  return {
    exp: expirationTime,
    iat: expirationTime,
    auth_time: currentTime,
    sub: 'bf0951c8-6054-4a98-a839-c8315fe307de',
    typ: 'ID',
    sid: '3a5320ba-769c-49d7-b730-c58b6638873b',
    email_verified: true,
    name: 'Development User',
    preferred_username: 'devuser',
    given_name: 'Development',
    family_name: 'User',
    email: 'devlopment.user@example.com',
    isFilterAccepted: true
  };
}

export function passThroughLogin(req, res) {
  if( req.session.user ) {
    return res.redirect(UrlConstants.frontendLoginSuccess);
  }

  req.session.regenerate((err) => {
    if( err ) {
      logger.error('Could not regenerate session: %s', err);
      return res.redirect(UrlConstants.frontendError('login_error=regenerate'));
    }

    const devUser= makeDummyUser();
    req.session.passport = { user: devUser }; // Mock passport session
    req.user = devUser;

    req.session.save((err) => {
      if( err ) {
        logger.error('Could not save session: %s', err);
        return res.redirect(UrlConstants.frontendError('login_error=session'));
      }

      logger.info('New pass-through session stored in Memcached');
      res.redirect(UrlConstants.frontendLoginSuccess);
    });
  });
}
