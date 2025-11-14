import { Router } from 'express';
import { internalApi } from '../../common/index.js';
import { notifyVisualization } from './registry.js';
import {
  deleteSchedule,
  getScheduleByUuid,
  getSchedules,
  createOrUpdateSchedule,
  putSchedules
} from './schedules.js';
import { getTasks, postTask, postTaskCallback, getTaskByTransaction } from './task.js';

export const routes = new Router();

routes.get('/', (req, res) => res.end('Scheduler Service\n'));

routes.post('/registry/notify', internalApi, notifyVisualization);

routes
  .route('/schedule')
  .get(internalApi, getSchedules)
  .put(internalApi, putSchedules);
routes
  .route('/schedule/:uuid')
  .get(internalApi, getScheduleByUuid)
  .post(internalApi, createOrUpdateSchedule)
  .delete(internalApi, deleteSchedule)
  .put(internalApi, createOrUpdateSchedule);

routes.get('/task', internalApi, getTasks);
routes.get('/task/:transactionId', internalApi, getTaskByTransaction);
routes.post('/task', internalApi, postTask);
routes.post('/task/:transactionId/callback/:caller', internalApi, postTaskCallback);
