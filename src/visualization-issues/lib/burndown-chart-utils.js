// Helper function to format a date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Calculate the dynamic date range. This will be the range of dates from the first issue to today
export function getDynamicDateRange(data, repo) {
  const startDate = new Date(repo.created_at);
  const endDate = repo.updated_at ? new Date(repo.updated_at) : new Date();
  const dates = [];
  let currentDate = startDate;
  endDate.setHours(23, 59, 59, 99);

  while (currentDate <= endDate) {
    dates.push(formatDate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

function isLastDayOfMonth(date) {
  const dateObj = new Date(date);
  const nextDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1);
  return nextDay.getDate() === 1;
}

function isLastDayOfWeek(date) {
  const dateObj = new Date(date);
  return dateObj.getDay() === 0; // Sunday is index 0
}

function parseMapToArray(issueMap) {
  return Array.from(issueMap.entries()).map(([date, { openIssues, open_issues_info }]) => ({
    date,
    openIssues,
    open_issues_info
  }));
}

// Map rawData to a complete date range, skipping nulls entirely
export function mapDataToRange(data, dateRange) {
  const openIssuesByDate = new Map();
  dateRange.forEach(date => openIssuesByDate.set(date, { openIssues: 0, open_issues_info: {} }));

  // Process each issue
  for (const issue of data) {
    const creationDate = new Date(issue.created_at);
    const closeDate = issue.closed_at ? new Date(issue.closed_at) : new Date();
    closeDate.setHours(23, 59, 59, 99);
    const closeDateKey = formatDate(closeDate);

    // Increment the open issues count for each day the issue is open
    for (let d = new Date(creationDate); d <= closeDate; d.setDate(d.getDate() + 1)) {
      const dateKey = formatDate(d);
      if (openIssuesByDate.has(dateKey)) {
        if (issue.closed_at && dateKey === closeDateKey) continue;
        if (!openIssuesByDate.get(dateKey).open_issues_info[issue.id]) {
          openIssuesByDate.get(dateKey).open_issues_info[issue.id] = {
            name: issue.title,
            total_time_spent: issue.human_total_time_spent || 0
          };
        }
        openIssuesByDate.get(dateKey).openIssues += 1;
      }
    }
  }
  const weeklyOpenIssues = new Map();
  const monthlyOpenIssues = new Map();
  for (const [date, { openIssues, open_issues_info }] of openIssuesByDate.entries()) {
    if (isLastDayOfWeek(date)) {
      weeklyOpenIssues.set(date, { openIssues, open_issues_info });
    }
    if (isLastDayOfMonth(date)) {
      monthlyOpenIssues.set(date, { openIssues, open_issues_info });
    }
  }

  // Convert the map into an array of objects with { date, openIssues, open_issues_info }
  const dailyData = parseMapToArray(openIssuesByDate);
  const weeklyData = parseMapToArray(weeklyOpenIssues);
  const monthlyData = parseMapToArray(monthlyOpenIssues);

  return { dailyData, weeklyData, monthlyData };
}
