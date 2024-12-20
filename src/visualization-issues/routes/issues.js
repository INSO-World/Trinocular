import { getBurndownChartData } from '../lib/database.js';

export async function loadIssuesFromDatabase(req, res) {
  const dayData = await getBurndownChartData(req.query.repo, 'day');
  const weekData = await getBurndownChartData(req.query.repo, 'week');
  const monthData = await getBurndownChartData(req.query.repo, 'month');
  res.json({ dayData, weekData, monthData });
}
