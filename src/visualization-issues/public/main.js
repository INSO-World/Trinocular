// TODO: Fetch data (when scheduler tells the service) from the api bridge and store into a service local database
import {
  processDataFromControls,
  renderBurndownChart,
  setUpBurndownChartControls
} from './burndown-chart.js';

import { baseURL, pageURL, visualizationName } from '/static/dashboard.js';

async function loadDataSet(visualization) {
  // Fetch to api bridge
  const repoUUID = pageURL.searchParams.get('repo');
  const response = await fetch(`${baseURL}data/${visualization}?repo=${repoUUID}`);
  return await response.json();
}

// Set up event listeners for controls
function setupVisualization(fullData, milestones, visualization) {
  if (visualization === 'burndown-chart') {
    setUpBurndownChartControls(fullData, milestones);
    let { data: curFilteredData, changed } = processDataFromControls(fullData);
    if (changed) {
      renderBurndownChart(curFilteredData);
    } else {
      renderBurndownChart(fullData);
    }
  }
}

(async function() {
  const visualization = visualizationName || 'burndown-chart';
  let fullData = await loadDataSet(visualization);
  const milestoneData = [
    { date: '2024-11-15', title: 'Start Date' },
    { date: '2024-12-08', title: 'End Date' }
  ];

  setupVisualization(fullData, milestoneData, visualization);
})();
