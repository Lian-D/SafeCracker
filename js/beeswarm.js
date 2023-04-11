class Beeswarm {
  constructor(_config, _data, _dispatcher) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: 1400 || _config.containerWidth,
      containerHeight: 300 || _config.containerHeight,
      tooltipPadding: 15,
      margin: {
        top: 50,
        left: 30,
        right: 20,
        bottom: 40,
      },
      defaultPointOpacity: '0.5' || _config.defaultPointOpacity,
      hoverPointOpacity: '1' || _config.hoverPointOpacity,
      selectedPointFill: '#FFD700' || _config.selectedPointFill,
      selectedPointOpacity: '1' || _config.selectedPointOpacity,
      legendBottom: 50,
      legendLeft: 50,
      legendRectHeight: 12,
      legendRectWidth: 150,
    };
    this.selectedPasswords = [];
    this.data = _data;
    this.dispatcher = _dispatcher;
    this.initVis();
  }

  initVis() {
    let vis = this;

    // Calculate inner chart size
    vis.width =
      vis.config.containerWidth -
      vis.config.margin.left -
      vis.config.margin.right;
    vis.height =
      vis.config.containerHeight -
      vis.config.margin.top -
      vis.config.margin.bottom;

    // Append svg
    vis.svg = d3
      .select(vis.config.parentElement)
      .append('svg')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    // Append chart group
    vis.chart = vis.svg
      .append('g')
      .attr(
        'transform',
        `translate(${vis.config.margin.left}, ${vis.config.margin.top})`
      )

    // Init scales and axes
    vis.xScale = d3.scalePow().exponent(0.4).range([0, vis.width]);

    vis.xAxis = d3
      .axisBottom(vis.xScale)
      .ticks(20)
      .tickFormat(d3.format('~s'))
      .tickSizeOuter(0);

    vis.colorScale = d3
      .scaleLog()
      .range(['#FFB6C1', '#FF00FF'])
      .interpolate(d3.interpolateHcl);

    // Initialize gradient that we will later use for the legend
    vis.linearGradient = vis.svg
      .append('defs')
      .append('linearGradient')
      .attr('id', 'legend-gradient-beeswarm');

    // Add x axis group
    vis.xAxisG = vis.chart
      .append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${vis.height})`);
    // Add y axis group
    vis.yAxisG = vis.chart.append('g').attr('class', 'axis y-axis');

    // Add x axis label
    vis.chart
      .append('text')
      .attr('class', 'label x-axis-title')
      .attr('x', '0')
      .attr('y', `${35 + vis.height}`)
      .text('Time to crack (in seconds with SI prefixes)');

    // Add chart title. The actual text is set in updateVis since the title is dynamic
    vis.chart
      .append('text')
      .attr('class', 'label chartTitle')
      .attr('x', vis.width / 2)
      .attr('y', -8)
      .attr('text-anchor', 'middle');

    // Add listener here to clear beeswarm background bin fill when mouse leaves the chart
    vis.chart.on('mouseleave', (event, d) => {
      let activeBar = vis.chart.selectAll('.active');
      activeBar.classed("active", false);
    });

    // Append legend
    vis.legend = vis.svg
      .append('g')
      .attr('class', 'legend')
      .attr(
        'transform',
        `translate(${vis.width - vis.config.legendRectWidth},25)`
      );

    vis.legendRect = vis.legend
      .append('rect')
      .attr('class', 'legendRect')
      .attr('width', vis.config.legendRectWidth)
      .attr('height', vis.config.legendRectHeight);

    vis.legendTitle = vis.legend
      .append('text')
      .attr('class', 'legend-title')
      .attr('dy', '.35em')
      .attr('y', -10)
      .text('User count for passwords');

    vis.updateVis();
  }

  updateVis() {
    let vis = this;
    // Specify accessors
    vis.xValue = (d) => d['Time_to_crack_in_seconds'];

    // Set chartTitle
    d3.selectAll('.chartTitle')
        .attr('font-weight', 700)
        .attr('font-size', 15)
        .text(`Time To Crack Passwords for ${vis.data[0]['country']}`);

    // Update x scale domain
    let xExtent = d3.extent(vis.data, (d) => d['Time_to_crack_in_seconds']);
    vis.xScale.domain(xExtent);

    // Update color scale domain
    let colorGradientExtent = d3.extent(vis.data, (d) => d['User_count']);
    vis.colorScale.domain(colorGradientExtent);
    // Define begin and end of the color gradient (legend)
    vis.legendStops = [
      { color: '#FFB6C1', value: colorGradientExtent[0], offset: 0 },
      { color: '#FF00FF', value: colorGradientExtent[1], offset: 100 },
    ];
    // Define thresholds for binning
    let numberOfBins = 70;
    let thresholds = [];
    for (let i = 0; i < numberOfBins; i++) {
      thresholds.push((vis.xScale.domain()[1] / numberOfBins) * i);
    }
    // Define function for binning data
    let binner = d3
      .bin()
      .domain(vis.xScale.domain())
      .value(vis.xValue)
      .thresholds(thresholds);
    // Bin the data
    vis.bins = binner(vis.data);

    // Format data to make creating point marks for beeswarm easier
    vis.generatePointCoordinates();
    let processingArr = vis.bins.filter((d) => d[0] != undefined);
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

        // If the x domain is [0,0], make adjustments so that the only bin takes up the entire chart
        // instead of half the chart (this is default behavior)
        // These adjustments will be made after the axis is generated
        let isOneBin = (vis.xScale.domain()[0] == 0 && vis.xScale.domain()[1] == 0) ? true: false;
        // Offset used to shift the points in the case mentioned above
        let oneBinOffset = vis.xScale(vis.bins[0]["x0"]);
        let bars = vis.chart.selectAll(".beeswarmbar")
                              .data(vis.bins);
        let barsEnter = bars.enter().append("rect")
                                      .attr("class", "bar beeswarmbar");

        barsEnter.merge(bars)
                    .attr("identifier", (d,i) => i)
                    .attr("x", d => {
                        if (isOneBin) {
                            return 0;
                        } else {
                            return vis.xScale(d.x0);
                        }
                    })
                    .attr("width", d => {
                        if (isOneBin) {
                            return vis.width;
                        } else {
                            return vis.xScale(d.x1)-vis.xScale(d.x0);
                        }
                    })
                    .attr("height", vis.height)
                    .attr("stroke-width", 2)
                    .attr("opacity", 1)
                    .on("mouseover", (event,d) => {
                        let targetBar = d3.select(event.target);
                        let activeBar = vis.chart.select(".active");
                        if (activeBar.empty()) {
                          targetBar.classed("active", true);
                        } else if (activeBar.attr("identifier") != targetBar.attr("identifier")) {
                          activeBar.classed("active", false);
                          targetBar.classed("active", true);
                        }
                        d3.select("#tooltip")
                            .style("display","block")
                            .html(`<div class="tooltip-label">
                                        Passwords with crack time between<br> 
                                        ${Math.round(d.x0)}s-${Math.round(d.x1)}s<br>
                                    </div>`);
                    })
                    .on('mousemove', (event, d) => {
                      d3.select('#tooltip')
                        .style('left', event.pageX + vis.config.tooltipPadding + 'px')
                        .style('top', event.pageY + vis.config.tooltipPadding + 'px');
                    })
                    .on('mouseleave', (event, d) => {
                      d3.select('#tooltip').style('display', 'none');
                    });
        
        bars.exit().remove();

        vis.chart.selectAll("circle")
                    .data(vis.dataForPoints, d => d.Password)
                    .join("circle")
                        .transition()
                        .duration(1000)
                        .attr("class", "point")
                        .attr("cx", d => {
                            if (isOneBin) {
                                return d["x"] - oneBinOffset;
                            } else {
                                return d["x"];
                            }
                        })
                        .attr("cy", d => d["y"])
                        .attr("r", 5)
                        .attr("fill", d => {
                            if (vis.selectedPasswords.includes(d.Password)) {
                                return vis.config.selectedPointFill;
                            } else {
                                return vis.colorScale(d["User_count"]);
                            }
                            
                        })
                        .attr("opacity", d => {
                            if (vis.selectedPasswords.includes(d.Password)) {
                                return vis.config.selectedPointOpacity;
                            } else {
                                return vis.config.defaultPointOpacity;
                            }
                        })
                        .attr("stroke", d => {
                            if (vis.selectedPasswords.includes(d.Password)) {
                                return "black";
                            } else {
                                return null;
                            }
                        })
        // After points have been updated, add event listeners
        vis.chart.selectAll("circle")
                    .raise()
                    .on("mouseover", (event,d) => {
                        let point = d3.select(event.target);
                        if (!vis.selectedPasswords.includes(d.Password)) {
                            point.attr("fill","black");
                            point.attr("opacity", vis.config.hoverPointOpacity);
                        }
                        d3.select("#tooltip")
                            .style("display", "block")
                            .html(`<div class="tooltip-label">
                                    <b>Password:</b> "${d["Password"]}" <br>
                                    <b>Time to crack password:</b> ${d["Time_to_crack_in_seconds"]}s <br>
                                    <b>Number of users:</b> ${d["User_count"]}
                                    </div>`);
                    })
                    .on("mousemove", (event,d) => {
                        d3.select("#tooltip")
                            .style("left", (event.pageX + vis.config.tooltipPadding) + "px")
                            .style("top", (event.pageY - vis.config.tooltipPadding) + "px")
                    })
                    .on("mouseleave", (event,d) => {
                        let point = d3.select(event.target);
                        if (!vis.selectedPasswords.includes(d.Password)) {
                            point.attr("fill", d => vis.colorScale(d["User_count"]));
                            point.attr("opacity", vis.config.defaultPointOpacity);
                        }
                        d3.select("#tooltip")
                            .style("display", "none");
                    })
                    .on("click", function(event,d) {
                        if (vis.selectedPasswords.includes(d.Password)) {
                            vis.dispatcher.call("selectPass", event, d.Password, false);
                        } else {
                            vis.dispatcher.call("selectPass", event, d.Password, true);
                        }
                    });

    // Add legend labels
    vis.legend
      .selectAll('.legend-label')
      .data(vis.legendStops)
      .join('text')
      .attr('class', 'legend-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('y', 20)
      .attr('x', (d, index) => {
        return index == 0 ? 0 : vis.config.legendRectWidth;
      })
      .text((d) => Math.round(d.value * 10) / 10);

        // Update gradient folegend
        vis.linearGradient.selectAll('stop')
                            .data(vis.legendStops)
                            .join('stop')
                                .attr('offset', (d) => d.offset)
                                .attr('stop-color', (d) => d.color);
        vis.legendRect.attr("fill", "url(#legend-gradient-beeswarm");
        vis.xAxisG.call(vis.xAxis);
        // Manually position the one axis tick in the case of one bin only
        if (isOneBin) {
            let axis = vis.chart.selectAll(".x-axis");
            // We know that there will only be one tick, so we can modify it directly
            axis.selectAll(".tick")
                    .attr("transform", "translate(0,0)");
        }
    }

  generatePointCoordinates() {
    let vis = this;
    for (let d of vis.bins) {
      if (d[0] != undefined) {
        let xIncr = 0;
        let yIncr = 0;
        for (let i = 0; d[i] != undefined; i++) {
          d[i]['x'] = vis.xScale(d['x0']) + 4 + 15 * xIncr;
          d[i]['y'] = vis.height - 15 * yIncr - 5;
          yIncr = yIncr + 1;
          if (15 * yIncr >= vis.height - 5) {
            yIncr = 0;
            xIncr = xIncr + 1;
          }
        }
      }
    }
  }
}
