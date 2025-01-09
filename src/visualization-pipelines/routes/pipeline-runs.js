import { getPipelineRunsData } from '../lib/database.js';

export async function loadPipelineRunsFromDatabase(req, res) {
  const pipelineData = await getPipelineRunsData(req.query.repo);

  const groupedData = pipelineData.reduce((acc, { branch, date, success_count, failed_count }) => {
    if (!acc[branch]) acc[branch] = {};
    acc[branch][date] = { success_count, failed_count };
    return acc;
  }, {});

  res.json({ ...groupedData });
}
