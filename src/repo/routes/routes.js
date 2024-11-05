
import { Router } from 'express';
import { internalApi } from '../../common/index.js';
import { getRepository, postRepository } from './repository.js';
import { postSnapshot } from './snapshot.js';

export const routes= new Router();

routes.use('/repository', internalApi);
routes.get('/repository', getRepository);
routes.post('/repository/:uuid', postRepository);

routes.use('/snapshot', internalApi);
routes.post('/snapshot/:uuid', postSnapshot);
