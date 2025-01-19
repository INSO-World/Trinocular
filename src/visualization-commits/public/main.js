import { baseURL, pageURL, visualizationName } from '/static/dashboard.js';
import {
  processDataFromControlsForCommitCountChart, renderCommitCountChart,
  setUpCommitCountChartControls
} from './commit-count-chart.js';

// Data fetching from the API
async function loadDataSet(visualization) {
  const repoUUID = pageURL.searchParams.get('repo');
  const response = await fetch(`${baseURL}data/${visualization}?repo=${repoUUID}`);
  return await response.json();
}

// Set up event listeners for controls
function setupVisualization(fullData, visualization) {
  if (visualization === 'commits-per-person-chart') {
    setTitle('Commits per Person Chart');
    setUpCommitCountChartControls(fullData);
    // Process data from controls, because they maybe changed in other visualization
    let {
      data: curFilteredData,
      milestones,
      changed
    } = processDataFromControlsForCommitCountChart(fullData);
    // Render chart
    renderCommitCountChart(curFilteredData, milestones);
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

(async function() {
  const visualization = visualizationName || 'commits-per-person-chart';
  let fullData = await loadDataSet(visualization);
  setupVisualization(fullData, visualization);
})();
