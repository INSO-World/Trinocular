import {
  getControlValues,
  setChangeEventListener
} from '/static/dashboard.js';
import { MilestoneLinesPlugin } from '/static/chart-plugins.js';
import {
  filterTimelogsBySpentDate,
} from './time-spent-utils.js';


export function filterAndSortCumulativeData(fullData) {
  const {
    common
  } = getControlValues();

  const startDate = new Date(common.startDate);
  const endDate = new Date(common.endDate);
  if (!startDate || !endDate || startDate > endDate) {
    return { changed: false };
  }

  const filtered = filterTimelogsBySpentDate(fullData, startDate, endDate);

  const milestones = common.showMilestones ? common.milestones : [];

  return { changed: true, data: filtered, milestones: milestones };
}

export function setupCumulativeTimelogControls(fullData) {

  setChangeEventListener(e => {
    if (e !== 'reset' && !e.target?.validity.valid) {
      return;
    }

    const { data, changed,milestones } = filterAndSortCumulativeData(fullData);
    if (changed) {
      renderCumulativeTimelogChart(data,milestones);
    }
  });
}

function getISOWeek(date) {
  const tempDate = new Date(date.valueOf());
  let day = tempDate.getDay();
  if (day === 0) day = 7; // Sunday=0 => 7
  // Move date to the nearest Thursday (4)
  tempDate.setDate(tempDate.getDate() + 4 - day);
  // Calculate full weeks to the start of the year
  const yearStart = new Date(tempDate.getFullYear(), 0, 1);
  return Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
}


export function renderCumulativeTimelogChart(data, milestoneData ,isStacked = true) {
  // 1) Clear any existing chart
  const chartContainer = document.getElementById('chart-top');
  chartContainer.innerHTML = ''; // Remove previous chart instance

  // 2) Group rows by user name
  const groupedByName = data.reduce((acc, row) => {
    const userName = row.name || 'Unknown';
    if (!acc[userName]) {
      acc[userName] = [];
    }
    acc[userName].push(row);
    return acc;
  }, {});

  // 3) Collect all unique weekly periods (spent_week) and sort them
  const allWeeks = data.map((row) => row.spent_week);
  const uniqueWeeks = [...new Set(allWeeks)].sort((a, b) => new Date(a) - new Date(b));

  // 4) Build X-axis labels as "Week X" and tooltip date ranges
  const weekLabels = uniqueWeeks.map((weekStr) => {
    const startOfWeek = new Date(weekStr);
    const isoWeekNumber = getISOWeek(startOfWeek); // <-- omitted from snippet

    // Axis label: "Week X"
    const axisLabel = `Week ${isoWeekNumber}`;

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
      axisLabel,                     // e.g., "Week 5"
      tooltipRange: `${formattedStart} - ${formattedEnd}` // e.g., "29.01.2025 - 04.02.2025"
    };
  });

  // The actual X-axis labels: just "Week X"
  const labels = weekLabels.map((w) => w.axisLabel);

  // 5) Sort users alphabetically
  const sortedUserNames = Object.keys(groupedByName).sort();

  // 6) Create one dataset (line/area) per user
  const datasets = sortedUserNames.map((userName, index) => {
    const userEntries = groupedByName[userName];

    // Carry-forward logic: reuse the last known cumulative value if missing a week
    let lastVal = 0;
    const userData = uniqueWeeks.map((isoWeekDate) => {
      const entry = userEntries.find((r) => r.spent_week === isoWeekDate);
      if (!entry) {
        return lastVal;
      }
      lastVal = parseFloat(entry.cumulative_spent) / 3600; // seconds → hours
      return lastVal;
    });

    // Add final cumulative time to the legend label
    const finalVal = userData[userData.length - 1] || 0;
    const userLabel = `${userName} (${finalVal.toFixed(0)}h)`;

    // Generate a unique color
    const colorHue = (index * 60) % 360;
    const backgroundColor = `hsla(${colorHue}, 70%, 50%, 0.4)`;
    const borderColor = `hsla(${colorHue}, 70%, 50%, 1)`;

    return {
      label: userLabel,   // e.g., "Alice (27.50h)"
      data: userData,
      fill: isStacked,
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

  // 7) Create a <canvas> for the chart
  const canvas = document.createElement('canvas');
  chartContainer.appendChild(canvas)

  // 8) Prepare the chart data and options
  const chartData = {
    labels: uniqueWeeks,
    datasets
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      'milestone-lines': {
        milestones: milestoneData,
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
            const hoursSpent =
              tooltipItem.raw === null || isNaN(tooltipItem.raw)
                ? 0
                : tooltipItem.raw.toFixed(2);

            return `${dsLabel.split(' (')[0]} | ${hoursSpent} h`;
            // e.g., "Alice | 12.00 h"
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          //parser: 'YYYY-MM-DD',
          unit: 'day',
          isoWeekday: true,
          displayFormats: {
            day: 'YYYY-MM-DD'        // Display the start of the week
          }
        },
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        stacked: isStacked,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Cumulative Time Spent (Hours)'
        }
      }
    }
  };


  // 9) Render the chart
  new Chart(canvas, {
    type: 'line',
    data: chartData,
    options: chartOptions,
    plugins: [MilestoneLinesPlugin]
  });
}















