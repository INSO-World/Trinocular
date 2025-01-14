
import http from 'node:http';
import express from 'express';
import * as expressHandlebars from 'express-handlebars';
import { initLogger, logger, readSecretEnv, setupShutdownSignals } from '../common/index.js';
import { routes } from './routes/routes.js';
import { passport, sessionAuthentication } from '../auth-utils/index.js';
import { connectAndInitDatabase, pool } from '../postgres-utils/index.js';
import { initRollingLogs, stopRollingUpdateTimer } from './lib/rolling.js';
import { healthCheck } from '../common/healthcheck.js';

await initLogger();
readSecretEnv();

await connectAndInitDatabase({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_SECRET,
  database: process.env.POSTGRES_DB,
  initScriptFile: process.env.POSTGRES_INIT_SCRIPT
});

initRollingLogs();

const app = express();
const server= http.createServer(app);
const hbs = expressHandlebars.create({ extname: '.hbs' });

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');
app.set('views', './views');
app.set('unauthenticated redirect', '/');

// Install middleware
app.use( healthCheck() );
app.use( sessionAuthentication() );
app.use('/static', express.static('./public'));
app.use(express.urlencoded({ extended: true }));

// Default user data serialization/deserialization
passport.serializeUser( (user, done) => done(null, user) );
passport.deserializeUser( (user, done) => done(null, user) );


app.use( routes );

server.listen(80, () => {
  logger.info(`Logs service listening at port 80`);
});

setupShutdownSignals(server, async () => {
  stopRollingUpdateTimer();
  await pool.end();
});
