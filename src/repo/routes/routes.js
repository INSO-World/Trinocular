import { Router } from 'express';
import { internalApi } from '../../common/index.js';
import {
  getRepository,
  postRepository,
  putRepository,
  deleteRepository,
  getCommitStats,
  getCommitCount,
  deleteRepositoryGitData
} from './repository.js';
import { postSnapshot } from './snapshot.js';

export const routes = new Router();

routes.get('/', (req, res) => res.end('Repo Service\n'));

routes.use('/repository', internalApi);
routes.get('/repository/:uuid', getRepository);
routes.post('/repository/:uuid', postRepository);
routes.put('/repository/:uuid', putRepository);
routes.delete('/repository/:uuid', deleteRepository);
routes.delete('/repository/:uuid/data', deleteRepositoryGitData);

routes.get('/repository/:uuid/commits/stats', getCommitStats);
routes.get('/repository/:uuid/commits/count', getCommitCount);

routes.use('/snapshot', internalApi);
routes.post('/snapshot/:uuid', postSnapshot);
