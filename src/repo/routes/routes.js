
import { Routes } from 'express';
import { internalApi } from '../../common';
import { getRepository, postRepository } from './repository';
import { postSnapshot } from './snapshot';

export const routes= new Routes();

routes.use('/repository', internalApi);
routes.get('/repository', getRepository);
routes.post('/repository/:uuid', postRepository);

routes.use('/snapshot', internalApi);
routes.post('/snapshot/:uuid', postSnapshot);
