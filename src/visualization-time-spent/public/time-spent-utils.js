export function sortIssuesBy(data, sortOrder) {
  switch (sortOrder) {
    case 'time_spent':
      data.sort((a, b) => a.total_time_spent - b.total_time_spent);
      return;
    case 'created_at':
    default: // Fallback to chronological order
      data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      return;
  }
}

/**
 *
 * @param data
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {*}
 */
export function filterIssuesByCreationDate(data, startDate, endDate) {
  const start = startDate;
  const end = endDate;

  return data.filter(issue => {
    const created = new Date(issue.created_at);
    return created >= start && created <= end;
  });
}
