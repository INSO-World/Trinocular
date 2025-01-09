# Visualization Time Spent Service

## Description

The Issues Service provides visualizations which handle data from issues:

- [Burndown-chart](#burndown-chart)
- [Timeline-chart](#timeline-chart)

### Burndown chart

This visualization creates a burndown chart by taking the number of open issues over a timespan. It
uses a **line chart**.

**Datasources**

- Issues

**Controls**

- Start/End Date Picker
- Show-Milestones Checkbox (Loaded and manually added milestones)


### Issue Timeline chart

This visualization creates a Issue timeline graph by displaying when each Issue was opened and closed 
during the specified timeframe. It is implemented as a lying bar graph.

**Datasources**

- Issues

**Controls**

- Start/End Date Picker
- Show-Milestones Checkbox (Loaded and manually added milestones)


