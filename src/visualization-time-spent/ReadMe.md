# Visualization Time Spent Service

## Description

The Visualization Time Spent Service provides visualizations which visualize the users time spent on
issues.

The following visualizations are provided:

- [Time spent per issue](#time-spent-per-issue)
- [Time spent per issue detail](#time-spent-per-issue-detail)
- [Time spent per user](#time-spent-per-user)

### Time spent per issue

This simple visualization takes issue data and visualizes it in a **bar chart**.

**Datasources**

- Issues

**Controls**

- Start/End Date Picker
- Sort by
  - Creation Date
  - Time spent

### Time spent per issue detail

This visualization builds upon the time spent per issue visualization and adds detailed information
about how much each user spent on an issue by combining information different datasources and
visualizing using a **stacked bar chart**.

**Datasources**

- Issues
- Members
- Timelogs

**Controls**

- Start/End Date Picker
- Sort by
  - Creation Date
  - Time spent

### Time spent per user

This visualization is a split view of two separate charts. The lower chart focuses on how much 
on average each user spent per on each:

- hour of the day
- day of the week
- calendar week in a year

The upper chart handles the cumulative time spent per user in the given timespan.

**Datasources**

- Issues
- Members
- Timelogs

**Controls**

- Start/End Date Picker (Only applies to cumulative chart)
- Time Granularity Picker
