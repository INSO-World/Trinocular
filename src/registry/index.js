/*

/service/<name> -> GET
/service/<name> -> POST
/service/<name>/<id> -> DELETE
/service/<name>/<id> -> PUT
/service/<name>/queue/<path>
/service/<name>/broadcast/<path>

/service/<name>/notify/<name>/[broadcast|queue]/<path> -> POST / DELETE

*/

import http from 'node:http';
import express from 'express';
import { healthCheck, initLogger, logger, readSecretEnv, setupShutdownSignals } from '../common/index.js';
import { routes } from './routes/routes.js';
import { Registry } from './lib/registry.js';

await initLogger();

Registry.create();

readSecretEnv();

const app = express();
const server = http.createServer(app);

// Install middleware
app.use(express.json());
app.use(healthCheck());

app.use(routes);

server.listen(80, () => {
  logger.info(`Registry service listening at port 80`);
});

setupShutdownSignals(server, () => {
  Registry.the().stop();
});
