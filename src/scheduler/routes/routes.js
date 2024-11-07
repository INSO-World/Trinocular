import { Router } from 'express';
import { internalApi } from '../../common/index.js';
import { notifyVisualization } from './registry.js';
import { getSchedules, postSchedule } from './schedules.js';
import { getTasks, postTask, postTaskCallback } from './task.js';

export const routes= new Router();

routes.get('/', (req, res) => res.end('Scheduler Service\n') );

routes.post('/registry/notify', internalApi, notifyVisualization);

routes.get('/schedule', internalApi, getSchedules);
routes.post('/schedule', internalApi, postSchedule);

routes.get('/task', internalApi, getTasks);
routes.post('/task/', internalApi, postTask);
routes.post('/task/:transactionId/callback/:caller', internalApi, postTaskCallback);
