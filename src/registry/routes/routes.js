import { Router } from 'express';

import { internalApi } from '../../common/index.js';
import { deleteService, getService, putService } from './service.js';
import { broadcast } from './broadcast.js';
import { deleteNotify, postNotify } from './notify.js';
import { putPing } from './ping.js';

export const routes = Router();

routes.get('/', (req, res) => res.end('Registry Service\n'));

routes.use('/service', internalApi);

routes.route('/service/:serviceName').get(getService);

routes.route('/service/:serviceName/:hostname').put(putService).delete(deleteService);
routes.route('/service/:serviceName/:hostname/ping').put(putPing);

routes.all('/service/:serviceName/broadcast/*', broadcast);
// routes.all('/service/:serviceName/queue/*', queue);

routes
  .route('/service/:serviceName/notify/:subscriber/broadcast/*')
  .post((req, res) => postNotify('broadcast', req, res))
  .delete((req, res) => deleteNotify('broadcast', req, res));

// routes.route('/service/:name/notify/:subscriber/queue/*')
//   .post( (req, res) => postNotify('queue', req, res) )
//   .delete( (req, res) => deleteNotify('queue', req, res) );
