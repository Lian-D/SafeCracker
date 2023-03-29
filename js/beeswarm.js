class Beeswarm {
    constructor(_config,_data,_dispatcher) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 1500 || _config.containerWidth,
            containerHeight: 500 || _config.containerHeight,
            tooltipPadding: 15,
            margin: {
                top: 20,
                left: 30,
                right: 20,
                bottom: 40
            },
            defaultPointOpacity: "0.5" || _config.defaultPointOpacity,
            hoverPointOpacity: "1" || _config.hoverPointOpacity,
            defaultBarFill: "white" || _config.defaultBarFill,
            hoverBarFill: "aliceblue" || _config.hoverBarFill,
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

        vis.xAxis = d3.axisBottom(vis.xScale)
                        .ticks(35)
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
        
        // Add chart title. The actual text is set in updateVis since the title is dynamic
        vis.chart.append("text")
                    .attr("class", "label chartTitle")
                    .attr("x", vis.width/2-vis.config.margin.left-vis.config.margin.right)
                    .attr("y", -8);
        
        // Add listener here to clear beeswarm background bin fill when mouse leaves the chart
        vis.chart.on("mouseleave", (event,d) => {
            let allBars = d3.selectAll(".beeswarmbar");
            allBars.attr("fill", vis.config.defaultBarFill);
        })

        vis.updateVis();
    }

    updateVis() {
        let vis = this;
        // Specify accessors
        vis.xValue = d => d["Time_to_crack_in_seconds"];

        // Set chartTitle
        d3.selectAll(".chartTitle")
            .text(`Time To Crack Password Beeswarm for ${vis.data[0]["country"]}`)
        
        // Update x scale domain
        let xExtent = d3.extent(vis.data,d => d["Time_to_crack_in_seconds"]);
        vis.xScale.domain(xExtent);
        
        // Define function for binning data
        let binner = d3.bin()
                        .domain(vis.xScale.domain())
                        .value(vis.xValue)
                        .thresholds(70);
        // Bin the data
        vis.bins = binner(vis.data);

        // Format data to make creating point marks for beeswarm easier
        vis.generatePointCoordinates();
        let processingArr = vis.bins.filter(d => d[0] != undefined);
        let dataForPoints = [];
        for (let d of processingArr) {
            for (let i = 0; d[i] != undefined; i++) {
                dataForPoints.push(d[i]);
            }
        }
        vis.dataForPoints = dataForPoints;
        
        vis.renderVis();
    }

    renderVis() {
        let vis = this;
        
        vis.chart.selectAll("rect")
                    .data(vis.bins)
                    .join("rect")
                        .attr("class", "bar beeswarmbar")
                        .attr("x", d => vis.xScale(d.x0))
                        .attr("width", vis.width/vis.bins.length)
                        .attr("height", vis.height)
                        .attr("stroke-width", 2)
                        .attr("fill", vis.config.defaultBarFill)
                        .attr("opacity", 1)
                        .on("mouseover", (event,d) => {
                            let allBars = d3.selectAll(".beeswarmbar");
                            allBars.attr("fill", vis.config.defaultBarFill);
                            let targetBar = d3.select(event.target);
                            targetBar.attr("fill", vis.config.hoverBarFill);
                        })

        vis.chart.selectAll("circle")
                    .data(vis.dataForPoints)
                    .join("circle")
                        .attr("class", "point")
                        .attr("cx", d => d["x"])
                        .attr("cy", d => d["y"])
                        .attr("r", 2)
                        .attr("fill", "blue")
                        .attr("opacity", vis.config.defaultPointOpacity)
                        .on("mouseover", (event,d) => {
                            let point = d3.select(event.target);
                            point.attr("fill","black");
                            point.attr("opacity", vis.config.hoverPointOpacity);
                            d3.select("#tooltip")
                                .style("display", "block")
                                .html(`<div class="tooltip-label">
                                        Password: "${d["Password"]}" <br>
                                        Time to crack password: ${d["Time_to_crack_in_seconds"]}s <br>
                                        Number of users: ${d["User_count"]}
                                        </div>`);
                        })
                        .on("mousemove", (event,d) => {
                            d3.select("#tooltip")
                                .style("left", (event.pageX + vis.config.tooltipPadding) + "px")
                                .style("top", (event.pageY + vis.config.tooltipPadding) + "px")
                        })
                        .on("mouseleave", (event,d) => {
                            let point = d3.select(event.target);
                            point.attr("fill", "blue");
                            point.attr("opacity", vis.config.defaultPointOpacity);
                            d3.select("#tooltip")
                                .style("display", "none");
                        })
        vis.xAxisG.call(vis.xAxis);
    }

    generatePointCoordinates() {
        let vis = this;
        for (let d of vis.bins) {
            if (d[0] != undefined) {
                let xIncr = 0;
                let yIncr = 0;
                for (let i = 0; d[i] != undefined; i++) {
                    d[i]["x"] = vis.xScale(d["x0"]) + 3 + 5*xIncr;
                    d[i]["y"] = vis.height - 5 * yIncr - 5;
                    yIncr = yIncr + 1;
                    if (5 * yIncr >= (vis.height - 5)) {
                        yIncr = 0;
                        xIncr = xIncr + 1;
                    }   
                }
            }
            
        }
    }
}