import http from 'node:http';
import express from 'express';
import {
  healthCheck,
  initLogger,
  logger,
  readSecretEnv,
  setupShutdownSignals
} from '../common/index.js';
import { connectAndInitDatabase, pool } from '../postgres-utils/index.js';
import { routes } from './routes/routes.js';
import { loadAllRepositoriesIntoCache } from './lib/database.js';

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

// Load repositories into the repository cache map (/lib/repository)
await loadAllRepositoriesIntoCache();

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(healthCheck());
app.use(routes);

server.listen(80, () => {
  logger.info(`Repo service listening at port 80`);
});

setupShutdownSignals(server, async () => {
  await pool.end();
});
