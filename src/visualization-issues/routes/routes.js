import { Router } from 'express';
import { templateFile } from '../../common/template.js';
import { loadIssuesFromDatabase, loadOpenIssuesFromDatabase } from './issues.js';
import { postSnapshot } from './api/snapshot.js';
import { deleteRepositoryData } from './api/delete.js';
import { flagIsSet } from '../../common/index.js';

export const routes = new Router();

const publicProtocol = flagIsSet('PUBLIC_HTTPS') ? 'https' : 'http';
const baseURL = `${publicProtocol}://${process.env.HOST_BASE_NAME}/${process.env.SERVICE_NAME}`;
const indexPage = templateFile(import.meta.dirname + '/../views/index.template.html', { baseURL });

routes.get(['/', '/index.html'], (req, res) => res.type('html').send(indexPage));

routes.get('/data/burndown-chart', loadOpenIssuesFromDatabase);
routes.get('/data/timeline-chart', loadIssuesFromDatabase);

routes.delete('/api/repository/:uuid', deleteRepositoryData);
routes.post('/api/snapshot/:uuid', postSnapshot);
