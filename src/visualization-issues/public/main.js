import {
  processDataFromControlsForBurndownChart,
  renderBurndownChart,
  setUpBurndownChartControls
} from './burndown-chart.js';

import { baseURL, pageURL, visualizationName } from '/static/dashboard.js';
import {
  processDataFromControlsForTimelineChart,
  renderIssueTimeline,
  setupIssueTimelineChartControls
} from './issue-timeline.js';

async function loadDataSet(visualization) {
  // Fetch to api bridge
  const repoUUID = pageURL.searchParams.get('repo');
  const response = await fetch(`${baseURL}data/${visualization}?repo=${repoUUID}`);
  return await response.json();
}

// Set up event listeners for controls
function setupVisualization(fullData, visualization) {

  if (visualization === 'burndown-chart') {
    setUpBurndownChartControls(fullData);
    let {
      data: curFilteredData,
      milestones,
      changed
    } = processDataFromControlsForBurndownChart(fullData);
    renderBurndownChart(curFilteredData, milestones);
  } else if (visualization === 'timeline-chart') {
    setupIssueTimelineChartControls(fullData);
    let { data: curFilteredData,milestones, changed } = processDataFromControlsForTimelineChart(fullData);
    renderIssueTimeline(curFilteredData, milestones);

  }
}

(async function() {
  const visualization = visualizationName || 'burndown-chart';
  let fullData = await loadDataSet(visualization);
  setupVisualization(fullData, visualization);
})();
