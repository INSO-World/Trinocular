import {filterIssuesByCreationDate} from './issue-utils.js';
import {
  createInput,
  getControlValues,
  setChangeEventListener,
  setControlValues
} from '/static/dashboard.js';

function processDataFromControls(data, controls) {
  const {custom, common} = controls;
  const startDate = new Date(custom.startDate);
  const endDate = new Date(custom.endDate);
  console.log('custom', custom);
  console.log('common', common);

  if (startDate && endDate && startDate <= endDate) {
    return {changed: true, data: filterIssuesByCreationDate(data, startDate, endDate)};
  }

  return {changed: false, data};
}

export function setUpBurndownChartControls(fullData) {
  let curFilteredData = fullData;
  const parentDoc = window.parent.document;
  const customControlDiv = parentDoc.getElementById('custom-controls');

  if (customControlDiv) {
    populateCustomControlContainer(customControlDiv, fullData);
  } else {
    console.error("'custom-controls' element not found.");
  }

  setChangeEventListener(e => {
    if (!e.target.validity.valid) return;
    const controls = getControlValues();
    let {data: curFilteredData, changed} = processDataFromControls(fullData, controls);
    if (!changed) return;
    renderBurndownChart(curFilteredData);
  });

  // Reset Timespan Event Listener
  parentDoc.getElementById('reset-timespan').onclick = () => {
    const {custom: controls} = getControlValues();
    controls.startDate = fullData[0].date;
    controls.endDate = fullData[fullData.length - 1].date;
    setControlValues({custom: controls});
    curFilteredData = fullData;
    renderBurndownChart(curFilteredData);
  };
}

function populateCustomControlContainer(container, data) {
  // Clear out the container first
  container.innerHTML = '';

  // Start Date Input
  const startDateDiv = createInput('date', 'startDate', 'Start Date', {
    value: data[0].date,
    min: data[0].date,
    max: data[data.length - 1].date
  });

  // End Date Input
  const endDateDiv = createInput('date', 'endDate', 'End Date', {
    value: data[data.length - 1].date,
    min: data[0].date,
    max: data[data.length - 1].date
  });

  // Reset time-span Button
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.id = 'reset-timespan';
  resetButton.textContent = 'Reset Timespan';

  // Append all elements to the container
  container.appendChild(startDateDiv);
  container.appendChild(endDateDiv);
  container.appendChild(resetButton);
}

export function renderBurndownChart(issueData) {
  // Clear any existing chart
  const chartDiv = document.getElementById("chart");
  chartDiv.innerHTML = "";

  const canvas = document.createElement("canvas");
  chartDiv.appendChild(canvas);

  new Chart(
    canvas, {
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
      }
    })
}
