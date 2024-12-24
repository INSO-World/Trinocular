import {
  createSelect,
  dashboardDocument,
  getControlValues,
  setChangeEventListener
} from '/static/dashboard.js';

export function filterDataPerUser(fullData) {
  const {
    custom: { timespanControl }
  } = getControlValues();

  switch (timespanControl) {
    case 'hourly_avg':
      return { data: fullData.hourly }
    case 'weekly_total':
      return { data: fullData.weekly }
    case 'daily_avg': // Default: Daily average
    default:
      return { data: fullData.daily }
  }
}

function populateCustomControlContainer(container) {
  // Sort Selector
  const timespanOptions = [
    { label: 'Hour', value: 'hourly_avg', selected: true },
    { label: 'Day', value: 'daily_avg' },
    { label: 'Week', value: 'weekly_total' }
  ];

  const sortDiv = createSelect('timespanControl', 'Time spent per', timespanOptions, {}, ['sort']);

  // Append all elements to the container
  container.appendChild(sortDiv);
}

export function setupPerUserControls(fullData) {

  const customControlDiv = dashboardDocument.getElementById('custom-controls');
  populateCustomControlContainer(customControlDiv);

  setChangeEventListener(e => {
    console.log('Input', e.target || e, 'changed!');

    if (e !== 'reset' && !e.target?.validity.valid) {
      return;
    }

    const { data, changed } = filterDataPerUser(fullData);
    if (changed) {
      renderPerUserChart(data);
    }
  });
}

export function renderPerUserChart(data) {
  // Clear existing chart
  const chartContainer = document.getElementById('chart');
  chartContainer.innerHTML = '';

  if (!data || !data.length) {
    console.warn('No data provided to renderChart.');
    return;
  }

  console.table(data);

  // Check which dimension the data has
  let xAxisKey = null;
  let xAxisLabel = '';
  let xAxisToLabelFunc = x => x;

  const {
    custom: { timespanControl }
  } = getControlValues();

  let isAverage = false;
  switch (timespanControl) {
    case 'hourly_avg':
      xAxisKey = 'hour_of_day';
      xAxisLabel = 'Hour of Day';
      // Convert hour_of_day (0–23) to a label like "0:00", "1:00", etc.
      xAxisToLabelFunc = h => `${h}:00`;

      isAverage = true;
      break;
    case 'weekly_total':
      xAxisKey = 'calendar_week';
      xAxisLabel = 'Calendar Week';
      // For calendar weeks, just show week numbers like "Week 42"
      xAxisToLabelFunc = w => `Week ${w}`;

      isAverage = false;
      break;
    case 'daily_avg': // Default: Daily average
    default:
      xAxisKey = 'day_of_week';
      xAxisLabel = 'Day of Week';
      // Map day_of_week numbers to human-readable labels (0=Sunday ... 6=Saturday)
      const dowMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      xAxisToLabelFunc = d => dowMap[d] || `Day ${d}`;

      isAverage = true;
  }

  data.forEach(d => {
    if(isAverage) {
      d.value_hours = d.avg_time_spent / 3600;
    } else {
      d.value_hours = d.total_time_spent / 3600;
    }
  });

  // TODO make this difference of avg/total more visible
  const yAxisLabel = isAverage ? 'Hours (Avg)' : 'Hours';

  // Extract the dimension values and sort them
  const xAxisValues = Array.from(new Set(data.map(d => d[xAxisKey]))).sort((a, b) => a - b);

  // Extract unique usernames
  const allUsernames = new Set(data.map(d => d.username));
  const usernames = Array.from(allUsernames);

  // Create datasets
  const datasets = usernames.map((username, index) => {
    const userData = xAxisValues.map(val => {
      const entry = data.find(d => d[xAxisKey] === val && d.username === username);
      return entry ? entry.value_hours : 0;
    });

    const colorHue = (index * 60) % 360;
    const backgroundColor = `hsl(${colorHue}, 70%, 50%)`;
    const borderColor = `hsl(${colorHue}, 70%, 40%)`;

    return {
      label: username,
      data: userData,
      backgroundColor,
      borderColor,
      borderWidth: 1
    };
  });

  const canvas = document.createElement('canvas');
  chartContainer.appendChild(canvas);

  const chartData = {
    labels: xAxisValues.map(d => xAxisToLabelFunc(d)),
    datasets
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          title: function (tooltipItems) {
            return `${xAxisLabel}: ${tooltipItems[0].label}`;
          },
          label: function (tooltipItem) {
            const username = tooltipItem.dataset.label;
            const hours = tooltipItem.parsed.y.toFixed(2);
            return `${username}: ${hours} h`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: xAxisLabel
        }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        title: {
          display: true,
          text: yAxisLabel
        }
      }
    }
  };

  new Chart(canvas, {
    type: 'bar',
    data: chartData,
    options: chartOptions
  });
}

