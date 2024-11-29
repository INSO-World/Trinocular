export function setupPerIssueBarChart(data) {
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
                    title: function(tooltipItems) {
                        const issueIndex = tooltipItems[0].dataIndex;
                        return data[issueIndex].title || `Issue ${data[issueIndex].iid}`;
                    },
                    label: function(tooltipItem) {
                        const timeSpent = tooltipItem.raw.toFixed(2);
                        return `Time spent: ${timeSpent} h`;
                    },
                    afterLabel: function(tooltipItem) {
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
