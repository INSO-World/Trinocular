import {getRepoDetailsFromDatabase} from '../lib/database.js';

export async function repoDetails(req, res) {
  const data = await getRepoDetailsFromDatabase(req.query.repo);
  res.json(data);
  console.log(data);
  console.log(req.query.repo);
}
