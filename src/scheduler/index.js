
import http from 'node:http';
import express from 'express';
import { readSecretEnv, registerNotification, registerService, setupShutdownSignals } from '../common/index.js';
import { routes } from './routes/routes.js';
import { Scheduler } from './lib/scheduler.js';
import { updateVisualizationsFromRegistry } from './lib/visualizations.js';

readSecretEnv();

await registerService( process.env.SCHEDULER_NAME );
await registerNotification(
  process.env.VISUALIZATION_GROUP_NAME,
  process.env.SCHEDULER_NAME,
  'registry/notify'
);

await updateVisualizationsFromRegistry();

const app = express();
const server= http.createServer(app);

Scheduler.create();

// TODO: Load schedules from db or file

// Install middleware
app.use( express.json() );

app.use( routes );

server.listen(80, () => {
  console.log(`Scheduler service listening at port 80`);
});

setupShutdownSignals(server);
