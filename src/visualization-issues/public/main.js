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

async function loadMilestones() {
  // Fetch to api bridge
  const repoUUID = pageURL.searchParams.get('repo');
  const response = await fetch(`${baseURL}data/milestones?repo=${repoUUID}`);
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
      renderBurndownChart(fullData.dayData);
    }
  }
}

(async function() {
  const visualization = visualizationName || 'burndown-chart';
  let fullData = await loadDataSet(visualization);
  const { data: milestoneData } = await loadMilestones();
  const milestones = milestoneData.map(({ title, due_date }) => ({
    title,
    date: new Date(due_date).toISOString().split('T')[0]
  }));
  setupVisualization(fullData, milestones, visualization);
})();
