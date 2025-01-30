import {
  createSelect,
  dashboardDocument,
  getControlValues,
  setChangeEventListener
} from '/static/dashboard.js';
import { filterIssuesByCreationDate, sortIssuesBy } from './time-spent-utils.js';

export function filterAndSortDataDetail(fullData) {
  const {
    common,
    custom: { sortControl }
  } = getControlValues();

  const startDate = new Date(common.startDate);
  const endDate = new Date(common.endDate);
  if (!startDate || !endDate || startDate > endDate) {
    return { changed: false };
  }

  const filtered = filterIssuesByCreationDate(fullData, startDate, endDate);
  sortIssuesBy(filtered, sortControl);

  return { changed: true, data: filtered };
}

function populateCustomControlContainer(container) {
  // Sort Selector
  const sortOptions = [
    { label: 'Chronological', value: 'created_at', selected: true },
    { label: 'Time Spent (Ascending)', value: 'time_spent' }
  ];

  const sortDiv = createSelect('sortControl', 'Sort by', sortOptions, {}, [
    'dashboard-control',
    'sort'
  ]);

  // Append all elements to the container
  container.appendChild(sortDiv);
}

export function setupPerIssueDetailControls(fullData) {
  const customControlDiv = dashboardDocument.getElementById('custom-controls');
  populateCustomControlContainer(customControlDiv);

  setChangeEventListener(e => {
    if (e instanceof Event && !e.target?.validity?.valid) {
      return;
    }

    const { data, changed } = filterAndSortDataDetail(fullData);
    if (changed) {
      renderPerIssueDetailChart(data);
    }
  });
}

export function renderPerIssueDetailChart(data) {
  // Clear any existing chart
  const chartContainer = document.getElementById('chart-top');
  chartContainer.innerHTML = ''; // Remove previous chart instance

  // Convert per-user time_spent from seconds to hours
  data.forEach(issue => {
    issue.user_data.forEach(user => {
      user.hours_spent = user.time_spent / 3600;
    });
  });

  // Extract a unique list of names across all issues
  const allNames = new Set();
  data.forEach(issue => {
    issue.user_data.forEach(user => allNames.add(user.name));
  });
  const names = Array.from(allNames).sort();

  // Create chart labels for each issue
  const labels = data.map(d => `Issue ${d.iid}`);

  // Create one dataset per user
  const datasets = names.map((name, index) => {
    const userIssueData = data.map(issue => {
      const userEntry = issue.user_data.find(u => u.name === name);
      return userEntry ? userEntry.hours_spent : 0;
    });

    // Generate a color based on the dataset index
    const colorHue = (index * 60) % 360;
    const backgroundColor = `hsl(${colorHue}, 70%, 50%)`;
    const borderColor = `hsl(${colorHue}, 70%, 40%)`;

    return {
      label: name,
      data: userIssueData,
      backgroundColor,
      borderColor,
      borderWidth: 1
    };
  });

  const canvas = document.createElement('canvas');
  chartContainer.appendChild(canvas);

  // Prepare the chart data object
  const chartData = {
    labels,
    datasets
  };

  // Configure Chart.js options for a stacked bar chart
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          title: function (tooltipItems) {
            const issueIndex = tooltipItems[0].dataIndex;
            return data[issueIndex].title || `Issue ${data[issueIndex].iid}`;
          },
          label: function (tooltipItem) {
            const timeSpent = tooltipItem.raw.toFixed(2);
            const userLabel = tooltipItem.dataset.label;
            return `${userLabel}: ${timeSpent} h`;
          },
          afterLabel: function (tooltipItem) {
            const issueIndex = tooltipItem.dataIndex;
            const createdAt = data[issueIndex].created_at;
            const formattedCreatedAt = new Date(createdAt).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });

            const totalHours = (data[issueIndex].total_time_spent / 3600).toFixed(2);
            return [`Total Time Spent: ${totalHours} h`, `Created at: ${formattedCreatedAt}`];
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: 'Issues'
        }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Hours'
        }
      }
    }
  };

  // Render the stacked bar chart
  new Chart(canvas, {
    type: 'bar',
    data: chartData,
    options: chartOptions
  });
}
