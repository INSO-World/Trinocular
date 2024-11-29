// TODO: Fetch data (when scheduler tells the service) from the api bridge and store into a service local database
import {renderBurndownChart} from './burndown-chart.js';
import {getDynamicDateRange, mapDataToRange} from './burndown-chart-utils.js';

const pageURL = new URL(window.location.href);
const baseURL = pageURL.origin + pageURL.pathname.replace('index.html', '');

let fullData = []; // Store the full dataset
let curFilteredData = []; // Store the data filtered
let curSortOrder = 'created_at'; // Default sorting order is chronological


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
    customControlDiv.appendChild(createControlContainer());
  } else {
    console.error("'custom-controls' element not found.");
  }

  // Apply Timespan Event Listener
  parentDoc.getElementById('apply-timespan').onclick = () => {
    const startDate = new Date(parentDoc.getElementById('start-date').value);
    const endDate = new Date(parentDoc.getElementById('end-date').value);

    if (startDate && endDate && startDate <= endDate) {
      filterDataByTimespan(startDate, endDate);
      renderPerIssueBarChart(curFilteredData);
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
    sortData(curSortOrder);
    renderPerIssueBarChart(curFilteredData);
  };

  // Sort Control Event Listener
  parentDoc.getElementById('sort-control').addEventListener('change', (event) => {
    curSortOrder = event.target.value;
    sortData(curSortOrder);
    renderPerIssueBarChart(curFilteredData);
  });
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

  // Sort Dropdown
  const sortDiv = document.createElement('div');
  const sortLabel = document.createElement('label');
  sortLabel.setAttribute('for', 'sort-control');
  sortLabel.textContent = 'Sort by';
  const sortSelect = document.createElement('select');
  sortSelect.id = 'sort-control';
  const createdOption = document.createElement('option');
  createdOption.value = 'created_at';
  createdOption.textContent = 'Chronological';
  const timeSpentAscOption = document.createElement('option');
  timeSpentAscOption.value = 'time_spent';
  timeSpentAscOption.textContent = 'Time Spent (Ascending)';
  sortSelect.appendChild(createdOption);
  sortSelect.appendChild(timeSpentAscOption);
  sortDiv.appendChild(sortLabel);
  sortDiv.appendChild(sortSelect);

  // Append all elements to the container
  container.appendChild(startDateDiv);
  container.appendChild(endDateDiv);
  container.appendChild(applyButton);
  container.appendChild(resetButton);
  container.appendChild(sortDiv);

  return container;
}

function filterDataByTimespan(startDate, endDate) {
  curFilteredData = fullData.filter(d => {
    const issueDate = new Date(d.created_at); // FIXME create issue class, avoid type errors
    return issueDate >= startDate && issueDate <= endDate;
  });
}

function sortData(sortOrder) {
  switch (sortOrder) {
    case 'time_spent':
      curFilteredData.sort((a, b) => a.total_time_spent - b.total_time_spent);
      break;
    case 'created_at':
    default: // Fallback to chronological order
      curFilteredData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
  }
}

(async function () {
  fullData = await loadDataSet();
  curFilteredData = fullData;

  setupControls();
  sortData(curSortOrder); // Sort initially based on the default order
  const dataRange = getDynamicDateRange(fullData);
  const filledData = mapDataToRange(fullData, dataRange);

  console.log('dataRange', dataRange);
  console.log('filledData', filledData);
  renderBurndownChart(filledData);
})();
