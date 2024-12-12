import { getIssuesFromDatabase } from '../lib/database.js';

import { validate as uuidValidate, version as uuidVersion } from 'uuid';

export async function perIssue(req, res) {
  const repoUUID = req.query.repo;

  if (!uuidValidate(repoUUID) || uuidVersion(repoUUID) !== 4) {
    return res.status(400).json({ error: 'Invalid repo parameter. Must be a valid UUID v4.' });
  }

  console.log(`Get per issue data from database for ${repoUUID}`);
  try {
    const data = await getIssuesFromDatabase(repoUUID);
    console.table(data);
    res.json(data);
  } catch (err) {
    console.error('Error fetching issues:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
