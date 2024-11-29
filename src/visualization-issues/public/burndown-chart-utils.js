export function prepareDataForBurndownChart(issues) {
  return issues.map(issue => {
    return {
      date: issue.date,
      openIssues: issue.openIssues
    };
  });
}

// Helper function to format a date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Calculate the dynamic date range. This will be the range of dates from the first issue to today
export function getDynamicDateRange(data) {
  const startDate = new Date(data[data.length - 1].created_at);
  const endDate = new Date();
  const dates = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    dates.push(formatDate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

// Map rawData to a complete date range, skipping nulls entirely
export function mapDataToRange(data, dateRange) {
  const openIssuesByDate = new Map();
  dateRange.forEach(date => openIssuesByDate.set(date, 0));

  // Process each issue
  for (const issue of data) {
    const creationDate = new Date(issue.created_at);
    const closeDate = issue.closed_at ? new Date(issue.closed_at) : new Date();

    // Increment the open issues count for each day the issue is open
    for (let d = new Date(creationDate); d <= closeDate; d.setDate(d.getDate() + 1)) {
      const dateKey = formatDate(d);
      if (openIssuesByDate.has(dateKey)) {
        openIssuesByDate.set(dateKey, openIssuesByDate.get(dateKey) + 1);
      }
    }
  }

  // Convert the map into an array of objects with { date, openIssues }
  return Array.from(openIssuesByDate.entries()).map(([date, openIssues]) => ({
    date,
    openIssues
  }));
}
