import {
  getDailyAvgTimelogFromDatabase,
  getHourlyAvgTimelogFromDatabase,
  getIssuesFromDatabase, getWeeklyAvgTimelogFromDatabase
} from '../lib/database.js';

import { validate as uuidValidate, version as uuidVersion } from 'uuid';

export async function perUser(req, res) {
  const repoUUID = req.query.repo;

  if (!uuidValidate(repoUUID)) {
    return res.status(400).json({ error: 'Invalid repo parameter. Must be a valid UUID.' });
  }

  console.log(`Get per user data from database for ${repoUUID}`);
  try {
    const hourlyData = await getHourlyAvgTimelogFromDatabase(repoUUID);
    const dailyData = await getDailyAvgTimelogFromDatabase(repoUUID);
    const weeklyData = await getWeeklyAvgTimelogFromDatabase(repoUUID);

    const responseData = {
      hourly: hourlyData,
      daily: dailyData,
      weekly: weeklyData
    };

    res.json(responseData);
  } catch (err) {
    console.error('Error fetching issues:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
