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
import {
  filterAndSortDataDetail,
  renderPerIssueDetailChart,
  setupPerIssueDetailControls
} from './per-issue-detailed-chart.js';
import {
  filterAndSortDataPerUser,
  renderPerUserChart,
  setupPerUserControls
} from './per-user-chart.js';

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
    renderPerIssueChart(changed ? data : fullData);

  } else if(visualization === 'per-issue-detail') {
    // Initial default order:
    setupPerIssueDetailControls(fullData, repoDetails);
    const { data, changed } = filterAndSortDataDetail(fullData);
    renderPerIssueDetailChart(changed ? data : fullData);

  } else if(visualization === 'per-user') {
    console.log(fullData);
    setupPerUserControls(fullData);
    const { data } = filterAndSortDataPerUser(fullData);
    renderPerUserChart(data);
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

  setTitle();

  setupVisualization(fullData, visualization, repoDetails);
})();
