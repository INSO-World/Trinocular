
import http from 'node:http';
import express from 'express';
import { initLogger, logger, readSecretEnv, setupShutdownSignals } from '../common/index.js';
import { routes } from './routes/routes.js';
import { passport, sessionAuthentication } from '../auth-utils/index.js';

await initLogger();
readSecretEnv();

const app = express();
const server= http.createServer(app);

app.set('unauthenticated redirect', '/');

// Install middleware
app.use( sessionAuthentication() );

// Default user data serialization/deserialization
passport.serializeUser( (user, done) => done(null, user) );
passport.deserializeUser( (user, done) => done(null, user) );


app.use( routes );

server.listen(80, () => {
  logger.info(`Logs service listening at port 80`);
});

setupShutdownSignals(server);
