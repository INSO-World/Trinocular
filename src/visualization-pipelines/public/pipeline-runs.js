import {
  createSelect,
  dashboardDocument,
  getControlValues,
  setChangeEventListener
} from '/static/dashboard.js';
import { MilestoneLinesPlugin } from '/static/chart-plugins.js';

export function setUPipelineRunsChartControls(data) {
  // Set up event listeners for controls
  setChangeEventListener(e => {
    if (e instanceof Event && !e.target?.validity?.valid) return;
    let {
      data: curFilteredData,
      milestones,
      changed
    } = processDataFromControlsForPipelineRunsChart(data);
    if (!changed) return;
    renderPipelineRunsChart(curFilteredData, milestones);
  });
}

let oldControls = null;

function filterPipelinesByDate(data, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return data.filter(item => {
    const currentDate = new Date(item.date);
    return currentDate >= start && currentDate <= end;
  });
}

export function processDataFromControlsForPipelineRunsChart(data) {
  const { custom, common } = getControlValues();
  if (oldControls && oldControls.custom === custom && oldControls.common === common) {
    return { changed: false, data };
  }
  oldControls = { custom, common };

  const startDate = new Date(common.startDate);
  const endDate = new Date(common.endDate);

  if (startDate && endDate && startDate > endDate) {
    alert('Start date cannot be after end date');
  }

  const milestones = common.showMilestones ? common.milestones : [];
  let branch = common.branch;
  if (branch !== '#overall') branch = branch.split('origin/')[1];
  let chartData = data[branch] || [];

  return {
    changed: true,
    data: filterPipelinesByDate(chartData, startDate, endDate),
    milestones
  };
}

export function renderPipelineRunsChart(curFilteredData, milestones) {
  // Clear any existing chart
  const chartDiv = document.getElementById('chart');
  chartDiv.innerHTML = '';

  const canvas = document.createElement('canvas');
  chartDiv.appendChild(canvas);

  const labels = curFilteredData.map(item => item.date);
  const successData = curFilteredData.map(item => item.success_count);
  const failedData = curFilteredData.map(item => item.failed_count);

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Successful',
          data: successData,
          backgroundColor: 'green'
        },
        {
          label: 'Failed',
          data: failedData,
          backgroundColor: 'red'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        'milestone-lines': {
          milestones: milestones,
          lineColor: 'rgba(255,67,83,0.54)',
          lineWidth: 2,
          showLabels: true,
          labelFont: '12px Arial',
          labelColor: 'rgba(255,67,83,0.54)'
        },
        title: {
          display: false,
          text: 'CI Pipeline Runs'
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            parser: 'YYYY-MM-DD', // Tells Chart.js how to parse the input data strings
            displayFormats: {
              day: 'YYYY-MM-DD' // How to display the ticks on the x-axis
            },
            unit: 'day' // The unit for the axis
          },
          title: {
            display: true,
            text: 'Date'
          }
        },
        y: {
          title: {
            display: true,
            text: 'CI Runs'
          },
          beginAtZero: true
        }
      }
    },
    plugins: [MilestoneLinesPlugin]
  });
}
