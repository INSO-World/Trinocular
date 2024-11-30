// TODO: Fetch data (when scheduler tells the service) from the api bridge and store into a service local database
import {renderBurndownChart, setUpBurndownChartControls} from './burndown-chart.js';

const pageURL = new URL(window.location.href);
const baseURL = pageURL.origin + pageURL.pathname.replace('index.html', '');
const visualization = pageURL.searchParams.get('show') || 'burndown-chart';

async function loadDataSet() {
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
  let fullData = await loadDataSet();

  setupVisualization(fullData, visualization);
})();
