import {
  createInput,
  createSelect,
  dashboardDocument,
  getControlValues,
  setChangeEventListener
} from '/static/dashboard.js';
import {filterIssuesByCreationDate, sortIssuesBy} from "./time-spent-utils.js";

export function setupPerIssueControls(fullData) {
  let curFilteredData = fullData;

  const customControlDiv = dashboardDocument.getElementById('custom-controls');

  if (customControlDiv) {
    populateCustomControlContainer(customControlDiv)
  } else {
    console.error("'custom-controls' element not found.");
  }

  setChangeEventListener(e => {
    console.log('Input', e.target, 'changed!')

    if (e.target.id === "sort-control") {
      const selectedValue = e.target.value;
      sortIssuesBy(curFilteredData, selectedValue);
      renderPerIssueChart(curFilteredData);
    }
  });

  // Apply Timespan Event Listener
  parentDoc.getElementById('apply-timespan').onclick = () => {
    const {custom} = getControlValues();

    const startDate = new Date(custom.startDate);
    const endDate = new Date(custom.endDate);

    if (startDate && endDate && startDate <= endDate) {
      curFilteredData = filterIssuesByCreationDate(curFilteredData, startDate, endDate);
      renderPerIssueChart(curFilteredData);
    } else {
      alert('Please select a valid timespan.');
    }
  };

  // Reset Timespan Event Listener
  parentDoc.getElementById('reset-timespan').onclick = () => {
    parentDoc.getElementById('start-date-field').value = '';
    parentDoc.getElementById('end-date-field').value = '';
    // Reset to full data and preserve the current sorting order
    curFilteredData = fullData;
    renderPerIssueChart(curFilteredData);
  };
}

function populateCustomControlContainer(container) {
  // Clear out the container first
  container.innerHTML = '';

  // Start Date Input
  const startDateDiv = createInput('date', 'startDate', 'Start Date');

  // End Date Input
  const endDateDiv = createInput('date', 'endDate', 'End Date');

  // Apply time-span Button
  const applyButton = document.createElement('button');
  applyButton.type = 'button';
  applyButton.id = 'apply-timespan';
  applyButton.textContent = 'Apply Timespan';

  // Reset time-span Button
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.id = 'reset-timespan';
  resetButton.textContent = 'Reset Timespan';

  // Sort Selector
  const sortOptions = [
    {label: 'Chronological', value: 'created_at', selected: true},
    {label: 'Time Spent (Ascending)', value: 'time_spent'},
  ];

  const sortDiv = createSelect(
    'sort-control',
    'Sort by',
    sortOptions,
    {id: 'sort-control'},
    ['sort']
  );

  // Append all elements to the container
  container.appendChild(startDateDiv);
  container.appendChild(endDateDiv);
  container.appendChild(applyButton);
  container.appendChild(resetButton);
  container.appendChild(sortDiv);
}

export function renderPerIssueChart(data) {
  // Clear any existing chart
  const chartContainer = document.getElementById("chart");
  chartContainer.innerHTML = ""; // Remove previous chart instance

  // Convert time spent from seconds to hours
  data.forEach(d => {
    d.hours_spent = d.total_time_spent / 3600;
    d.time_estimate = d.time_estimate / 3600;
  });

  const canvas = document.createElement("canvas");
  chartContainer.appendChild(canvas);

  const labels = data.map(d => `Issue ${d.iid}`);
  const actualData = data.map(d => d.hours_spent);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Time spent",
        data: actualData,
        backgroundColor: "rgba(54, 162, 235, 1)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1
      }
    ]
  };

  // Configure Chart.js options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          title: function (tooltipItems) {
            const issueIndex = tooltipItems[0].dataIndex;
            return data[issueIndex].title || `Issue ${data[issueIndex].id}`;
          },
          label: function (tooltipItem) {
            const timeSpent = tooltipItem.raw.toFixed(2);
            return `Time spent: ${timeSpent} h`;
          },
          afterLabel: function (tooltipItem) {
            const issueIndex = tooltipItem.dataIndex;
            const timeEstimate = data[issueIndex].time_estimate || "-";
            const createdAt = data[issueIndex].created_at;
            const formattedCreatedAt = new Date(createdAt).toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            });
            return [
              `Time Estimate: ${timeEstimate} h`,
              `Created at: ${formattedCreatedAt}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Issues"
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Hours"
        }
      }
    }
  };

  // Render the chart
  new Chart(canvas, {
    type: "bar",
    data: chartData,
    options: chartOptions
  });
}
