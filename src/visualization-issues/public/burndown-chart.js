import { filterIssuesByCreationDate } from './issue-utils.js';
import { setMilestones, getControlValues, initDateControls, setChangeEventListener } from '/static/dashboard.js';
import { MilestoneLinesPlugin } from '/static/chart-plugins.js';

let oldControls = null;

export function processDataFromControls(data) {
  const { custom, common } = getControlValues();
  oldControls = oldControls || { custom, common };
  if (oldControls.custom === custom && oldControls.common === common) {
    console.log('No change in controls');
    return { changed: false, data };
  }

  const startDate = new Date(common.startDate);
  const endDate = new Date(common.endDate);

  if (startDate && endDate && startDate > endDate) {
    alert('Start date cannot be after end date');
  }

  const milestones = common.showMilestone ? common.milestones : [];

  return {
    changed: true,
    data: filterIssuesByCreationDate(data, startDate, endDate),
    milestones
  };
}

export function setUpBurndownChartControls(fullData,milestones) {
  if (fullData.length >= 1) {
    initDateControls(fullData[0].date, fullData[fullData.length - 1].date);
  }
  setMilestones(milestones);

  setChangeEventListener(e => {
    if (e !== 'reset' && !e.target.validity.valid) return;
    let { data: curFilteredData, milestones, changed } = processDataFromControls(fullData);
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
