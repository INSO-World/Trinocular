// TODO: Fetch data (when scheduler tells the service) from the api bridge and store into a service local database
import {renderBurndownChart, setUpBurndownChartControls} from './burndown-chart.js';

import { baseURL, visualizationName } from '/static/dashboard.js';

async function loadDataSet( visualization ) {
  // Fetch to api bridge
  const response = await fetch(`${baseURL}data/${visualization}`);
  return await response.json();
}

// Set up event listeners for controls
function setupVisualization(fullData, visualization) {
  if (visualization === 'burndown-chart') {
    renderBurndownChart(fullData);
    setUpBurndownChartControls(fullData);
  }
}


(async function () {
  const visualization= visualizationName || 'burndown-chart';
  let fullData = await loadDataSet(visualization);

  setupVisualization(fullData, visualization);
})();
