import { Router } from 'express';
import { templateFile } from '../../common/template.js';
import { postSnapshot } from './api/snapshot.js';
import { loadDemoChartDataFromDatabase } from './demo-chart.js';
import {deleteRepositoryData} from "./api/delete.js";

export const routes = new Router();

const baseURL = `http://${process.env.HOST_BASE_NAME}/${process.env.SERVICE_NAME}`;
const indexPage = templateFile(import.meta.dirname + '/../views/index.template.html', { baseURL });

routes.get(['/', '/index.html'], (req, res) => res.type('html').send(indexPage));

routes.post('/api/snapshot/:uuid', postSnapshot);
routes.delete('/api/repository/:uuid', deleteRepositoryData);

// TODO: Add /data/* routes for the visualization data to make it available to the frontend
routes.get('/data/demo-chart', loadDemoChartDataFromDatabase);

