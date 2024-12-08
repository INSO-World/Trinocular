// TODO: Fetch data from service local database here, and tailor them finally for the visualization (main work should lie on the database query)

import { getDatasourceForRepositoryFromApiBridge } from '../lib/requests.js';
import { getIssuesFromDatabase } from '../lib/database.js';

export async function perIssue(req, res) {
  // TODO Validate req.query.repo
  // const { error, data } = await getDatasourceForRepositoryFromApiBridge('issues', req.query.repo);
  const data = await getIssuesFromDatabase(req.query.repo);
  console.table(data);
  res.json(data);
}
