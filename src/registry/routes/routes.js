import { Router } from 'express';

import { internalApi } from '../../common/index.js';
import { deleteService, getService, postService, putService } from './service.js';
import { broadcast } from './broadcast.js';
import { deleteNotify, postNotify } from './notify.js';

export const routes = Router();

routes.get('/', (req, res) => res.end('Registry Service\n'));

routes.use('/service', internalApi);

routes.route('/service/:name').get(getService).post(postService);

routes.route('/service/:name/:id').put(putService).delete(deleteService);

routes.all('/service/:name/broadcast/*', broadcast);
// routes.all('/service/:name/queue/*', queue);

routes
  .route('/service/:name/notify/:subscriber/broadcast/*')
  .post((req, res) => postNotify('broadcast', req, res))
  .delete((req, res) => deleteNotify('broadcast', req, res));

// routes.route('/service/:name/notify/:subscriber/queue/*')
//   .post( (req, res) => postNotify('queue', req, res) )
//   .delete( (req, res) => deleteNotify('queue', req, res) );
