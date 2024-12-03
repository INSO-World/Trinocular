// TODO: Fetch data from service local database here, and tailor them finally for the visualization (main work should lie on the database query)

import {getDynamicDateRange, mapDataToRange} from '../lib/burndown-chart-utils.js';
import {getDatasourceForRepositoryFromApiBridge} from '../lib/requests.js';

export function allIssues(req, res) {
  res.json([
      {"date": "2024-01-01", "openIssues": 8},
      {"date": "2024-01-02", "openIssues": 7},
      {"date": "2024-01-03", "openIssues": 7},
      {"date": "2024-01-04", "openIssues": 6},
      {"date": "2024-01-05", "openIssues": 5},
      {"date": "2024-01-06", "openIssues": 5},
      {"date": "2024-01-07", "openIssues": 4},
      {"date": "2024-01-08", "openIssues": 3},
      {"date": "2024-01-09", "openIssues": 3},
      {"date": "2024-01-10", "openIssues": undefined},
      {"date": "2024-01-11", "openIssues": 2},
      {"date": "2024-01-12", "openIssues": 1},
      {"date": "2024-01-13", "openIssues": 1},
      {"date": "2024-01-14", "openIssues": 0}
    ]
  );
}

export async function rawIssues(req, res) {
  console.log(req.query);
  const issueData = await getDatasourceForRepositoryFromApiBridge('issues', req.query.repo);
  console.log(issueData);
  const dataRange = getDynamicDateRange(issueData);
  const filledData = mapDataToRange(issueData, dataRange);
  res.json(filledData);
}
