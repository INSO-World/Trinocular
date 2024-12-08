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

export function setupPerIssueControls(fullData, repoDetails) {
  if (fullData.length >= 1) {
    console.log('repoDetails', repoDetails);
    initDateControls(
      new Date(repoDetails.created_at),
      new Date(repoDetails.updated_at) || new Date()
    );
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
      renderPerIssueChart(data);
    }
  });
}

export function renderPerIssueChart(data) {
  // Clear any existing chart
  const chartContainer = document.getElementById('chart');
  chartContainer.innerHTML = ''; // Remove previous chart instance

  // Convert time spent from seconds to hours
  data.forEach(d => {
    d.hours_spent = d.total_time_spent / 3600;
    d.time_estimate = d.time_estimate / 3600;
  });

  const canvas = document.createElement('canvas');
  chartContainer.appendChild(canvas);

  const labels = data.map(d => `Issue ${d.iid}`);
  const actualData = data.map(d => d.hours_spent);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Time spent',
        data: actualData,
        backgroundColor: 'rgba(54, 162, 235, 1)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };

  // Configure Chart.js options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          title: function (tooltipItems) {
            const issueIndex = tooltipItems[0].dataIndex;
            return data[issueIndex].title || `Issue ${data[issueIndex].id}`;
          },
          label: function (tooltipItem) {
            const timeSpent = tooltipItem.raw.toFixed(2);
            return `Time spent: ${timeSpent} h`;
          },
          afterLabel: function (tooltipItem) {
            const issueIndex = tooltipItem.dataIndex;
            const timeEstimate = data[issueIndex].time_estimate || '-';
            const createdAt = data[issueIndex].created_at;
            const formattedCreatedAt = new Date(createdAt).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            return [`Time Estimate: ${timeEstimate} h`, `Created at: ${formattedCreatedAt}`];
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Issues'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Hours'
        }
      }
    }
  };

  // Render the chart
  new Chart(canvas, {
    type: 'bar',
    data: chartData,
    options: chartOptions
  });
}
