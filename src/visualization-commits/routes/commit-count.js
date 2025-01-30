import { getCommitData } from '../lib/database.js';

// Create function to be used in route to load the visualization data from the database
export async function loadCommitDataFromDatabase(req, res) {
  const commitData = await getCommitData(req.query.repo);

  res.json(commitData);
}
