import {filterIssuesByCreationDate} from './issue-utils.js';
import { createInput, getControlValues, setChangeEventListener } from '/static/dashboard.js';

export function setUpBurndownChartControls(fullData) {
  let curFilteredData = fullData;
  const parentDoc = window.parent.document;
  const customControlDiv = parentDoc.getElementById('custom-controls');

  if (customControlDiv) {
    populateCustomControlContainer(customControlDiv)
  } else {
    console.error("'custom-controls' element not found.");
  }

  setChangeEventListener( e => {
    console.log('Input', e.target, 'changed!')
  });

  // Apply Timespan Event Listener
  parentDoc.getElementById('apply-timespan').onclick = () => {
    const { custom }= getControlValues();

    console.log( getControlValues() );

    const startDate = new Date(custom.startDate);
    const endDate = new Date(custom.endDate);

    if (startDate && endDate && startDate <= endDate) {
      curFilteredData = filterIssuesByCreationDate(curFilteredData, startDate, endDate);
      renderBurndownChart(curFilteredData);
    } else {
      alert('Please select a valid timespan.');
    }
  };

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

function populateCustomControlContainer( container ) {
  // Clear out the container first
  container.innerHTML= '';

  // Start Date Input
  const startDateDiv= createInput('date', 'startDate', 'Start Date');

  // End Date Input
  const endDateDiv= createInput('date', 'endDate', 'End Date');

  // Apply time-span Button
  const applyButton = document.createElement('button');
  applyButton.type= 'button';
  applyButton.id = 'apply-timespan';
  applyButton.textContent = 'Apply Timespan';

  // Reset time-span Button
  const resetButton = document.createElement('button');
  resetButton.type= 'button';
  resetButton.id = 'reset-timespan';
  resetButton.textContent = 'Reset Timespan';

  // Append all elements to the container
  container.appendChild(startDateDiv);
  container.appendChild(endDateDiv);
  container.appendChild(applyButton);
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
