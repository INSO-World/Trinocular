export function renderPerIssueBarChart(data) {
    // Clear any existing chart
    const chartContainer = document.getElementById("chart");
    chartContainer.innerHTML = ""; // Remove previous chart instance

    // Convert time spent from seconds to hours
    data.forEach(d => {
        d.hours_spent = d.total_time_spent / 3600; // Convert seconds to hours
    });

    // Create a canvas element for Chart.js
    const canvas = document.createElement("canvas");
    chartContainer.appendChild(canvas);

    // Extract data for Chart.js
    const labels = data.map(d => `Issue ${d.iid}`);
    const actualData = data.map(d => d.hours_spent);

    // Configure Chart.js dataset for Actual Hours only
    const chartData = {
        labels,
        datasets: [
            {
                label: "Actual Hours",
                data: actualData,
                backgroundColor: "rgba(54, 162, 235, 1)", // Solid blue (Actual Hours)
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
                    title: function(tooltipItems) {
                        const issueIndex = tooltipItems[0].dataIndex; // Get the index of the issue
                        return data[issueIndex].title || `Issue ${data[issueIndex].iid}`;
                    },
                    label: function(tooltipItem) {
                        const actualTime = tooltipItem.raw.toFixed(2);
                        return `Actual Time: ${actualTime} hours`; // Show only actual hours in tooltip
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
