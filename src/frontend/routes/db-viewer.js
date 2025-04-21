import { flagIsSet } from '../../common/index.js';
import { dumpAllTables } from '../lib/database.js';

export function dbViewer(req, res) {
  if (!flagIsSet('ENABLE_DB_VIEWER')) {
    res.sendStatus(404);
    return;
  }

  const tables = dumpAllTables();
  res.render('db-viewer', { tables });
}
