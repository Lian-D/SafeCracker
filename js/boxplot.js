class Boxplot {

  constructor(_config, _data, _dispatcher) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: 800 || _config.containerWidth,
      containerHeight: 500 || _config.containerHeight,
      margin: { top: 40, right: 20, bottom: 50, left: 100 },
      tooltipPadding: 15,
    };


    this.data = _data;
    this.dispatcher = _dispatcher;
    this.selectedCountry = 'Canada';
    this.initVis();
  }

  initVis() {
    let vis = this;


    // calculate inner chart size along with margins
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;


    // init scales
    vis.xScale = d3.scaleBand()
      .paddingInner(1)
      .paddingOuter(0.5)
      .range([0, vis.width]);

    vis.yScale = d3.scalePow()
      .exponent(0.5)
      .range([vis.height, 0]);
    
    
    // init axes
    vis.xAxis = d3.axisBottom(vis.xScale);
    
    vis.yAxis = d3.axisLeft(vis.yScale);

    // svg drawing area
    vis.svg = d3.select(vis.config.parentElement).append('svg')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    
    // append groups for chart and each axis, and translate chart and x-axis accordingly
    vis.chart = vis.svg.append('g')
      .attr('transform', `translate(${vis.config.margin.left}, ${vis.config.margin.top})`);
    
    vis.xAxisG = vis.chart.append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${vis.height})`);

    vis.yAxisG = vis.chart.append('g')
      .attr('class', 'axis y-axis');

    
    // append axis titles
    vis.chart.append('text')
      .attr('class', 'axis-title')
      .attr('x', vis.width - vis.config.margin.left - vis.config.margin.right)
      .attr('y', vis.height + vis.config.margin.bottom - 10)
      .text('Password Type');
    
    vis.chart.append('text')
      .attr('class', 'axis-title')
      .attr('x', -vis.config.margin.left)
      .attr('y', -15)
      .text('User Count');

  
    this.updateVis();
  }

  updateVis() {
    let vis = this;
    vis.sumStats = [];


    // accessors and other helpers
    vis.xValue = d => d['password_type'];
    vis.yValue = d => d['User_count'];
    vis.calcStats = function(data, type) {
      data.sort(function(a, b) { return a['User_count'] - b['User_count'] });
      const q1 = d3.quantile(data.map(function(p) { return p.User_count}), .25);
      const median = d3.quantile(data.map(function(p) { return p.User_count}), .5);
      const q3 = d3.quantile(data.map(function(p) { return p.User_count}), .75);
      const min = d3.min(data, vis.yValue);
      const max = d3.max(data, vis.yValue);
      vis.sumStats.push({q1: q1, median: median, q3: q3, min: min, max: max, password_type: type});
    }


    // filter data by country
    vis.filteredData = vis.data.filter(d => d['country'] == vis.selectedCountry);


    // add domain to scales
    vis.xScale.domain(['ALPHABETICAL', 'NUMERICAL', 'MIXED']);
    vis.yScale.domain([d3.min(vis.filteredData, vis.yValue), d3.max(vis.filteredData, vis.yValue)]).nice();


    // calculate summary stats used for each box
    const groupedPasswordData = d3.group(vis.filteredData, vis.xValue);
    vis.calcStats(groupedPasswordData.get('NUMERICAL'), 'NUMERICAL');
    vis.calcStats(groupedPasswordData.get('ALPHABETICAL'), 'ALPHABETICAL');
    vis.calcStats(groupedPasswordData.get('MIXED'), 'MIXED');

    
    // render vis
    vis.renderVis();
  }

  renderVis() {
    let vis = this;


    // vertical line
    vis.chart.selectAll('.vertLine')
      .data(vis.sumStats)
      .join('line')
        .attr('class', 'vertLine')
        .attr("x1", d => vis.xScale(vis.xValue(d)))
        .attr("x2", d => vis.xScale(vis.xValue(d)))
        .attr("y1", d => vis.yScale(d['min']))
        .attr("y2", d => vis.yScale(d['max']))
        .attr("stroke", "black")
        .style("width", 40);


    // box
    let clicked;
    vis.chart.selectAll('.box')
      .data(vis.sumStats)
      .join('rect')
        .attr('class', d => `box type-${d['password_type']}`)
        .attr("x", d => (vis.xScale(vis.xValue(d)) - 100/2))
        .attr("y", d => vis.yScale(d['q3']))
        .attr("height", d => (vis.yScale(d['q1']) - vis.yScale(d['q3'])))
        .attr("width", 100)
        .attr("stroke", "black")
        .style("fill", "#E5B5D8")
          .on('mousemove', (event, d) => {
            d3.select('#tooltip')
              .style('display', 'block')
              .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
              .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
              .html(`
                <div class="tooltip-title">${d['password_type']} Password Stats in ${vis.selectedCountry}</div>
                <div><i><strong>Q1:</strong> ${Math.ceil(d['q1']).toLocaleString("en-US")} users</i></div>
                <div><i><strong>Median:</strong> ${Math.ceil(d['median']).toLocaleString("en-US")} users</i></div>
                <div><i><strong>Q3:</strong> ${Math.ceil(d['q3']).toLocaleString("en-US")} users</i></div>
                <div><i><strong>Min:</strong> ${Math.ceil(d['min']).toLocaleString("en-US")} users</i></div>
                <div><i><strong>Max:</strong> ${Math.ceil(d['max']).toLocaleString("en-US")} users</i></div>
              `);
            
            d3.select(`.type-${d['password_type']}`)
              .style('fill', '#FFCC00');
          })
          .on('mouseleave', (_, d) => {
            d3.select('#tooltip').style('display', 'none');

            if (clicked != d['password_type']) {
              d3.select(`.type-${d['password_type']}`)
                .style('fill', '#E5B5D8');
            }
          })
          .on('click', function (event, d) {
            if (clicked) {
              if (clicked != d['password_type']) {
                d3.select(`.type-${clicked}`)
                .style('fill', '#E5B5D8');

                d3.select(`.type-${d['password_type']}`)
                  .style('fill', '#FFCC00');

                clicked = d['password_type'];
              } else {
                clicked = null;
              }
            } else {
              clicked = d['password_type'];
            }

            vis.dispatcher.call('filterPasswordType', event, clicked, vis.selectedCountry);
          });


    // median line
    vis.chart.selectAll('.medLine')
      .data(vis.sumStats)
      .join('line')
        .attr('class', 'medLine')
        .attr("x1", d => (vis.xScale(vis.xValue(d)) - 100/2))
        .attr("x2", d => (vis.xScale(vis.xValue(d)) + 100/2))
        .attr("y1", d => vis.yScale(d['median']))
        .attr("y2", d => vis.yScale(d['median']))
        .attr("stroke", "black")
        .style("width", 80);
      

    // chart title
    vis.chart.selectAll('.chart-title')
      .data([vis.selectedCountry])
      .join('text')
        .attr('class', 'chart-title')
        .attr('x', vis.width/2)
        .attr('y', -15)
        .attr('font-weight', 700)
        .attr('font-size', 15)
        .attr('text-anchor', 'middle')
        .text(d => `Average User Count by Password Type for ${d}`);


    // update axes/gridlines
    vis.xAxisG
      .call(vis.xAxis);
    vis.yAxisG
      .call(vis.yAxis);
  }
  
}