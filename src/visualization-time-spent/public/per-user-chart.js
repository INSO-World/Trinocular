import {
  createSelect,
  dashboardDocument,
  getControlValues,
  setChangeEventListener,
  initDateControls
} from '/static/dashboard.js';
import { filterIssuesByCreationDate, sortIssuesBy } from './time-spent-utils.js';

export function filterAndSortData(fullData) {
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

  const sortDiv = createSelect('sortControl', 'Sort by', sortOptions, {}, ['sort']);

  // Append all elements to the container
  container.appendChild(sortDiv);
}

export function setupPerIssueControls(fullData,repoDetails) {
  if (fullData.length >= 1){
    const endDate = repoDetails.updated_at ? new Date(repoDetails.updated_at) : new Date();
    initDateControls(new Date(repoDetails.created_at), endDate);
  }

  const customControlDiv = dashboardDocument.getElementById('custom-controls');
  populateCustomControlContainer(customControlDiv);

  setChangeEventListener(e => {
    console.log('Input', e.target || e, 'changed!');

    if (e !== 'reset' && !e.target?.validity.valid) {
      return;
    }

    const { data, changed } = filterAndSortData(fullData);
    if (changed) {
      renderPerUserChart(data);
    }
  });
}

export function renderPerUserChart(data) {
  // Clear any existing chart
  const chartContainer = document.getElementById('chart');
  chartContainer.innerHTML = ''; // Remove previous chart instance

  // Convert avg_time_spent from seconds to hours
  data.forEach(d => {
    d.avg_hours_spent = d.avg_time_spent / 3600;
  });

  // Extract unique hours and sort them
  const hours = Array.from(new Set(data.map(d => d.hour_of_day))).sort((a, b) => a - b);

  // Extract unique usernames
  const allUsernames = new Set(data.map(d => d.username));
  const usernames = Array.from(allUsernames);

  // For each user, create a dataset
  const datasets = usernames.map((username, index) => {
    // For each hour, find the entry for this user, or 0 if not present
    const userData = hours.map(hour => {
      const entry = data.find(d => d.hour_of_day === hour && d.username === username);
      return entry ? entry.avg_hours_spent : 0;
    });

    // Assign a color for each user (just for demonstration)
    const colorHue = (index * 60) % 360;
    const backgroundColor = `hsl(${colorHue}, 70%, 50%)`;
    const borderColor = `hsl(${colorHue}, 70%, 40%)`;

    return {
      label: username,
      data: userData,
      backgroundColor,
      borderColor,
      borderWidth: 1
    };
  });

  const canvas = document.createElement('canvas');
  chartContainer.appendChild(canvas);

  const chartData = {
    labels: hours.map(h => `${h}:00`), // Convert hour_of_day to a human-readable label
    datasets
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          title: function (tooltipItems) {
            // tooltipItems[0].label is something like "0:00", "1:00", etc.
            return `Hour of Day: ${tooltipItems[0].label}`;
          },
          label: function (tooltipItem) {
            const username = tooltipItem.dataset.label;
            const avgHours = tooltipItem.parsed.y.toFixed(2); // already in hours
            return `${username}: ${avgHours} h (avg)`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: 'Hour of Day'
        }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Average Hours Spent'
        }
      }
    }
  };

  new Chart(canvas, {
    type: 'bar',
    data: chartData,
    options: chartOptions
  });
}

