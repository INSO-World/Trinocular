import { getBurndownChartData } from '../lib/database.js';
import { getDatasourceForRepositoryFromApiBridge } from '../lib/requests.js';

export async function loadIssuesFromDatabase(req, res) {
  const dayData = await getBurndownChartData(req.query.repo, 'day');
  const weekData = await getBurndownChartData(req.query.repo, 'week');
  const monthData = await getBurndownChartData(req.query.repo, 'month');
  res.json({ dayData, weekData, monthData });
}

export async function loadMilestonesFromApi(req, res) {
  // Fetch milestones from the api bridge
  const data = await getDatasourceForRepositoryFromApiBridge('milestones', req.query.repo);
  res.json(data);
}
