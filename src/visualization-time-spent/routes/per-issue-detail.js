import { getIssuesFromDatabase, getIssuesWithMemberInfoFromDatabase } from '../lib/database.js';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';

export async function perIssueDetail(req, res) {
  const repoUUID = req.query.repo;

  if (!uuidValidate(repoUUID)) {
    return res.status(400).json({ error: 'Invalid repo parameter. Must be a valid UUID' });
  }

  console.log(`Get per issue data with member information from database for ${repoUUID}`);
  try {
    const data = await getIssuesWithMemberInfoFromDatabase(repoUUID);
    // console.table(data);
    res.json(data);
  } catch (err) {
    console.error('Error fetching issues:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
