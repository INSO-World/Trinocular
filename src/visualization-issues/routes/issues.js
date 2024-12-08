import { getBurndownChartData } from '../lib/database.js';

export async function loadIssuesFromDatabase(req, res) {
  const data = await getBurndownChartData(req.query.repo);
  res.json(data);
}
