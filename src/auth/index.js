import http from 'node:http';
import express from 'express';
import { Issuer, Strategy } from 'openid-client';
import { waitForIssuer } from './lib/issuer.js';
import { passport, protectedPage, sessionAuthentication } from '../auth-utils/index.js';
import { healthCheck, initLogger, logger, readSecretEnv, setupShutdownSignals } from '../common/index.js';

await initLogger();
readSecretEnv();

const app = express();
const server = http.createServer(app);

app.set('unauthenticated redirect', `http://${process.env.HOST_NAME}/login`);

// Wait for OpenID issuer and connect to it
await waitForIssuer(process.env.ISSUER_URL);

logger.info('Connecting to issuer');
const issuer = await Issuer.discover(process.env.ISSUER_URL);

logger.info(`Discovered issuer (${issuer.issuer})`);
const client = new issuer.Client({
  client_id: process.env.CLIENT_NAME,
  client_secret: process.env.CLIENT_SECRET,
  redirect_uris: [`http://${process.env.HOST_NAME}/login/callback`],
  post_logout_redirect_uris: [`http://${process.env.HOST_NAME}/logout/callback`],
  response_types: ['code']
});

// Install middleware
app.use(healthCheck());
app.use(sessionAuthentication());

// Setup passport strategy
passport.use(
  'oidc',
  new Strategy({ client }, (tokenSet, userinfo, done) => {
    return done(null, tokenSet.claims());
  })
);

// Default user data serialization/deserialization
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Start login request
app.get('/login', passport.authenticate('oidc'));

// Login callback
app.get(
  '/login/callback',
  passport.authenticate('oidc', {
    successRedirect: process.env.LOGIN_URL,
    failureRedirect: `${process.env.ERROR_URL}?login_error`
  })
);

// Protected route
app.get('/protected', protectedPage, (req, res) => {
  res.end('This route is protected');
});

// Unprotected route
app.get('/unprotected', (req, res) => {
  res.end('This route is unprotected');
});

app.get('/test', (req, res) => {
  res.end(`Session is authenticated: ${req.isAuthenticated() ? 'yes' : 'no'}`);
});

// Start logout request
app.get('/logout', (req, res) => {
  res.redirect(client.endSessionUrl());
});

// Logout callback
app.get('/logout/callback', (req, res) => {
  // Clears the user from the session store
  req.logout(err => {
    if (err) {
      logger.error('Could not logout user: %s', err);

      res.redirect(`${process.env.ERROR_URL}?logout_error`);
      return;
    }

    // Redirects the user to a public route
    res.redirect(process.env.LOGOUT_URL);
  });
});

server.listen(80, () => {
  logger.info(`Auth service listening at port 80 (base hostname is ${process.env.HOST_NAME})`);
});

setupShutdownSignals(server);
