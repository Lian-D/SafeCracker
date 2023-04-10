class Lollipop {
  constructor(_config, _data, _dispatcher, filteredCountry) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: 800 || _config.containerWidth,
      containerHeight: 470 || _config.containerHeight,
      tooltipPadding: 15,
      margin: {
        top: 20,
        left: 65,
        right: 20,
        bottom: 40,
      },
      reverseOrder: _config.reverseOrder || false,
    };
    this.data = _data;
    this.fulldata = _data;
    this.dispatcher = _dispatcher;
    this.selectedCountry = filteredCountry;
    this.selectedPasswords = [];
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
    vis.xScale = d3
      .scalePow()
      .exponent(0.5)
      .range([0, vis.width - vis.config.margin.right]);
    vis.yScale = d3.scalePoint().range([vis.height, 0]);

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
      .attr('transform', `translate(0,${vis.height})`);
    // Add y axis group
    vis.yAxisG = vis.chart
      .append('g')
      .attr('class', 'axis y-axis')
      .attr('transform', `translate(0,-5)`);

    vis.chart
      .append('text')
      .attr('class', 'labeltitle')
      .attr(
        'x',
        vis.width / 4 - vis.config.margin.left - vis.config.margin.right
      )
      .attr('y', -8);

    vis.updateVis();
  }

  updateVis() {
    let vis = this;
    let rankFilter = d3.select('#numberselect').node().value;

    vis.data = vis.fulldata.filter((d) => {
      return d.country == vis.selectedCountry && d.Rank <= rankFilter;
    });

    if (vis.config.reverseOrder) {
      vis.data.reverse();
    }

    d3.selectAll('.labeltitle').text(
      `Top ${rankFilter} Passwords for ${vis.selectedCountry} Based On User Count`
    );

    // Specify accessors
    vis.xValue = (d) => d.User_count;
    vis.yValue = (d) => d.Password;

    // Update x scale domain
    let xExtent = d3.extent(vis.data, (d) => d.User_count);
    vis.xScale.domain(xExtent);

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
      .transition()
      .duration(1000)
      .attr('x1', (d) => {
        return vis.xScale(vis.xValue(d));
      })
      .attr('x2', (d) => {
        return 0;
      })
      .attr('y1', (d) => {
        return vis.yScale(vis.yValue(d)) - 5;
      })
      .attr('y2', (d) => {
        return vis.yScale(vis.yValue(d)) - 5;
      })
      .attr('stroke', 'grey');

    const passwordDot = vis.chart
      .selectAll('.circle')
      .data(vis.data)
      .join('circle')
      .attr('class', 'circle')
      .transition()
      .duration(1000)
      .attr('cx', (d) => {
        return vis.xScale(vis.xValue(d));
      })
      .attr('cy', (d) => {
        return vis.yScale(vis.yValue(d)) - 5;
      })
      .attr('r', (d) => {
        if (vis.selectedPasswords.includes(d.Password)) {
          return '5';
        } else {
          return '3';
        }
      })
      .attr('fill', (d) => {
        if (vis.selectedPasswords.includes(d.Password)) {
          return '#FFD700';
        } else {
          return '#E7A0D4';
        }
      })
      .attr('stroke', 'grey')
      .transition()
      .duration(100);

    vis.chart
      .selectAll('circle')
      .raise()
      .on('mouseover', (event, d) => {
        d3.select('#tooltip').style('display', 'block')
          .html(`<div class="tooltip-label">
                      <b>Password:</b> "${d['Password']}" <br>
                      <b>Time to crack password:</b> ${d['Time_to_crack_in_seconds']}s <br>
                      <b>Number of users:</b> ${d['User_count']}
                      </div>`);
      })
      .on('mousemove', (event, d) => {
        d3.select('#tooltip')
          .style('left', event.pageX + vis.config.tooltipPadding + 'px')
          .style('top', event.pageY + vis.config.tooltipPadding + 'px');
      })
      .on('mouseleave', (event, d) => {
        d3.select('#tooltip').style('display', 'none');
      })
      .on('click', function (event, d) {
        if (vis.selectedPasswords.includes(d.Password)) {
          vis.dispatcher.call('selectPass', event, d.Password, false);
        } else {
          vis.dispatcher.call('selectPass', event, d.Password, true);
        }
      });

    vis.xAxisG.call(vis.xAxis).transition().duration(1000);
    vis.yAxisG.call(vis.yAxis).transition().duration(1000);
  }
}
