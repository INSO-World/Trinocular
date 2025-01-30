import http from 'node:http';
import express from 'express';
import httpProxy from 'http-proxy';
import * as expressHandlebars from 'express-handlebars';
import { passport, sessionAuthentication } from '../auth-utils/index.js';
import {
  healthCheck,
  initLogger,
  logger,
  readSecretEnv,
  registerNotification,
  registerService,
  setupShutdownSignals
} from '../common/index.js';
import { routes } from './routes/routes.js';
import { updateVisualizationsFromRegistry } from './lib/visualizations.js';
import { visualizationProxy } from './lib/proxy.js';
import { initDatabase, database } from './lib/database.js';
import * as helpers from './lib/helpers.js';
import { csrf } from './lib/csrf.js';
import { errorHandler, notFoundHandler } from './routes/error.js';

await initLogger();
readSecretEnv();

initDatabase(process.env.DB_FILE, process.env.DB_INIT_SCRIPT);

await registerService(process.env.SERVICE_NAME);
await registerNotification(
  process.env.VISUALIZATION_GROUP_NAME,
  process.env.SERVICE_NAME,
  'api/notify/vis'
);

await updateVisualizationsFromRegistry();

const app = express();
const server = http.createServer(app);
const proxyServer = httpProxy.createProxyServer();

const hbs = expressHandlebars.create({ extname: '.hbs', helpers });
helpers.setHelpersHbs(hbs);

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');
app.set('views', './views');
app.set('unauthenticated redirect', '/');

// Install middleware
app.use(healthCheck());
app.use(visualizationProxy(proxyServer));
app.use(sessionAuthentication());
app.use('/static', express.static('./public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(csrf);

// Default user data serialization/deserialization
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get('/login', (req, res) => res.redirect('/auth/login'));
app.get('/logout', (req, res) => res.redirect('/auth/logout'));

app.use(routes);

// A catch all handler for anything we could not handle
app.all('/*splat', notFoundHandler);

// The error handler has to be the last call to 'app.use()'
app.use(errorHandler);

server.listen(80, () => {
  logger.info(`Frontend service listening at port 80`);
});

setupShutdownSignals(server, () => {
  database.close();
  proxyServer.close();
});
