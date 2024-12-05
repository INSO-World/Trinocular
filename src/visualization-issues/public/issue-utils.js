export function filterIssuesByCreationDate(issueData, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return issueData.filter(issue => {
    const created = new Date(issue.date);
    return created >= start && created <= end;
  });
}
