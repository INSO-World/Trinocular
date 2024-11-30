// TODO: Fetch data from service local database here, and tailor them finally for the visualization (main work should lie on the database query)

import {getDynamicDateRange, mapDataToRange} from '../lib/burndown-chart-utils.js';

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

export function rawIssues(req, res) {
  const issueData = [
    {
      id: 8,
      title: "Fix caching issue for user sessions",
      labels: ["bug", "performance"],
      created_at: "2024-01-08T14:00:00Z",
      closed_at: "2024-01-14T12:00:00Z",
      time_estimate: 360, // In minutes (6 hours)
      total_time_spent: 400,
      human_total_time_spent: "6 hours 40 minutes"
    },
    {
      id: 7,
      title: "Integrate new payment gateway",
      labels: ["payment", "enhancement"],
      created_at: "2024-01-07T10:20:00Z",
      closed_at: null, // Still open
      time_estimate: 1920, // In minutes (32 hours)
      total_time_spent: null,
      human_total_time_spent: null
    },
    {
      id: 6,
      title: "Fix UI alignment issue",
      labels: ["UI", "bug"],
      created_at: "2024-01-06T11:45:00Z",
      closed_at: "2024-01-07T18:10:00Z",
      time_estimate: 120, // In minutes (2 hours)
      total_time_spent: 150,
      human_total_time_spent: "2 hours 30 minutes"
    },
    {
      id: 5,
      title: "Write unit tests for new features",
      labels: ["testing", "high-priority"],
      created_at: "2024-11-05T08:00:00Z",
      closed_at: "2024-11-12T17:20:00Z",
      time_estimate: 720, // In minutes (12 hours)
      total_time_spent: 750,
      human_total_time_spent: "12 hours 30 minutes"
    },
    {
      id: 4,
      title: "Refactor backend APIs",
      labels: ["refactor", "backend"],
      created_at: "2024-11-04T09:15:00Z",
      closed_at: null, // Still open
      time_estimate: 1440, // In minutes (24 hours)
      total_time_spent: null,
      human_total_time_spent: null
    },
    {
      id: 3,
      title: "Update user profile page",
      labels: ["UI", "medium-priority"],
      created_at: "2024-11-03T14:30:00Z",
      closed_at: "2024-11-10T09:00:00Z",
      time_estimate: 600, // In minutes (10 hours)
      total_time_spent: 580,
      human_total_time_spent: "9 hours 40 minutes"
    },
    {
      id: 2,
      title: "Add search functionality",
      labels: ["enhancement"],
      created_at: "2024-11-02T12:00:00Z",
      closed_at: "2024-11-08T16:45:00Z",
      time_estimate: 960, // In minutes (16 hours)
      total_time_spent: 1020,
      human_total_time_spent: "17 hours"
    },
    {
      id: 1,
      title: "Fix login bug",
      labels: ["bug", "critical"],
      created_at: "2024-11-01T10:00:00Z",
      closed_at: "2024-11-04T15:30:00Z",
      time_estimate: 480, // In minutes (8 hours)
      total_time_spent: 420,
      human_total_time_spent: "7 hours"
    }
  ]
  const dataRange = getDynamicDateRange(issueData);
  const filledData = mapDataToRange(issueData, dataRange);
  res.json(filledData);
}
