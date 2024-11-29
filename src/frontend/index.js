import http from 'node:http';
import express from 'express';
import httpProxy from 'http-proxy';
import { engine } from 'express-handlebars';
import { passport, sessionAuthentication } from '../auth-utils/index.js';
import {
  readSecretEnv,
  registerNotification,
  registerService,
  setupShutdownSignals
} from '../common/index.js';
import { routes } from './routes/routes.js';
import { updateVisualizationsFromRegistry } from './lib/visualizations.js';
import { visualizationProxy } from './lib/proxy.js';
import {initDatabase, database, addNewRepositories} from './lib/database.js';
import * as helpers from './lib/helpers.js';
import { csrf } from './lib/csrf.js';
import {getAllRepositoriesFromApiBridge} from "./lib/requests.js";

readSecretEnv();

initDatabase(process.env.DB_FILE, process.env.DB_INIT_SCRIPT);

await registerService(process.env.SERVICE_NAME);
await registerNotification(
  process.env.VISUALIZATION_GROUP_NAME,
  process.env.SERVICE_NAME,
  'api/notify/vis'
);

await updateVisualizationsFromRegistry();

// TODO remove before merge
const repos = await getAllRepositoriesFromApiBridge();
await addNewRepositories(repos);
//

const app = express();
const server = http.createServer(app);
const proxyServer = httpProxy.createProxyServer();

app.engine('.hbs', engine({ extname: '.hbs', helpers }));
app.set('view engine', '.hbs');
app.set('views', './views');
app.set('unauthenticated redirect', '/');

// Install middleware
app.use(visualizationProxy(proxyServer));
app.use(sessionAuthentication());
app.use('/static', express.static('./public'));
app.use(express.urlencoded({ extended: true }));
app.use(csrf);

// Default user data serialization/deserialization
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get('/login', (req, res) => res.redirect('/auth/login'));
app.get('/logout', (req, res) => res.redirect('/auth/logout'));

app.use(routes);

server.listen(80, () => {
  console.log(`Frontend service listening at port 80`);
});

setupShutdownSignals(server, () => {
  database.close();
  proxyServer.close();
});
