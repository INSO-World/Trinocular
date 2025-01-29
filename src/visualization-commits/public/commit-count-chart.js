import {
  createSelect,
  dashboardDocument,
  getControlValues,
  setChangeEventListener
} from '/static/dashboard.js';
import { MilestoneLinesPlugin } from '/static/chart-plugins.js';

// Setup the chart controls
export function setUpCommitCountChartControls(data) {
  // Set up event listeners for controls
  setChangeEventListener(e => {
    if (e instanceof Event && !e.target?.validity?.valid) return;
    let {
      data: curFilteredData,
      milestones,
      authors,
      changed
    } = processDataFromControlsForCommitCountChart(data);
    if (!changed) return;
    renderCommitCountChart(curFilteredData, milestones, authors);
  });
}

let oldControls = null;

function filterCommitCountByDate(data, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  let newestDate= null, oldestDate= null, newestItem= null, oldestItem= null;

  const filtered= data.filter(item => {
    const commitWeek = new Date(item.commit_week);
    const isWithinTimeSpan= commitWeek >= start && commitWeek <= end;

    // Find the newest and oldest items within the time frame
    if( isWithinTimeSpan ) {
      if( !newestDate || newestDate < commitWeek ) {
        newestDate= commitWeek;
        newestItem= item;
      }

      if( !oldestDate || oldestDate > commitWeek ) {
        oldestDate= commitWeek;
        oldestItem= item;
      }
    }

    return isWithinTimeSpan;
  });

  // Add dummy values to stretch the data if the time span is larger than
  // a week in one of the directions
  const sixDays= 6 * 24 * 60 * 60 * 1000;
  if( newestItem && (end - newestDate) > sixDays ) {
    filtered.push({...newestItem, commit_week: end.toISOString()});
  }

  if( oldestItem && (oldestDate - start) > sixDays ) {
    filtered.unshift({...oldestItem, commit_week: start.toISOString()});
  }

  return filtered;
}

// Process the data from the controls for the chart
export function processDataFromControlsForCommitCountChart(data) {
  const { custom, common } = getControlValues();
  // Only update if the controls have changed
  if (oldControls && (oldControls.custom === custom && oldControls.common === common)) {
    return { changed: false, data };
  }
  oldControls = { custom, common };

  const startDate = new Date(common.startDate);
  const endDate = new Date(common.endDate);

  if (startDate && endDate && startDate > endDate) {
    alert('Start date cannot be after end date');
  }

  // If chart can display milestones retrieve them
  const milestones = common.showMilestones ? common.milestones : [];

  // Retrieve merged authors
  const authors = common.authors;


  let selectedBranch = common.branch;
  selectedBranch = (selectedBranch === "#overall") ? "All Branches" : selectedBranch;
  //if (branch !== '#overall') branch = branch.split('origin/')[1];
  const chartData = data.filter(item => item.branch_name === selectedBranch);

  return {
    changed: true,
    // Filter the data based on the date range
    data: filterCommitCountByDate(chartData, startDate, endDate),
    milestones,
    authors
  };
}


// Render the chart
export function renderCommitCountChart(chartData, milestones, authors) {
  // Clear any existing chart
  const chartDiv = document.getElementById('chart');
  chartDiv.innerHTML = '';

  const canvas = document.createElement('canvas');
  chartDiv.appendChild(canvas);


  // Preprocess authors into a lookup map
  const emailToMemberName = new Map();
  authors.forEach(({ memberName, contributors }) => {
    contributors.forEach(({ email }) => {
      emailToMemberName.set(email, memberName);
    });
  });

  // 1) Group rows by user name after author merging
  const groupedByName = chartData.reduce((acc, row) => {

    const contributorEmail = row.contributor_email;
    const userName = emailToMemberName.get(contributorEmail) || 'Unknown';
    
    if (!acc[userName]) {
      acc[userName] = [];
    }
    acc[userName].push(row);
    return acc;
  }, {});

  // 2) Collect all unique weekly periods (commit_week) and sort them
  const allWeeks = chartData.map((row) => row.commit_week);
  const uniqueWeeks = [...new Set(allWeeks)].sort((a, b) => new Date(a) - new Date(b));

  // 3) Build X-axis labels as "Week X" and tooltip date ranges
  const weekLabels = uniqueWeeks.map((weekStr) => {
    const startOfWeek = new Date(weekStr);

    // Build full date range for the tooltip: startOfWeek -> startOfWeek + 6 days
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const formattedStart = startOfWeek.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const formattedEnd = endOfWeek.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    return {
      tooltipRange: `${formattedStart} - ${formattedEnd}` // e.g., "29.01.2025 - 04.02.2025"
    };
  });

  // 4) Sort users alphabetically
  const sortedUserNames = Object.keys(groupedByName).sort();

  
  // 5) Create one dataset (line/area) per user
  const datasets = sortedUserNames.map((userName, index) => {
    const userEntries = groupedByName[userName];

    // Carry-forward logic: reuse the last known cumulative value if missing a week
    let lastVal = 0;
    const userData = uniqueWeeks.map((isoWeekDate) => {
      const entriesForWeek = userEntries.filter((r) => r.commit_week === isoWeekDate);
      
      if (entriesForWeek.length === 0) {
        return lastVal;
      }

      // Sum up all weekly_count values for this week (can be multiple due to author merging)
      const totalWeeklyCount = entriesForWeek.reduce((sum, entry) => sum + parseInt(entry.weekly_count), 0);

      lastVal += totalWeeklyCount; 
      return lastVal;
    });

    // Add final cumulative commits to the legend label
    const finalVal = userData[userData.length - 1] || 0;
    const userLabel = `${userName} (${finalVal.toFixed(0)})`;

    // Generate a unique color
    const colorHue = (index * 60) % 360;
    const backgroundColor = `hsla(${colorHue}, 70%, 50%, 0.4)`;
    const borderColor = `hsla(${colorHue}, 70%, 50%, 1)`;

    return {
      label: userLabel,   // e.g., "Alice"
      data: userData,
      fill: true,
      cubicInterpolationMode: 'monotone',
      tension: 0.4,
      showLine: true,
      spanGaps: false,
      backgroundColor,
      borderColor,
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 5,
      pointBackgroundColor: borderColor
    };
  });

  // Update chart
  new Chart(canvas, {
    type: 'line',
    data: {
      labels: uniqueWeeks,
      datasets
    },
    options: {
      responsive: true,
      // Customize plugin options if needed
      plugins: {
        'milestone-lines': {
          milestones: milestones,
          lineColor: 'rgba(255,67,83,0.54)',
          lineWidth: 2,
          showLabels: true,
          labelFont: '12px Arial',
          labelColor: 'rgba(255,67,83,0.54)'
        },
        tooltip: {
          callbacks: {
            // Show the full date range in the tooltip title
            title: (tooltipItems) => {
              const index = tooltipItems[0].dataIndex;
              return weekLabels[index].tooltipRange;
            },
            // Show user label + hours in the tooltip
            label: (tooltipItem) => {
              const dsLabel = tooltipItem.dataset.label;
              const commitCount =
                tooltipItem.raw === null || isNaN(tooltipItem.raw)
                  ? 0
                  : tooltipItem.raw;
  
              return `${dsLabel.split(' (')[0]} | ${commitCount}`;
              // e.g., "Alice | 12"
            }
          }
        }
      },
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
          stacked: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Cumulative Commit Count'
          }
        }
      }
    },
    plugins: [MilestoneLinesPlugin]
  });
}
