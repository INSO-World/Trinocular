import { baseURL, pageURL, visualizationName } from '/static/dashboard.js';
import {
  processDataFromControlsForPipelineRunsChart, renderPipelineRunsChart,
  setUPipelineRunsChartControls
} from './pipeline-runs.js';

async function loadDataSet(visualization) {
  // Fetch to api bridge
  const repoUUID = pageURL.searchParams.get('repo');
  const response = await fetch(`${baseURL}data/${visualization}?repo=${repoUUID}`);
  return await response.json();
}

// Set up event listeners for controls
function setupVisualization(fullData, visualization) {
  if (visualization === 'pipeline-runs-chart') {
    setTitle('Pipeline Runs Chart');
    setUPipelineRunsChartControls(fullData);
    let {
      data: curFilteredData,
      milestones,
      changed
    } = processDataFromControlsForPipelineRunsChart(fullData);
    renderPipelineRunsChart(curFilteredData, milestones);
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
  const visualization = visualizationName || 'pipeline-runs-chart';
  let fullData = await loadDataSet(visualization);
  console.log(fullData);
  setupVisualization(fullData, visualization);
})();
