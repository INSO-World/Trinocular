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
      return { data: fullData.hourly };
    case 'weekly_total':
      return { data: fullData.weekly };
    case 'daily_avg': // Default: Daily average
    default:
      return { data: fullData.daily };
  }
}

function populateCustomControlContainer(container) {
  // Sort Selector
  const timespanOptions = [
    { label: 'Hour', value: 'hourly_avg', selected: true },
    { label: 'Day', value: 'daily_avg' },
    { label: 'Week', value: 'weekly_total' }
  ];

  const sortDiv = createSelect('timespanControl', 'Time spent per', timespanOptions, {}, [
    'dashboard-control',
    'sort'
  ]);

  // Append all elements to the container
  container.appendChild(sortDiv);
}

export function setupPerUserControls(fullData) {
  const customControlDiv = dashboardDocument.getElementById('custom-controls');
  populateCustomControlContainer(customControlDiv);

  setChangeEventListener(e => {
    if (e instanceof Event && !e.target?.validity?.valid) {
      return;
    }

    const { data } = filterDataPerUser(fullData);
    renderPerUserChart(data);
  });
}

export function renderPerUserChart(data) {
  // Clear existing chart
  const chartContainer = document.getElementById('chart-bottom');
  chartContainer.innerHTML = '';

  // Check which dimension the data has
  let xAxisKey = null;
  let xAxisLabel = '';
  let xAxisToLabelFunc = x => x;

  const {
    custom: { timespanControl }
  } = getControlValues();

  switch (timespanControl) {
    case 'hourly_avg':
      xAxisKey = 'hour_of_day';
      xAxisLabel = 'Hour of Day';
      // Convert hour_of_day (0–23) to a label like "0:00", "1:00", etc.
      xAxisToLabelFunc = h => `${h}:00`;

      break;
    case 'weekly_total':
      xAxisKey = 'calendar_week';
      xAxisLabel = 'Calendar Week';
      // For calendar weeks, just show week numbers like "Week 42"
      xAxisToLabelFunc = w => `Week ${w}`;

      break;
    case 'daily_avg': // Default: Daily average
    default:
      xAxisKey = 'day_of_week';
      xAxisLabel = 'Day of Week';
      // Map day_of_week numbers to human-readable labels (0=Sunday ... 6=Saturday)
      const dowMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      xAxisToLabelFunc = d => dowMap[d] || `Day ${d}`;
  }

  data.forEach(d => {
    d.value_hours = d.avg_time_spent / 3600;
  });

  const yAxisLabel = 'Hours (Avg)';

  // Extract the dimension values and sort them
  const xAxisValues = Array.from(new Set(data.map(d => d[xAxisKey]))).sort((a, b) => a - b);

  // Extract unique names
  const allNames = new Set(data.map(d => d.name));
  const names = Array.from(allNames).sort();

  // Create datasets
  const datasets = names.map((name, index) => {
    const userData = xAxisValues.map(val => {
      const entry = data.find(d => d[xAxisKey] === val && d.name === name);
      return entry ? entry.value_hours : 0;
    });

    const colorHue = (index * 60) % 360;
    const backgroundColor = `hsl(${colorHue}, 70%, 50%)`;
    const borderColor = `hsl(${colorHue}, 70%, 40%)`;

    return {
      label: name,
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
            const name = tooltipItem.dataset.label;
            const hours = tooltipItem.parsed.y.toFixed(2);
            return `${name}: ${hours} h`;
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
