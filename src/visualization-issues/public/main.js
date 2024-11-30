// TODO: Fetch data (when scheduler tells the service) from the api bridge and store into a service local database
import {renderBurndownChart} from './burndown-chart.js';
import {filterIssuesByCreationDate} from './issue-utils.js';

const pageURL = new URL(window.location.href);
const baseURL = pageURL.origin + pageURL.pathname.replace('index.html', '');

let fullData = []; // Store the full dataset
let curFilteredData = []; // Store the data filtered


async function loadDataSet() {
  // Fetch to api bridge
  const source = pageURL.searchParams.get('show') || 'burndown-chart';
  const response = await fetch(`${baseURL}data/${source}`);
  return await response.json();
}

// Set up event listeners for controls
function setupControls() {
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


(async function () {
  fullData = await loadDataSet();
  curFilteredData = fullData;

  setupControls();

  renderBurndownChart(fullData);
})();
