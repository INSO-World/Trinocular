import {
  baseURL,
  pageURL,
  visualizationName,
  setCustomDashboardStylesheet
} from '/static/dashboard.js';
import {
  filterAndSortData,
  renderPerIssueChart,
  setupPerIssueControls
} from './per-issue-chart.js';
import { sortIssuesBy } from './time-spent-utils.js';

// let fullData = []; // Store the full dataset
// let curFilteredData = []; // Store the data filtered
// let curSortOrder = 'created_at'; // Default sorting order is chronological

async function loadDataSet(visualization) {
  // Fetch to api bridge
  const repoUUID = pageURL.searchParams.get('repo');
  const response = await fetch(`${baseURL}data/${visualization}?repo=${repoUUID}`);
  return await response.json();
}

async function loadRepoDetails() {
  // Fetch to api bridge
  const repoUUID = pageURL.searchParams.get('repo');
  const response = await fetch(`${baseURL}data/repo-details?repo=${repoUUID}`);
  return await response.json();
}

// Set up event listeners for controls
function setupVisualization(fullData, visualization, repoDetails) {
  if (visualization === 'per-issue') {
    // Initial default order:
    setupPerIssueControls(fullData, repoDetails);
    const { data, changed } = filterAndSortData(fullData);
    if (changed) {
      renderPerIssueChart(data);
    } else {
      renderPerIssueChart(fullData);
    }
  } else if(visualization === 'per-user') {
    console.table(fullData);
    // TODO further implement
  }
}

function setTitle() {
  const subtitle = document.getElementById('vis-subtitle');
  subtitle.innerText = 'Time Spent per Issue'; // TODO set subtitle depending on visualization
}

(async function () {
  setCustomDashboardStylesheet('/custom-dashboard.css');

  const visualization = visualizationName || 'per-issue';
  let fullData = await loadDataSet(visualization);
  const repoDetails = await loadRepoDetails();
  // curFilteredData = fullData;

  setTitle();
  // setupControls();
  // sortData(curSortOrder); // Sort initially based on the default order

  setupVisualization(fullData, visualization, repoDetails);
})();
