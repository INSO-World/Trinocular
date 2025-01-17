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
import {
  filterAndSortCumulativeData,
  renderCumulativeTimelogChart, setupCumulativeTimelogControls
} from './cumulative-timelog-chart.js';

async function loadDataSet(visualization) {
  // Fetch to api bridge
  const repoUUID = pageURL.searchParams.get('repo');
  const response = await fetch(`${baseURL}data/${visualization}?repo=${repoUUID}`);
  return await response.json();
}

// Set up event listeners for controls
function setupVisualization(responseData, visualization) {

  if (visualization === 'per-issue') {
    setTitle('Time spent per Issue');
    const isSplitView = false;
    setChartVisibility(isSplitView);

    setupPerIssueControls(responseData);
    const { data, changed } = filterAndSortData(responseData);
    renderPerIssueChart(changed ? data : responseData);

  } else if(visualization === 'per-issue-detail') {
    setTitle('Time spent per Issue detailed');
    const isSplitView = false;
    setChartVisibility(isSplitView);

    setupPerIssueDetailControls(responseData);
    const { data, changed } = filterAndSortDataDetail(responseData);
    renderPerIssueDetailChart(changed ? data : responseData);


  } else if(visualization === 'per-user') {
    setTitle('Cumulative time spent', 'Average time spent per selected cadence');
    const isSplitView = true;
    setChartVisibility(isSplitView);

    const { cadenceData, cumulativeTimelogData } = responseData;

    setupCumulativeTimelogControls(cumulativeTimelogData);
    const { data: cumulativeData, changed } = filterAndSortCumulativeData(cumulativeTimelogData);
    renderCumulativeTimelogChart(changed ? cumulativeData : cumulativeTimelogData);

    setupPerUserControls(cadenceData);
    const { data } = filterDataPerUser(cadenceData);
    renderPerUserChart(data);
  }
}

/**
 *
 * @param {String} topChartName
 * @param {String} bottomChartName
 */
function setTitle(topChartName, bottomChartName = null) {
  const topSubtitle = document.getElementById('vis-top-subtitle');
  topSubtitle.innerText = topChartName;

  if (bottomChartName) {
    const bottomSubtitle = document.getElementById('vis-bottom-subtitle');
    bottomSubtitle.innerText = bottomChartName;
  }
}

function setChartVisibility(isSplitView = false) {
  const bottomSubtitle = document.getElementById("vis-bottom-subtitle");
  const topChart = document.getElementById("chart-top");
  const bottomChart = document.getElementById("chart-bottom");

  if(isSplitView) {
    bottomSubtitle.style.display = "block"; // Reset to default value
    bottomChart.style.display = "block"; // Reset to default value

    topChart.style.height = "40vh"
  } else {
    bottomSubtitle.style.display = "none";
    bottomChart.style.display = "none";

    topChart.style.height = "80vh"
  }
}

(async function () {
  setCustomDashboardStylesheet('/custom-dashboard.css');

  const visualization = visualizationName || 'per-issue';
  const responseData = await loadDataSet(visualization);

  setupVisualization(responseData, visualization);
})();
