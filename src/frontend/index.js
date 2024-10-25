
import http from 'node:http';
import express from 'express';
import httpProxy from 'http-proxy';
import { engine } from 'express-handlebars';
import { passport, sessionAuthentication } from '../auth-utils/index.js';
import { readSecretEnv, registerNotification, registerService, setupShutdownSignals } from '../common/index.js';
import { routes } from './routes/routes.js';
import { updateVisualizationsFromRegistry } from './lib/visualizations.js';
import { visualizationProxy } from './lib/proxy.js';
import * as helpers from './lib/helpers.js';

readSecretEnv();

await registerService( process.env.FRONTEND_NAME );
await registerNotification(
  process.env.VISUALIZATION_GROUP_NAME,
  process.env.FRONTEND_NAME,
  'api/notify/vis'
);

await updateVisualizationsFromRegistry();

const app = express();
const server= http.createServer(app);
const proxyServer= httpProxy.createProxyServer();

app.engine('.hbs', engine({extname: '.hbs', helpers}));
app.set('view engine', '.hbs');
app.set('views', './views');
app.set('unauthenticated redirect', '/');


// Install middleware
app.use( visualizationProxy( proxyServer ) );
app.use( sessionAuthentication() );
app.use( '/static', express.static('./public') );

// Default user data serialization/deserialization
passport.serializeUser( (user, done) => done(null, user) );
passport.deserializeUser( (user, done) => done(null, user) );


app.get('/login', (req, res) => res.redirect('/auth/login') );
app.get('/logout', (req, res) => res.redirect('/auth/logout') );


app.use( routes );

server.listen(80, () => {
  console.log(`Frontend service listening at port 80`);
});


setupShutdownSignals(server, () => {
  proxyServer.close();
});
