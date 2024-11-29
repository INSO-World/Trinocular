import { Router } from 'express';
import { templateFile } from '../../common/template.js';
import {allIssues, rawIssues} from "./all-issues.js";

export const routes= new Router();

//TODO: Change before deployment
const baseURL= `http://localhost:8080/`;
// const baseURL= `http://${process.env.HOST_BASE_NAME}/${process.env.SERVICE_NAME}`;
const indexPage= templateFile( import.meta.dirname+ '/../views/index.template.html', {baseURL} );

routes.get(['/', '/index.html'], (req, res) => res.type('html').send(indexPage) );

routes.get('/data/burndown-chart', rawIssues);
