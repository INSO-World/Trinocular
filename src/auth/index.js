import http from 'node:http';
import express from 'express';
import { Strategy } from 'openid-client';
import { getIssuerClient } from './lib/issuer.js';
import { passport, sessionAuthentication } from '../auth-utils/index.js';
import {
  healthCheck,
  initLogger,
  logger,
  readSecretEnv,
  setupShutdownSignals
} from '../common/index.js';
import { isPassThroughMode } from './lib/passThroughMode.js';
import { routes } from './routes/routes.js';
import { UrlConstants } from './lib/urls.js';

await initLogger();
readSecretEnv();

const app = express();
const server = http.createServer(app);

app.set('unauthenticated redirect', UrlConstants.login);

// Wait until we get an issuer client
const client= isPassThroughMode() ? null : await getIssuerClient();

// Install middleware
app.use(healthCheck());
app.use(sessionAuthentication());

// Setup passport strategy if we have a client -> we are not in pass through mode
if( client ) {
  passport.use(
    'oidc',
    new Strategy({ client }, (tokenSet, userinfo, done) => {
      return done(null, tokenSet.claims());
    })
  );
}

// Default user data serialization/deserialization
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));


app.use( routes() );

server.listen(80, () => {
  logger.info(`Auth service listening at port 80 (base hostname is ${process.env.HOST_NAME})`);
});

setupShutdownSignals(server);
