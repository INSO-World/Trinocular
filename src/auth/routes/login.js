
import { passport } from '../../auth-utils/index.js';
import { logger } from '../../common/index.js';


export function startLogin(req, res, next) {
  passport.authenticate('oidc')(req, res, next);
}

export function loginCallback(req, res, next) {
  passport.authenticate('oidc', {
    successRedirect: process.env.LOGIN_URL,
    failureRedirect: `${process.env.ERROR_URL}?login_error`
  })(req, res, next);
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
    email: 'devlopment.user@example.com'
  };
}

export function passThroughLogin(req, res) {
  if( req.session.user ) {
    return res.redirect(process.env.LOGIN_URL);
  }

  req.session.regenerate((err) => {
    if( err ) {
      logger.error('Could not regenerate session: %s', err);
      return res.redirect(`${process.env.ERROR_URL}?login_error`);
    }

    const devUser= makeDummyUser();
    req.session.passport = { user: devUser }; // Mock passport session
    req.user = devUser;

    req.session.save((err) => {
      if( err ) {
        logger.error('Could not save session: %s', err);
        return res.redirect(`${process.env.ERROR_URL}?login_error`);
      }

      logger.info('New pass-through session stored in Memcached');
      res.redirect(process.env.LOGIN_URL);
    });
  });
}
