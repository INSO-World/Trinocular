export function renderPerIssueBarChart(data) {
    // Clear any existing chart
    d3.select("#chart").select("svg").remove();

    // Convert time spent and estimate from seconds to hours
    data.forEach(d => {
        d.hours_spent = d.total_time_spent / 3600;
        d.hours_estimate = (d.time_estimate || 0) / 3600; // Default to 0 if no estimate
    });

    // Set up dimensions and margins
    const margin = { top: 20, right: 30, bottom: 150, left: 50 };
    const containerWidth = document.getElementById("chart").clientWidth;
    const width = containerWidth - margin.left - margin.right;
    const height = window.innerHeight - margin.top - margin.bottom;

    // Create SVG within the #chart div
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up scales
    const x = d3.scaleBand()
        .domain(data.map(d => d.iid))
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(d.hours_spent, d.hours_estimate)) || 0])
        .nice()
        .range([height, 0]);

    // Create X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "middle");

    // Add X axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", `translate(${width / 2}, ${height + 30})`) // 10px away from diagram
        .style("text-anchor", "middle")
        .text("Issue IID");

    // Create Y axis
    svg.append("g")
        .call(d3.axisLeft(y));

    // Add Y axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 10)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Hours");

    // Tooltip setup
    const tooltip = d3.select("#chart")
        .append("div")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("border-radius", "3px")
        .style("box-shadow", "0px 2px 5px rgba(0, 0, 0, 0.1)")
        .style("opacity", 0)
        .style("pointer-events", "none");

    // Add actual bars
    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.iid))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.hours_spent))
        .attr("height", d => height - y(d.hours_spent))
        .style("fill", "steelblue")
        .on("mouseover", function (event, d) {
            tooltip
                .style("opacity", 1)
                .html(`
                <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 5px;">
                  ${d.title}
                </div>
                <div>
                  <strong>Created:</strong> ${new Date(d.created_at).toLocaleDateString("en-GB")}<br>
                  <strong>Labels:</strong> ${d.labels.join(", ")}<br>
                  <strong>Estimation:</strong> ${d.hours_estimate.toFixed(2)} h<br>
                  <strong>Actual:</strong> ${d.hours_spent.toFixed(2)} h<br>
                </div>

                `)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);
            d3.select(this).style("fill", "darkblue");
        })
        .on("mousemove", function (event) {
            tooltip
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);
        })
        .on("mouseout", function () {
            tooltip.style("opacity", 0);
            d3.select(this).style("fill", "steelblue");
        });

    // Add dashed border for time estimates
    svg.selectAll(".time-estimate")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "time-estimate")
        .attr("x", d => x(d.iid))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.hours_estimate))
        .attr("height", d => height - y(d.hours_estimate))
        .style("fill", "none")
        .style("stroke", "grey")
        .style("stroke-dasharray", "4,2") // Dashed line
        .style("stroke-width", 1.5);
}
