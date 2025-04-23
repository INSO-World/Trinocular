import { getBurndownChartData, getTimelineChartData } from '../lib/database.js';

export async function loadOpenIssuesFromDatabase(req, res) {
  const dayData = await getBurndownChartData(req.query.repo, 'day');
  const weekData = await getBurndownChartData(req.query.repo, 'week');
  const monthData = await getBurndownChartData(req.query.repo, 'month');
  res.json({ dayData, weekData, monthData });
}

export async function loadIssuesFromDatabase(req, res) {
  const issues = await getTimelineChartData(req.query.repo);

  res.json({ issues });
}
