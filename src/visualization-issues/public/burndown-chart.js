import {filterIssuesByCreationDate} from './issue-utils.js';
import {
  getControlValues,
  setChangeEventListener
} from '/static/dashboard.js';

function processDataFromControls(data, controls) {
  const {custom, common} = controls;
  const startDate = new Date(common.startDate);
  const endDate = new Date(common.endDate);

  if (startDate && endDate && startDate <= endDate) {
    return {changed: true, data: filterIssuesByCreationDate(data, startDate, endDate)};
  }

  return {changed: false, data};
}

export function setUpBurndownChartControls(fullData) {
  setChangeEventListener(e => {
    if (e !== 'reset' && !e.target.validity.valid) return;
    const controls = getControlValues();
    let {data: curFilteredData, changed} = processDataFromControls(fullData, controls);
    if (!changed) return;
    renderBurndownChart(curFilteredData);
  });
}

export function renderBurndownChart(issueData) {
  // Clear any existing chart
  const chartDiv = document.getElementById("chart");
  chartDiv.innerHTML = "";

  const canvas = document.createElement("canvas");
  chartDiv.appendChild(canvas);

  new Chart(
    canvas, {
      type: 'line',
      data: {
        labels: issueData.map(row => row.date),
        datasets: [
          {
            label: 'Open Issues',
            data: issueData.map(row => row.open_issues),
            spanGaps: true, // Draw a line between points with null values
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderWidth: 2,
            tension: 0.05, // Smooth line
            pointRadius: 4 // Normal radius for dots
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Burndown Chart'
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Open Issues'
            },
            beginAtZero: true
          }
        }
      }
    })
}
