import { Router } from 'express';
import { templateFile } from '../../common/template.js';
import { perIssue } from './per-issue.js';
import { postSnapshot } from './api/snapshot.js';
import { perIssueDetail } from './per-issue-detail.js';
import { perUser } from './per-user.js';
import { deleteRepository } from './api/delete.js';

export const routes = new Router();

const baseURL = `http://${process.env.HOST_BASE_NAME}/${process.env.SERVICE_NAME}`;
const indexPage = templateFile(import.meta.dirname + '/../views/index.template.html', { baseURL });

routes.get(['/', '/index.html'], (req, res) => res.type('html').send(indexPage));

routes.get('/data/per-issue', perIssue);
routes.get('/data/per-issue-detail', perIssueDetail);
routes.get('/data/per-user', perUser);

routes.delete('/api/:uuid', deleteRepository);

routes.post('/api/snapshot/:uuid', postSnapshot);
