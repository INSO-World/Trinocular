export function renderBurndownChart(issueData) {
  const chart = new Chart(
    document.getElementById("chart"), {
      type: 'line',
      data: {
        labels: issueData.map(row => row.date),
        datasets: [
          {
            label: 'Open Issues',
            data: issueData.map(row => row.openIssues),
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
