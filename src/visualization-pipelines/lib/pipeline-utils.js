function initializeDateRange(start, end) {
  const dateMap = {};
  let currentDate = new Date(start);
  while (currentDate <= end) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dateMap[dateKey] = { success: 0, failed: 0 };
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dateMap;
}

export function calculatePipelineStatus(pipelines, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Step 1: Group pipelines by branch
  const pipelinesByBranch = pipelines.reduce((acc, pipeline) => {
    const branch = pipeline.ref || 'unknown';
    if (!acc[branch]) acc[branch] = [];
    acc[branch].push(pipeline);
    return acc;
  }, {});

  // Step 2: Calculate daily success/failure counts for each branch
  const branchDailyStats = {};
  for (const [branch, branchPipelines] of Object.entries(pipelinesByBranch)) {
    const dailyStats = initializeDateRange(start, end);

    branchPipelines.forEach((pipeline) => {
      const pipelineDate = new Date(pipeline.updated_at).toISOString().split('T')[0];
      if (dailyStats[pipelineDate]) {
        if (pipeline.status === 'success') dailyStats[pipelineDate].success++;
        if (pipeline.status === 'failed') dailyStats[pipelineDate].failed++;
      }
    });

    branchDailyStats[branch] = dailyStats;
  }

  // Step 3: Sum up across branches for overall daily stats
  const overallDailyStats = initializeDateRange(start, end);
  for (const dailyStats of Object.values(branchDailyStats)) {
    for (const [date, counts] of Object.entries(dailyStats)) {
      overallDailyStats[date].success += counts.success;
      overallDailyStats[date].failed += counts.failed;
    }
  }

  return { ...branchDailyStats, '#overall': overallDailyStats };
}
