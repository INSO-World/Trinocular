import { dumpAllTables } from '../lib/database.js';

export function dbViewer(req, res) {
  const flag = process.env.ENABLE_DB_VIEWER;
  if (!flag || flag.trim().toLowerCase() !== 'true') {
    res.sendStatus(404);
    return;
  }

  const tables = dumpAllTables();
  res.render('db-viewer', { tables });
}
