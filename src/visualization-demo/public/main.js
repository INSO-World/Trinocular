import { baseURL, pageURL, visualizationName } from '/static/dashboard.js';
import {
  processDataFromControlsForDemoChart, renderDemoChart,
  setUpDemoChartControls
} from './demo-chart.js';

// Data fetching from the API
async function loadDataSet(visualization) {
  const repoUUID = pageURL.searchParams.get('repo');
  const response = await fetch(`${baseURL}data/${visualization}?repo=${repoUUID}`);
  return await response.json();
}

// Set up event listeners for controls
function setupVisualization(fullData, visualization) {
  // TODO: Create if else statement for each visualization
  if (visualization === 'demo-chart') {
    setTitle('Demo Chart');
    setUpDemoChartControls(fullData);
    // Process data from controls, because they maybe changed in other visualization
    let {
      data: curFilteredData,
      milestones,
      changed
    } = processDataFromControlsForDemoChart(fullData);
    // Render chart
    renderDemoChart(curFilteredData, milestones);
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

// TODO: Load data from the API
(async function() {
  const visualization = visualizationName || 'demo-chart';
  let fullData = await loadDataSet(visualization);
  console.log(fullData);
  setupVisualization(fullData, visualization);
})();
