import { filterIssuesByCreationDate } from './issue-utils.js';
import { dashboardDocument, createSelect, getControlValues, setChangeEventListener } from '/static/dashboard.js';
import { MilestoneLinesPlugin } from '/static/chart-plugins.js';

let oldControls = null;

export function processDataFromControlsForBurndownChart(data) {
  const { custom, common } = getControlValues();
  if (oldControls && (oldControls.custom === custom && oldControls.common === common)) {
    console.log('No change in controls');
    return { changed: false, data };
  }
  oldControls = { custom, common };

  const startDate = new Date(common.startDate);
  const endDate = new Date(common.endDate);

  if (startDate && endDate && startDate > endDate) {
    alert('Start date cannot be after end date');
  }

  const milestones = common.showMilestones ? common.milestones : [];
  let chartData = data.dayData;
  if (custom.timeControl === 'week') chartData = data.weekData;
  if (custom.timeControl === 'month') chartData = data.monthData;

  return {
    changed: true,
    data: filterIssuesByCreationDate(chartData, startDate, endDate),
    milestones
  };
}

function populateCustomControlContainer() {
  const container = dashboardDocument.getElementById('custom-controls');
  // Sort Selector
  const granularityOptions = [
    { label: 'Day', value: 'day', selected: true },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' }
  ];

  const granularityDiv = createSelect('timeControl', 'Time Granularity', granularityOptions, {}, []);

  // Append all elements to the container
  container.appendChild(granularityDiv);
}

export function setUpBurndownChartControls(fullData) {
  populateCustomControlContainer();

  setChangeEventListener(e => {
    if (e !== 'reset' && !e.target.validity.valid) return;
    let { data: curFilteredData, milestones, changed } = processDataFromControlsForBurndownChart(fullData);
    if (!changed) return;
    renderBurndownChart(curFilteredData, milestones);
  });
}

export function renderBurndownChart(issueData, milestoneData = []) {
  // Clear any existing chart
  const chartDiv = document.getElementById('chart');
  chartDiv.innerHTML = '';

  const canvas = document.createElement('canvas');
  chartDiv.appendChild(canvas);

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: issueData.map(row => row.date),
      datasets: [
        {
          label: 'Open Issues',
          data: issueData.map(row => row.open_issues),
          spanGaps: true, // Draw a line between points with null values
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 2,
          tension: 0.05, // Smooth line
          pointRadius: 4 // Normal radius for dots
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        'milestone-lines': {
          milestones: milestoneData,
          lineColor: 'rgba(255,67,83,0.54)',
          lineWidth: 2,
          showLabels: true,
          labelFont: '12px Arial',
          labelColor: 'rgba(255,67,83,0.54)'
        },
        title: {
          display: true,
          text: 'Burndown Chart'
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            parser: 'YYYY-MM-DD',       // Tells Chart.js how to parse the input data strings
            displayFormats: {
              day: 'YYYY-MM-DD'         // How to display the ticks on the x-axis
            },
            unit: 'day'                 // The unit for the axis
          },
          title: {
            display: true,
            text: 'Date'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Open Issues'
          },
          beginAtZero: true
        }
      }
    },
    plugins: [MilestoneLinesPlugin]
  });
}
