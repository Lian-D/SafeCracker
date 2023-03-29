class Lollipop {
  constructor(_config, _data, _dispatcher, filteredCountry) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: 800 || _config.containerWidth,
      containerHeight: 500 || _config.containerHeight,
      tooltipPadding: 15,
      margin: {
        top: 20,
        left: 90,
        right: 20,
        bottom: 40,
      },
      reverseOrder: _config.reverseOrder || false,
    };
    this.data = _data;
    this.fulldata = _data;
    this.dispatcher = _dispatcher;
    this.selectedCountry = filteredCountry;
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
      );

    // Init scales and axes
    vis.xScale = d3.scaleLog().range([0, vis.width - vis.config.margin.right]);
    vis.yScale = d3.scaleBand().range([vis.height, 0]);

    vis.xAxis = d3
      .axisBottom(vis.xScale)
      .ticks(10)
      .tickFormat(d3.format('~s'))
      .tickSizeOuter(0);

    vis.yAxis = d3.axisLeft(vis.yScale).tickSizeOuter(0);

    // Add x axis group
    vis.xAxisG = vis.chart
      .append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${vis.height - 5})`);
    // Add y axis group
    vis.yAxisG = vis.chart
      .append('g')
      .attr('class', 'axis y-axis')
      .attr('transform', `translate(0,-5)`);

    // Add x axis label
    vis.chart
      .append('text')
      .attr('class', 'label x-axis-title')
      .attr('x', '0')
      .attr('y', `${0 + vis.height}`);

    // Add y axis label
    vis.chart
      .append('text')
      .attr('class', 'label y-axis-title')
      .attr('x', -vis.config.margin.left)
      .attr('y', -5)
      .text('User Count');

    vis.chart
      .append('text')
      .attr('class', 'label title')
      .attr(
        'x',
        vis.width / 4 - vis.config.margin.left - vis.config.margin.right
      )
      .attr('y', -8)
      .text('Top Passwords by User Count for ' + this.selectedCountry);

    vis.updateVis();
  }

  updateVis() {
    let vis = this;
    console.log(this.selectedCountry);
    vis.data = vis.fulldata.filter((d) => {
      return d.country == vis.selectedCountry && d.Rank < 50;
    });

    console.log(vis.data);

    if (vis.config.reverseOrder) {
      vis.data.reverse();
    }

    // Specify accessors
    vis.xValue = (d) => d.User_count;
    vis.yValue = (d) => d.Password;

    // Update x scale domain
    let xExtent = d3.extent(vis.data, (d) => d.User_count);
    vis.xScale.domain(xExtent);
    // console.log(vis.data.map((d) => d.Password));

    vis.yScale.domain(vis.data.map((d) => d.Password));
    vis.renderVis();
  }

  renderVis() {
    let vis = this;
    const passwordLine = vis.chart
      .selectAll('.line')
      .data(vis.data)
      .join('line')
      .attr('class', 'line')
      .transition().duration(1000)
      .attr('x1', (d) => {
        return vis.xScale(vis.xValue(d));
      })
      .attr('x2', (d) => {
        return 0;
      })
      .attr('y1', (d) => {
        return vis.yScale(vis.yValue(d));
      })
      .attr('y2', (d) => {
        return vis.yScale(vis.yValue(d));
      })
      .attr('stroke', 'grey')

    const passwordDot = vis.chart
      .selectAll('.circle')
      .data(vis.data)
      .join('circle')
      .attr('class', 'circle')
      .transition().duration(1000)
      .attr('cx', (d) => {
        return vis.xScale(vis.xValue(d));
      })
      .attr('cy', (d) => {
        return vis.yScale(vis.yValue(d));
      })
      .attr('r', '3')
      .attr('fill', 'red')
      .attr('stroke', 'grey')
      .transition().duration(1000);

    // passwordDot
    //   .on('mouseover', (event, d) => {
    //     console.log("moused")
    //     d3.select('#lollipop-tooltip')
    //       .style('opacity', 1)
    //       // Format number with million and thousand separator
    //       .html(
    //         `<div class="tooltip-label">Population</div>${d3.format(',')(
    //           d.population
    //         )}`
    //       );
    //   })
    //   .on('mousemove', (event) => {
    //     d3.select('#lollipop-tooltip')
    //       .style('left', event.pageX + vis.config.tooltipPadding + 'px')
    //       .style('top', event.pageY + vis.config.tooltipPadding + 'px');
    //   })
    //   .on('mouseleave', () => {
    //     d3.select('#lollipop-tooltip').style('opacity', 0);
    //   });

    vis.xAxisG.call(vis.xAxis).transition().duration(1000);
    vis.yAxisG.call(vis.yAxis).transition().duration(1000);
  }
}
