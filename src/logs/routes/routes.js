import { Router } from 'express';
import { protectedPage } from '../../auth-utils/index.js';
import { getViewerPage } from './viewer.js';

export const routes= new Router();

routes.get('/', (req, res) =>  res.end('Logs service') );
routes.get('/viewer', protectedPage, getViewerPage );
