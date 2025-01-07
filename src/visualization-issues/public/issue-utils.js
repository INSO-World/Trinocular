export function filterIssuesByCreationDate(issueData, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return issueData.filter(issue => {
    const created = new Date(issue.date);
    return created >= start && created <= end;
  });
}

export function filterIssuesForIssueTimeline(issueData, startDate, endDate){
    const start = new Date(startDate);
    const end = new Date(endDate);

  return issueData.filter(issue => {
      const created = new Date(issue.created_at);
      const closed = new Date(issue.closed_at);
      return closed >= start && created <= end;
    }).map(issue => {
      const issueCopy = {...issue};
      const created = new Date(issue.created_at);
      const closed = new Date(issue.closed_at);

      // clip date range to current start and end control dates
      if (created < start) {
        issueCopy.created_at = start.toISOString();
      }
      if (closed > end) {
        issueCopy.closed_at = end.toISOString();
      }
      return issueCopy;
    });
}
