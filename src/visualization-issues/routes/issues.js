import { getBurndownChartData } from '../lib/database.js';
import { getDatasourceForRepositoryFromApiBridge } from '../lib/requests.js';

export async function loadIssuesFromDatabase(req, res) {
  const data = await getBurndownChartData(req.query.repo);
  res.json(data);
}

export async function loadMilestonesFromApi(req, res) {
  // Fetch milestones from the api bridge
  const data = await getDatasourceForRepositoryFromApiBridge('milestones', req.query.repo);
  res.json(data);
}
