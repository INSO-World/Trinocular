import { Router } from 'express';
import { internalApi } from '../../common/index.js';
import { getRepository, postRepository } from './repository.js';
import { postSnapshot } from './snapshot.js';

export const routes = new Router();

routes.get('/', (req, res) => res.end('Repo Service\n'));

routes.use('/repository', internalApi);
routes.get('/repository/:uuid', getRepository);
routes.post('/repository/:uuid', postRepository);

routes.use('/snapshot', internalApi);
routes.post('/snapshot/:uuid', postSnapshot);
