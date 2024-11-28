// TODO: Fetch data from service local database here, and tailor them finally for the visualization (main work should lie on the database query)

export function allIssues(req, res ) {
    res.json([
        { iid: 1, title: "Fix login bug", labels: ["bug", "urgent"], created_at: "2024-11-01T08:30:00Z", closed_at: null, time_estimate: 3600, total_time_spent: 7200, human_total_time_spent: "2 hours" },
        { iid: 2, title: "Improve dashboard UI", labels: ["UI", "enhancement"], created_at: "2024-11-02T10:15:00Z", closed_at: null, time_estimate: 10800, total_time_spent: 5400, human_total_time_spent: "1.5 hours" },
        { iid: 3, title: "Update database schema", labels: ["backend", "schema"], created_at: "2024-11-03T09:00:00Z", closed_at: "2024-11-05T12:30:00Z", time_estimate: null, total_time_spent: 10800, human_total_time_spent: "3 hours" },
        { iid: 4, title: "Optimize search algorithm", labels: ["performance", "search"], created_at: "2024-11-04T14:45:00Z", closed_at: null, time_estimate: 7200, total_time_spent: 3600, human_total_time_spent: "1 hour" },
        { iid: 5, title: "Write API documentation", labels: ["documentation", "API"], created_at: "2024-11-05T12:00:00Z", closed_at: "2024-11-06T15:00:00Z", time_estimate: 3600, total_time_spent: 1800, human_total_time_spent: "0.5 hours" },
        { iid: 6, title: "Fix mobile responsiveness", labels: ["bug", "mobile"], created_at: "2024-11-06T16:30:00Z", closed_at: "2024-11-07T11:00:00Z", time_estimate: null, total_time_spent: 7200, human_total_time_spent: "2 hours" },
        { iid: 7, title: "Refactor codebase", labels: ["refactor", "codebase"], created_at: "2024-11-07T11:00:00Z", closed_at: null, time_estimate: 7200, total_time_spent: 14400, human_total_time_spent: "4 hours" },
        { iid: 8, title: "Improve performance on high-load", labels: ["performance", "high-load"], created_at: "2024-11-08T15:20:00Z", closed_at: "2024-11-10T10:00:00Z", time_estimate: 10800, total_time_spent: 9000, human_total_time_spent: "2.5 hours" },
        { iid: 9, title: "Design new user onboarding", labels: ["UX", "onboarding"], created_at: "2024-11-09T09:40:00Z", closed_at: null, time_estimate: null, total_time_spent: 4500, human_total_time_spent: "1.25 hours" },
        { iid: 10, title: "Setup CI/CD pipeline", labels: ["devops", "CI/CD"], created_at: "2024-11-10T13:10:00Z", closed_at: "2024-11-11T15:45:00Z", time_estimate: 7200, total_time_spent: 3600, human_total_time_spent: "1 hour" },
        { iid: 11, title: "Add dark mode feature", labels: ["UI", "enhancement"], created_at: "2024-11-11T10:00:00Z", closed_at: null, time_estimate: 5400, total_time_spent: 5400, human_total_time_spent: "1.5 hours" },
        { iid: 12, title: "Fix pagination issue", labels: ["bug", "pagination"], created_at: "2024-11-12T13:20:00Z", closed_at: "2024-11-14T09:30:00Z", time_estimate: 7200, total_time_spent: 7200, human_total_time_spent: "2 hours" },
        { iid: 13, title: "Update backend API", labels: ["backend", "API"], created_at: "2024-11-13T09:45:00Z", closed_at: null, time_estimate: 10800, total_time_spent: 10800, human_total_time_spent: "3 hours" },
        { iid: 14, title: "Improve data export functionality", labels: ["data", "export"], created_at: "2024-11-14T11:30:00Z", closed_at: "2024-11-15T16:00:00Z", time_estimate: null, total_time_spent: 2700, human_total_time_spent: "0.75 hours" },
        { iid: 15, title: "Add password reset feature", labels: ["auth", "feature"], created_at: "2024-11-15T08:50:00Z", closed_at: null, time_estimate: 3600, total_time_spent: 4500, human_total_time_spent: "1.25 hours" },
        { iid: 16, title: "Optimize image loading", labels: ["performance", "images"], created_at: "2024-11-16T14:15:00Z", closed_at: "2024-11-17T10:20:00Z", time_estimate: 8100, total_time_spent: 8100, human_total_time_spent: "2.25 hours" },
        { iid: 17, title: "Integrate payment gateway", labels: ["payment", "integration"], created_at: "2024-11-17T09:00:00Z", closed_at: null, time_estimate: 14400, total_time_spent: 14400, human_total_time_spent: "4 hours" },
        { iid: 18, title: "Enhance security measures", labels: ["security", "enhancement"], created_at: "2024-11-18T16:10:00Z", closed_at: "2024-11-19T18:00:00Z", time_estimate: 10800, total_time_spent: 10800, human_total_time_spent: "3 hours" },
        { iid: 19, title: "Implement audit logging", labels: ["logging", "audit"], created_at: "2024-11-19T12:00:00Z", closed_at: null, time_estimate: 5400, total_time_spent: 5400, human_total_time_spent: "1.5 hours" },
        { iid: 20, title: "Test cross-browser compatibility", labels: ["testing", "compatibility"], created_at: "2024-11-20T15:40:00Z", closed_at: "2024-11-21T17:00:00Z", time_estimate: 7200, total_time_spent: 3600, human_total_time_spent: "1 hour" }
    ]);
}
