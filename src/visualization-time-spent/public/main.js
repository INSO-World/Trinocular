import {baseURL, pageURL, visualizationName} from '/static/dashboard.js';
import {renderPerIssueChart, setupPerIssueControls} from "./per-issue-chart.js";
import {sortIssuesBy} from "./time-spent-utils.js";

// let fullData = []; // Store the full dataset
// let curFilteredData = []; // Store the data filtered
// let curSortOrder = 'created_at'; // Default sorting order is chronological

async function loadDataSet(visualization) {
  // Fetch to api bridge
  const repoUUID = pageURL.searchParams.get('repo');
  const response = await fetch(`${baseURL}data/${visualization}?repo=${repoUUID}`);
  return await response.json();
}

// Set up event listeners for controls
function setupVisualization(fullData, visualization) {
  if (visualization === 'per-issue') {
    // Initial default order:
    sortIssuesBy(fullData, 'created_at');

    renderPerIssueChart(fullData);
    setupPerIssueControls(fullData);
  }
}

function setTitle() {
  const subtitle = document.getElementById('vis-subtitle');
  subtitle.innerText = "Time Spent per Issue" // TODO set subtitle depending on visualization
}

// Set up event listeners for controls
function setupControls() {
  const parentDoc = window.parent.document;

  // Inject style sheet into parent document
  const style = document.createElement('style'); // TODO How to better inject css into parent doc
  style.textContent = ` 
    .custom-controls {
      padding-top: 15px;
    
      display: flex;
      flex-direction: column;
      gap: 30px;
    }
    
    .timespan-controls {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .timespan-controls > div {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .timespan-controls .date-buttons {
      display: flex;
      flex-direction: row;
      gap: 10px;
    }
    
    .sort {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  `;
  parentDoc.head.appendChild(style);

  // Sort Control Event Listener
  // parentDoc.getElementById('sort-control').addEventListener('change', (event) => {
  //   curSortOrder = event.target.value;
  //   sortData(curSortOrder);
  //   setupPerIssueBarChart(curFilteredData);
  // });
}

(async function() {
  const visualization = visualizationName || 'per-issue';
  let fullData = await loadDataSet(visualization);
  // curFilteredData = fullData;

  setTitle();
  // setupControls();
  // sortData(curSortOrder); // Sort initially based on the default order

  setupVisualization(fullData, visualization);
})();


