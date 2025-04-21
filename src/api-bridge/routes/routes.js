import { Router } from 'express';
import { internalApi } from '../../common/index.js';
import {
  deleteRepository,
  getAllRepositories,
  getRepository,
  postRepository,
  putRepository
} from './repository.js';
import { deleteSnapshot, postSnapshot } from './snapshot.js';

export const routes = new Router();

routes.get('/', (req, res) => res.end('API-Bridge Service\n'));

routes.use('/repository', internalApi);
routes.route('/repository').get(getAllRepositories).post(postRepository);
routes.route('/repository/:uuid').get(getRepository).delete(deleteRepository).put(putRepository);

routes.use('/snapshot', internalApi);
routes.post('/snapshot/:uuid', postSnapshot);
routes.delete('/snapshot/:uuid', deleteSnapshot);
// routes.post('/snapshot/all', postAllSnapshot);
