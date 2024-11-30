// TODO: Fetch data (when scheduler tells the service) from the api bridge and store into a service local database
import {renderBurndownChart, setUpBurndownChartControls} from './burndown-chart.js';

const pageURL = new URL(window.location.href);
const baseURL = pageURL.origin + pageURL.pathname.replace('index.html', '');

async function loadDataSet() {
  // Fetch to api bridge
  const source = pageURL.searchParams.get('show') || 'burndown-chart';
  const response = await fetch(`${baseURL}data/${source}`);
  return await response.json();
}

// Set up event listeners for controls
function setupControls(fullData, visualization) {
  setUpBurndownChartControls(fullData);
}


(async function () {
  let fullData = await loadDataSet();

  setupControls(fullData);

  renderBurndownChart(fullData);
})();
