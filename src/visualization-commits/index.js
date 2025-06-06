import http from 'node:http';
import express from 'express';
import { passport, protectedOrInternal, sessionAuthentication } from '../auth-utils/index.js';
import {
  healthCheck,
  initLogger,
  logger,
  readSecretEnv,
  registerService,
  setupShutdownSignals
} from '../common/index.js';
import { routes } from './routes/routes.js';
import { connectAndInitDatabase, pool } from '../postgres-utils/index.js';

await initLogger();

readSecretEnv();

await connectAndInitDatabase({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_SECRET,
  database: process.env.POSTGRES_DB,
  defaultDatabase: process.env.POSTGRES_DEFAULT_DB,
  initScriptFile: process.env.POSTGRES_INIT_SCRIPT
});

await registerService(process.env.VISUALIZATION_GROUP_NAME, process.env.SERVICE_NAME, {
  visualizations: [
    {
      name: `${process.env.SERVICE_NAME}-commits-per-person-chart`,
      displayName: 'Commits - Commits per person',
      framePath: 'index.html?show=commits-per-person-chart'
    }
  ]
});

const app = express();
const server = http.createServer(app);

app.set('unauthenticated redirect', '/');

// Install middleware
app.use(healthCheck());
app.use(sessionAuthentication());
app.use(protectedOrInternal);
app.use(express.static('./public'));

// Default user data serialization/deserialization
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.use(routes);

server.listen(80, () => {
  logger.info(`Visualization (commits) service listening at port 80`);
});

setupShutdownSignals(server, async () => {
  await pool.end();
});
