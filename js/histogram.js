class Histogram {
    constructor(_config,_data,_dispatcher) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 1100 || _config.containerWidth,
            containerHeight: 300 || _config.containerHeight,
            tooltipPadding: 15,
            margin: {
                top: 20,
                left: 30,
                right: 20,
                bottom: 40
            },
            defaultBarOpacity: "0.5" || _config.defaultBarOpacity,
            defaultBarStrokeWidth: "1" || _config.defaultBarStrokeWidth,
            hoverBarOpacity: "1" || _config.hoverBarOpacity,
            hoverBarStrokeWidth: "2" || _config.hoverBarStrokeWidth,
        };
        this.data = _data;
        this.dispatcher = _dispatcher;
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Calculate inner chart size
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Append svg
        vis.svg = d3.select(vis.config.parentElement).append("svg")
                                                        .attr("width", vis.config.containerWidth)
                                                        .attr("height", vis.config.containerHeight);
                                                        
        // Append chart group
        vis.chart = vis.svg.append("g")
                            .attr("transform", `translate(${vis.config.margin.left}, ${vis.config.margin.top})`);

        // Init scales and axes
        vis.xScale = d3.scaleLinear()
                        .range([0,vis.width]);

        vis.yScale = d3.scalePow()
                        .exponent(0.4)
                        .range([vis.height,0]);

        vis.xAxis = d3.axisBottom(vis.xScale)
                        .ticks(35)
                        .tickFormat(d3.format("~s"))
                        .tickSizeOuter(0);

        vis.yAxis = d3.axisLeft(vis.yScale)
                        .tickFormat(d3.format("~s"))
                        .tickSizeOuter(0);
        
        // Add x axis group
        vis.xAxisG = vis.chart.append("g")
                                .attr("class", "axis x-axis")
                                .attr("transform", `translate(0,${vis.height})`);
        // Add y axis group
        vis.yAxisG = vis.chart.append("g")
                                .attr("class", "axis y-axis");

        // Add x axis label
        vis.chart.append("text")
                    .attr("class", "label x-axis-title")
                    .attr("x","0")
                    .attr("y", `${35 + vis.height}`)
                    .text("Time to crack (in seconds)");

        // Add y axis label
        vis.chart.append("text")
                    .attr("class", "label y-axis-title")
                    .attr("x",-vis.config.margin.left)
                    .attr("y", "-9")
                    .text("Frequency");
        
        // Add chart title
        // Since the data for this scatterplot is going to be filtered by country, we can just take the first
        // element and use its country value
        vis.chart.append("text")
                    .attr("class", "label title")
                    .attr("x", vis.width/2-vis.config.margin.left-vis.config.margin.right)
                    .attr("y", -8)
                    .text("Time to Crack Passwords Histogram");

        vis.updateVis();
    }

    updateVis() {
        let vis = this;
        // Specify accessors
        vis.xValue = d => d["Time_to_crack_in_seconds"];
        vis.yValue = d => d["length"];
        
        // Update x scale domain
        let xExtent = d3.extent(vis.data,d => d["Time_to_crack_in_seconds"]);
        vis.xScale.domain(xExtent);
        
        // Define function for binning data
        let binner = d3.bin()
                        .domain(vis.xScale.domain())
                        .value(vis.xValue)
                        .thresholds(70);
        // Bin the data and update the y scale domain
        vis.bins = binner(vis.data);
        vis.yScale.domain([0, d3.max(vis.bins,vis.yValue)]);


        vis.renderVis();
    }

    renderVis() {
        let vis = this;
        vis.chart.selectAll("rect")
                    .data(vis.bins)
                    .join("rect")
                        .attr("class", "bar")
                        .attr("x", d => vis.xScale(d.x0))
                        .attr("y", d => vis.yScale(vis.yValue(d)))
                        .attr("width", vis.width/vis.bins.length)
                        .attr("height", d => vis.height - vis.yScale(vis.yValue(d)))
                        .attr("fill", "blue")
                        .attr("opacity", "0.5");
        vis.xAxisG.call(vis.xAxis);
        vis.yAxisG.call(vis.yAxis);
    }
}