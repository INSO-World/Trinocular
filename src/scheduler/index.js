import http from 'node:http';
import express from 'express';
import {
  healthCheck,
  initLogger,
  logger,
  readSecretEnv,
  registerNotification,
  registerService,
  setupShutdownSignals,
  stopRegistryPings
} from '../common/index.js';
import { routes } from './routes/routes.js';
import { Scheduler } from './lib/scheduler.js';
import { updateVisualizationsFromRegistry } from './lib/visualizations.js';
import { loadSchedules } from './lib/persistence.js';
import { initMemcached } from './lib/memcached-connection.js';

await initLogger();
readSecretEnv();

initMemcached(process.env.MEMCACHED_HOST);

await registerService(process.env.SERVICE_NAME);
await registerNotification(
  process.env.VISUALIZATION_GROUP_NAME,
  process.env.SERVICE_NAME,
  'registry/notify'
);

await updateVisualizationsFromRegistry();

const app = express();
const server = http.createServer(app);

Scheduler.create();

Scheduler.the().setSchedules(await loadSchedules());

// Install middleware
app.use(express.json());
app.use(healthCheck());

app.use(routes);

server.listen(80, () => {
  logger.info(`Scheduler service listening at port 80`);
});

setupShutdownSignals(server, () => {
  stopRegistryPings();
});
