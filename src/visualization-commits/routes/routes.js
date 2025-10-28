import { Router } from 'express';
import { templateFile } from '../../common/template.js';
import { postSnapshot } from './api/snapshot.js';
import { loadCommitDataFromDatabase } from './commit-count.js';
import { deleteRepositoryData } from './api/delete.js';
import { flagIsSet } from '../../common/index.js';

export const routes = new Router();

const publicProtocol = flagIsSet('PUBLIC_HTTPS') ? 'https' : 'http';
const baseURL = `${publicProtocol}://${process.env.HOST_BASE_NAME}/${process.env.SERVICE_NAME}`;
const indexPage = templateFile(import.meta.dirname + '/../views/index.template.html', { baseURL });

routes.get(['/', '/index.html'], (req, res) => res.type('html').send(indexPage));

routes.post('/api/snapshot/:uuid', postSnapshot);

routes.delete('/api/repository/:uuid', deleteRepositoryData);
routes.get('/data/commits-per-person-chart', loadCommitDataFromDatabase);
