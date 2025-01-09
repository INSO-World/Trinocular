import { baseURL, pageURL, visualizationName } from '/static/dashboard.js';

async function loadDataSet(visualization) {
  // Fetch to api bridge
  const repoUUID = pageURL.searchParams.get('repo');
  const response = await fetch(`${baseURL}data/${visualization}?repo=${repoUUID}`);
  return await response.json();
}

// Set up event listeners for controls
function setupVisualization(fullData, visualization) {
  if (visualization === 'pipeline-runs-chart') {

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
