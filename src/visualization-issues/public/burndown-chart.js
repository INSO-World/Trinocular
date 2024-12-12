import { filterIssuesByCreationDate } from './issue-utils.js';
import { getControlValues, setChangeEventListener, initDateControls } from '/static/dashboard.js';
import { MilestoneLinesPlugin } from '/static/chart-plugins.js';

export function processDataFromControls(data) {
  const { custom, common } = getControlValues();
  const startDate = new Date(common.startDate);
  const endDate = new Date(common.endDate);

  if (startDate && endDate && startDate <= endDate) {
    return { changed: true, data: filterIssuesByCreationDate(data, startDate, endDate) };
  }

  return { changed: false, data };
}

export function setUpBurndownChartControls(fullData) {
  if (fullData.length >= 1) {
    initDateControls(fullData[0].date, fullData[fullData.length - 1].date);
  }

  setChangeEventListener(e => {
    if (e !== 'reset' && !e.target.validity.valid) return;
    let { data: curFilteredData, changed } = processDataFromControls(fullData);
    if (!changed) return;
    renderBurndownChart(curFilteredData);
  });
}

export function renderBurndownChart(issueData) {
  // Clear any existing chart
  const chartDiv = document.getElementById('chart');
  chartDiv.innerHTML = '';

  const canvas = document.createElement('canvas');
  chartDiv.appendChild(canvas);

  const milestoneData = [
    { date: '2024-11-15', title: 'Start Date' },
    { date: '2024-12-08', title: 'End Date' }
  ];

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
