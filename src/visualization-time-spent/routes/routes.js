
import { Router } from 'express';
import { templateFile } from '../../common/template.js';
import {perIssue} from "./per-issue.js";
import {postSnapshot} from "./api/snapshot.js";

export const routes= new Router();

const baseURL= `http://${process.env.HOST_BASE_NAME}/${process.env.SERVICE_NAME}`;
const indexPage= templateFile( import.meta.dirname+ '/../views/index.template.html', {baseURL} );

routes.get(['/', '/index.html'], (req, res) => res.type('html').send(indexPage) );

routes.get('/data/per-issue', perIssue);

routes.post('/api/snapshot', postSnapshot);

