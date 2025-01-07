import { Router } from 'express';

export const routes= new Router();

routes.get('/', (req, res) =>  res.end('Logs service') );
