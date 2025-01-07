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
import {
  filterAndSortDataDetail,
  renderPerIssueDetailChart,
  setupPerIssueDetailControls
} from './per-issue-detailed-chart.js';
import {
  filterDataPerUser,
  renderPerUserChart,
  setupPerUserControls
} from './per-user-chart.js';

async function loadDataSet(visualization) {
  // Fetch to api bridge
  const repoUUID = pageURL.searchParams.get('repo');
  const response = await fetch(`${baseURL}data/${visualization}?repo=${repoUUID}`);
  return await response.json();
}

// Set up event listeners for controls
function setupVisualization(fullData, visualization) {
  if (visualization === 'per-issue') {
    setTitle('Time spent per Issue');
    // Initial default order:
    setupPerIssueControls(fullData);
    const { data, changed } = filterAndSortData(fullData);
    renderPerIssueChart(changed ? data : fullData);

  } else if(visualization === 'per-issue-detail') {
    setTitle('Time spent per Issue detailed')
    // Initial default order:
    setupPerIssueDetailControls(fullData);
    const { data, changed } = filterAndSortDataDetail(fullData);
    renderPerIssueDetailChart(changed ? data : fullData);

  } else if(visualization === 'per-user') {
    setTitle('Average time spent per selected cadence');
    console.log(fullData);
    setupPerUserControls(fullData);
    const { data } = filterDataPerUser(fullData);
    renderPerUserChart(data);
  }
}

/**
 *
 * @param {String} name
 */
function setTitle(name) {
  const subtitle = document.getElementById('vis-subtitle');
  subtitle.innerText = name;
}

(async function () {
  setCustomDashboardStylesheet('/custom-dashboard.css');

  const visualization = visualizationName || 'per-issue';
  let fullData = await loadDataSet(visualization);

  setTitle(visualization);

  setupVisualization(fullData, visualization);
})();
