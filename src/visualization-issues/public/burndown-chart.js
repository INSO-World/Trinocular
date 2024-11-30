import {filterIssuesByCreationDate} from './issue-utils.js';

export function setUpBurndownChartControls(fullData) {
  let curFilteredData = fullData;
  const parentDoc = window.parent.document;
  const customControlDiv = parentDoc.getElementById('custom-controls');

  if (customControlDiv) {
    customControlDiv.innerHTML = createControlContainer().innerHTML;
  } else {
    console.error("'custom-controls' element not found.");
  }

  // Apply Timespan Event Listener
  parentDoc.getElementById('apply-timespan').onclick = () => {
    const startDate = new Date(parentDoc.getElementById('start-date').value);
    const endDate = new Date(parentDoc.getElementById('end-date').value);

    if (startDate && endDate && startDate <= endDate) {
      curFilteredData = filterIssuesByCreationDate(curFilteredData, startDate, endDate);
      renderBurndownChart(curFilteredData);
    } else {
      alert('Please select a valid timespan.');
    }
  };

  // Reset Timespan Event Listener
  parentDoc.getElementById('reset-timespan').onclick = () => {
    parentDoc.getElementById('start-date').value = '';
    parentDoc.getElementById('end-date').value = '';
    // Reset to full data and preserve the current sorting order
    curFilteredData = fullData;
    renderBurndownChart(curFilteredData);
  };
}

function createControlContainer() {
  const container = document.createElement('div');
  container.id = 'custom-controls';

  // Start Date Input
  const startDateDiv = document.createElement('div');
  const startLabel = document.createElement('label');
  startLabel.setAttribute('for', 'start-date');
  startLabel.textContent = 'Start Date:';
  const startInput = document.createElement('input');
  startInput.type = 'date';
  startInput.id = 'start-date';
  startDateDiv.appendChild(startLabel);
  startDateDiv.appendChild(startInput);

  // End Date Input
  const endDateDiv = document.createElement('div');
  const endLabel = document.createElement('label');
  endLabel.setAttribute('for', 'end-date');
  endLabel.textContent = 'End Date:';
  const endInput = document.createElement('input');
  endInput.type = 'date';
  endInput.id = 'end-date';
  endDateDiv.appendChild(endLabel);
  endDateDiv.appendChild(endInput);

  // Apply Timespan Button
  const applyButton = document.createElement('button');
  applyButton.id = 'apply-timespan';
  applyButton.textContent = 'Apply Timespan';

  // Reset Timespan Button
  const resetButton = document.createElement('button');
  resetButton.id = 'reset-timespan';
  resetButton.textContent = 'Reset Timespan';

  // Append all elements to the container
  container.appendChild(startDateDiv);
  container.appendChild(endDateDiv);
  container.appendChild(applyButton);
  container.appendChild(resetButton);

  return container;
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
            data: issueData.map(row => row.openIssues),
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
