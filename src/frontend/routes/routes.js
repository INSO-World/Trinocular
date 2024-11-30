import { Router } from 'express';

import { home } from './home.js';
import { repos } from './repos.js';
import { getErrorPage } from './error.js';
import { notifyRepositoryImported, notifyVisualization } from './api/notify.js';
import { protectedPage } from '../../auth-utils/index.js';
import { internalApi } from '../../common/index.js';
import { dashboard } from './dashboard.js';
import { getSettingsPage, postSettings } from './settings.js';
import { dbViewer } from './db-viewer.js';
import { getNewRepoPage, postNewRepo } from './new.js';
import { getWaitPage, getWaitPageUpdate } from './wait-for-repo.js';

export const routes = Router();

routes.get('/', home);
routes.get('/error', getErrorPage);
routes.get('/repos', protectedPage, repos);
routes.route('/repos/new').get(protectedPage, getNewRepoPage).post(protectedPage, postNewRepo);
routes.get('/dashboard/:repoUuid', protectedPage, dashboard);
routes
  .route('/dashboard/:repoUuid/settings')
  .get(protectedPage, getSettingsPage)
  .post(protectedPage, postSettings);
routes.get('/wait/:repoUuid', protectedPage, getWaitPage);
routes.get('/wait/:repoUuid/update', protectedPage, getWaitPageUpdate);

routes.get('/db-viewer', protectedPage, dbViewer);

routes.use('/api', internalApi);
routes.post('/api/notify/vis', notifyVisualization);
routes.post('/api/notify/import', notifyRepositoryImported);
