import { getDayTimelogWithMemberInfoFromDatabase, getIssuesFromDatabase } from '../lib/database.js';

import { validate as uuidValidate, version as uuidVersion } from 'uuid';

export async function perUser(req, res) {
  const repoUUID = req.query.repo;
  // const startDate = req.query.startDate;
  // const endDate = req.query.endDate;
  const startDate = '01-01-1990';
  const endDate = '01-01-2030';

  if (!uuidValidate(repoUUID)) {
    return res.status(400).json({ error: 'Invalid repo parameter. Must be a valid UUID.' });
  }

  //TODO validate timespan parameters

  console.log(`Get per user data from database for ${repoUUID} in time interval ${startDate} - ${endDate}`);
  try {
    const data = await getDayTimelogWithMemberInfoFromDatabase(repoUUID, startDate, endDate);
    console.table(data);
    res.json(data);
  } catch (err) {
    console.error('Error fetching issues:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
