
import http from 'node:http';
import express from 'express';
import { passport, protectedOrInternal, sessionAuthentication } from '../auth-utils/index.js';
import { readSecretEnv, registerService, setupShutdownSignals } from '../common/index.js';
import { routes } from './routes/routes.js';

readSecretEnv();

// TODO: Register visualizations of this service here
await registerService( process.env.VISUALIZATION_GROUP_NAME, process.env.SERVICE_NAME, {
  visualizations: [
    {
      name: `${process.env.SERVICE_NAME}-per-issue`,
      displayName: '(Better) Demo - Time spent',
      framePath: 'index.html?show=per-issue'
    },
  ]
});

const app = express();
const server= http.createServer(app);

app.set('unauthenticated redirect', '/');

// Install middleware
app.use( sessionAuthentication() );
app.use( protectedOrInternal );
app.use( express.static('./public') );

// Default user data serialization/deserialization
passport.serializeUser( (user, done) => done(null, user) );
passport.deserializeUser( (user, done) => done(null, user) );


app.use( routes );

server.listen(80, () => {
  console.log(`Visualization (time spent) service listening at port 80`);
});

setupShutdownSignals(server);
