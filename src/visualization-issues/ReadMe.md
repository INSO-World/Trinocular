# Visualization Issue Service

## Description

The Issues Service provides visualizations which handle data from issues:

- [Burndown-chart](#burndown-chart)
- [Timeline-chart](#issue-timeline-chart)

### Burndown chart

This visualization creates a burndown chart by taking the number of open issues over a timespan. It
uses a **line chart**.

**Datasource's**

- Issues

**Controls**

- Start/End Date Picker
- Show-Milestones Checkbox (Loaded and manually added milestones)

### Issue Timeline chart

This visualization creates an Issue timeline graph by displaying when each Issue was opened and
closed during the specified timeframe. It is implemented as a lying bar graph.

**Datasource's**

- Issues

**Controls**

- Start/End Date Picker
- Show-Milestones Checkbox (Loaded and manually added milestones)


