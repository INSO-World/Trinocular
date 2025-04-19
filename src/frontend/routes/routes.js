import { Router } from 'express';

import { home } from './home.js';
import { repos } from './repos.js';
import { getErrorPage } from './error.js';
import { notifyRepositoryImported, notifyVisualization } from './api/notify.js';
import { protectedApi, protectedPage } from '../../auth-utils/index.js';
import { internalApi } from '../../common/index.js';
import { dashboard } from './dashboard.js';
import { deleteRepositoryHandler, getSettingsPage, postSettings } from './settings.js';
import { dbViewer } from './db-viewer.js';
import { getNewRepoPage, postNewRepo } from './new.js';
import { getWaitPage, getWaitPageUpdate } from './wait-for-repo.js';
import { getDashboardConfig, postDashboardConfig } from './api/dashboard-config.js';
import { getStatusPage } from './status.js';

export const routes = Router();

routes.get('/', home);
routes.get('/error', getErrorPage);
routes.get('/repos', protectedPage, repos);
routes.route('/repos/new').get(protectedPage, getNewRepoPage).post(protectedPage, postNewRepo);
routes
  .route('/dashboard/:repoUuid')
  .get(protectedPage, dashboard)
  .delete(protectedPage, deleteRepositoryHandler);
routes
  .route('/dashboard/:repoUuid/settings')
  .get(protectedPage, getSettingsPage)
  .post(protectedPage, postSettings);
routes.get('/wait/:repoUuid', protectedPage, getWaitPage);
routes.get('/wait/:repoUuid/update', protectedApi, getWaitPageUpdate);

routes.get('/db-viewer', protectedPage, dbViewer);

routes.get('/status', protectedPage, getStatusPage);

routes.use('/api/notify', internalApi);
routes.post('/api/notify/vis', notifyVisualization);
routes.post('/api/notify/import', notifyRepositoryImported);

routes
  .route('/api/repo/:repoUuid/dashboard-config')
  .get(protectedPage, getDashboardConfig)
  .post(protectedPage, postDashboardConfig);
