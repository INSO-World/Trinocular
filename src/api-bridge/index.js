import http from 'node:http';
import express from 'express';
import { internalApi, readSecretEnv, setupShutdownSignals } from '../common/index.js';
import { connectAndInitDatabase, pool } from '../postgres-utils/index.js';
import { ApiBridge } from './lib/api-bridge.js';
import { registerDataSources } from './data-sources/register.js';
import { routes } from './routes/routes.js';

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

const app = express();
const server = http.createServer(app);

ApiBridge.create();
registerDataSources(ds => ApiBridge.the().registerDataSource(ds));

await ApiBridge.the().init();

app.use(express.json());
app.use(routes);

app.use('/bridge', internalApi, ApiBridge.the().routes);

server.listen(80, () => {
  console.log(`API-Bridge service listening at port 80`);
});

setupShutdownSignals(server, async () => {
  await pool.end();
});
