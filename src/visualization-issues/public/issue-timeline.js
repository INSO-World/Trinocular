import { dashboardDocument, getControlValues, setChangeEventListener } from '/static/dashboard.js';
import { MilestoneLinesPlugin } from '/static/chart-plugins.js';
import { filterIssuesForIssueTimeline } from './issue-utils.js';

let oldControls = null;

export function processDataFromControlsForTimelineChart(data) {
  const { custom, common } = getControlValues();
  if (oldControls && (oldControls.custom === custom && oldControls.common === common)) {
    console.log('No change in controls');
    return { changed: false, data };
  }
  oldControls = { custom, common };

  const startDate = new Date(common.startDate);
  const endDate = new Date(common.endDate);

  if (startDate && endDate && startDate > endDate) {
    alert('Start date cannot be after end date');
  }

  const milestones = common.showMilestones ? common.milestones : [];
  return {
    changed: true,
    data: filterIssuesForIssueTimeline(data.issues, startDate, endDate),
    milestones
  };
}

function populateCustomControlContainer() {}

export function setupIssueTimelineChartControls(fullData,milestones) {
  setChangeEventListener(e => {
    if (e !== 'reset' && !e.target.validity.valid) return;
    let { data: curFilteredData, milestones, changed } = processDataFromControlsForTimelineChart(fullData);
    console.log(milestones);
    if (!changed) return;
    renderIssueTimeline(curFilteredData, milestones);
  });
}

export function renderIssueTimeline(issueData=[], milestoneData = []) {
  // Clear any existing chart
  const chartDiv = document.getElementById('chart');
  chartDiv.innerHTML = '';

  const canvas = document.createElement('canvas');
  chartDiv.appendChild(canvas);
  const labels = issueData.map(issue => issue.title);
  const dataValues = issueData.map(issue => [issue.created_at, issue.closed_at]);

  const config = {
    type: 'bar',
    data: {
      // labels: labels,
      datasets: [{
        label: 'Issue Duration',
        data: dataValues,
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      }]
    },
    options: {
      indexAxis: 'y', // horizontal orientation
      scales: {
        x: {
          type: 'time',
          time: {
            parser: 'YYYY-MM-DD',       // Tells Chart.js how to parse the input data strings
            displayFormats: {
              day: 'YYYY-MM-DD'         // How to display the ticks on the x-axis
            },
            unit: 'day'                 // The unit for the axis
          },
          title: {
            display: true,
            text: 'Date'
          }
        },
        y: {
          type: 'category',
          labels: labels,
          // The Y axis is "unimportant" per your requirement, you can hide it if you want:
          // ticks: { display: false },
          // grid: { display: false },
        }
      },
      plugins: {
        'milestone-lines': {
          milestones: milestoneData,
          lineColor: 'rgba(255,67,83,0.54)',
          lineWidth: 2,
          showLabels: true,
          labelFont: '12px Arial',
          labelColor: 'rgba(255,67,83,0.54)'
        },
        title: {
          display: true,
          text: 'Issues Timeline'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const start = context.raw[0];
              const end = context.raw[1];
              return `${context.label}: ${start} - ${end}`;
            }
          }
        }
      }
    },
    plugins: [MilestoneLinesPlugin]
  };

  new Chart(canvas, config);
}
