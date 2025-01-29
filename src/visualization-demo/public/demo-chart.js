import {
  createSelect,
  dashboardDocument,
  getControlValues,
  setChangeEventListener
} from '/static/dashboard.js';
import { MilestoneLinesPlugin } from '/static/chart-plugins.js';
/*
  * This file contains the code to render a demo chart.
 */


// TODO: Create controls only for this visualization
function populateCustomControlContainer() {
  const container = dashboardDocument.getElementById('custom-controls');
  // Sort Selector
  const granularityOptions = [
    { label: 'Day', value: 'day', selected: true },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' }
  ];

  // Note: Adding custom classes overrides the default class 'dashboard-control',
  // for coherent styling you need to add it back manually if you do not need full
  // custom styling
  const granularityDiv = createSelect('timeControl', 'Time Granularity', granularityOptions, {}, []);

  // Append all elements to the container
  container.appendChild(granularityDiv);
}

// TODO: Setup the demo chart controls
export function setUpDemoChartControls(data) {
  // Create the custom controls for the chart
  populateCustomControlContainer();

  // Set up event listeners for controls
  setChangeEventListener(e => {
    if (e instanceof Event && !e.target?.validity?.valid) return;
    let {
      data: curFilteredData,
      milestones,
      changed
    } = processDataFromControlsForDemoChart(data);
    if (!changed) return;
    renderDemoChart(curFilteredData, milestones);
  });
}

let oldControls = null;

// TODO: Change based on concrete object structure
function filterDemoByDate(data, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return data.filter(item => {
    const currentDate = new Date(item.date);
    return currentDate >= start && currentDate <= end;
  });
}

// TODO: Process the data from the controls for the demo chart
export function processDataFromControlsForDemoChart(data) {
  const { custom, common } = getControlValues();
  // Only update if the controls have changed
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

  // If chart can display milestones retrieve them
  const milestones = common.showMilestones ? common.milestones : [];

  // TODO: Create more complex logic to filter the data if needed
  // TODO: Update based on custom controls if existing

  return {
    changed: true,
    // Filter the data based on the date range
    data: filterDemoByDate(data, startDate, endDate),
    milestones
  };
}

// TODO: Render the demo chart
export function renderDemoChart(chartData, milestones) {
  // Clear any existing chart
  const chartDiv = document.getElementById('chart');
  chartDiv.innerHTML = '';

  const canvas = document.createElement('canvas');
  chartDiv.appendChild(canvas);

  // TODO: Update chart
  new Chart(canvas, {
    type: 'line',
    data: {
      // TODO: Update based on the data structure
      labels: chartData.map(row => row.date),
      datasets: [
        {
          label: 'Demo - Values',
          // TODO: Update based on the data structure
          data: chartData.map(row => row.value),
          spanGaps: true, // Draw a line between points with null values
          backgroundColor: 'rgba(54, 162, 235, 1)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
          tension: 0.05, // Smooth line
          pointRadius: 4 // Normal radius for dots
        }
      ]
    },
    options: {
      responsive: true,
      // TODO: Customize plugin options if needed
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
            text: 'Demo values'
          },
          beginAtZero: true
        }
      }
    },
    // TODO: Add plugins if needed
    plugins: [MilestoneLinesPlugin]
  });
}
