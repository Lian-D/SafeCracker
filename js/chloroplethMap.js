class ChloroplethMap {
  /**
   * Class constructor with basic configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data, _dispatcher) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 1400,
      containerHeight: _config.containerHeight || 800,
      margin: _config.margin || { top: 50, right: 0, bottom: 0, left: 0 },
      tooltipPadding: 10,
      legendBottom: 50,
      legendLeft: 50,
      legendRectHeight: 12,
      legendRectWidth: 150,
    };
    this.data = _data;
    this.dispatcher = _dispatcher;
    this.initVis();
    this.selectedCountry;
  }

  /**
   * We initialize scales/axes and append static elements, such as axis titles.
   */
  initVis() {
    let vis = this;
    vis.selectedCountry = 'Canada';

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width =
      vis.config.containerWidth -
      vis.config.margin.left -
      vis.config.margin.right;
    vis.height =
      vis.config.containerHeight -
      vis.config.margin.top -
      vis.config.margin.bottom;

    // Define size of SVG drawing area
    vis.svg = d3
      .select(vis.config.parentElement)
      .append('svg')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    // Append group element that will contain our actual chart
    // and position it according to the given margin config
    vis.chart = vis.svg
      .append('g')
      .attr(
        'transform',
        `translate(${vis.config.margin.left},${vis.config.margin.top})`
      );

    // Initialize projection and path generator
    vis.projection = d3.geoMercator();
    vis.geoPath = d3.geoPath().projection(vis.projection);

    vis.colorScale = d3
      .scaleLog()
      .range(['#bd0026', '#ffffcc'])
      .interpolate(d3.interpolateHcl);

    // Initialize gradient that we will later use for the legend
    vis.linearGradient = vis.svg
      .append('defs')
      .append('linearGradient')
      .attr('id', 'legend-gradient');

    // Append legend
    vis.legend = vis.chart
      .append('g')
      .attr('class', 'legend')
      .attr(
        'transform',
        `translate(${vis.config.legendLeft},${
          vis.height - vis.config.legendBottom
        })`
      );

    vis.legendRect = vis.legend
      .append('rect')
      .attr('width', vis.config.legendRectWidth)
      .attr('height', vis.config.legendRectHeight);

    vis.legendTitle = vis.legend
      .append('text')
      .attr('class', 'legend-title')
      .attr('dy', '.35em')
      .attr('y', -10)
      .text('Average TTC per Country');

    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    const codeDensityExtent = d3.extent(
      vis.data.features,
      (d) => d.properties.code_density
    );

    // Update color scale
    vis.colorScale.domain(codeDensityExtent);

    // Define begin and end of the color gradient (legend)
    vis.legendStops = [
      { color: '#bd0026', value: codeDensityExtent[0], offset: 0 },
      { color: '#ffffcc', value: codeDensityExtent[1], offset: 100 },
    ];

    vis.renderVis();
  }

  renderVis() {
    let vis = this;
    const countries = vis.data;

    // Defines the scale of the projection so that the geometry fits within the SVG area
    vis.projection.fitSize([vis.width, vis.height], countries);

    // Append world map
    const countryPath = vis.chart
      .selectAll('.country')
      .data(countries.features)
      .join('path')
      .attr('class', (d) => {
          return 'country'
        })
      .attr('d', vis.geoPath)
      .attr('fill', (d) => {
        if (d.properties.code_density) {
          return vis.colorScale(d.properties.code_density);
        } else {
          return 'url(#lightstripe)';
        }
      })
      .attr('pointer-events', (d) => {
        if (!d.properties.code_density) {
          return 'none';
        } else {
          return;
        }
      })
      .attr('opacity', (d) => {
        if (!d.properties.code_density) {
          return 0.4
        } else if (d.properties.name == vis.selectedCountry){
          return 1;
        } else {
          return 0.75;
        }
      })
      .attr('stroke', (d) => {
         if (d.properties.name == vis.selectedCountry){
          return '#1d1d1d'
        } else {
          return;
         }
      })
      .attr('stroke-width', (d) => {
        if (d.properties.name == vis.selectedCountry){
         return '2px'
       } else {
        return;
       }
     });

    countryPath
      .on('mousemove', (event, d) => {
        const codeDensity = d.properties.code_density
          ? `<strong>${d.properties.code_density}</strong> average password TTC in seconds`
          : 'No data available';
        d3
          .select('#tooltip')
          .style('display', 'block')
          .style('left', event.pageX + vis.config.tooltipPadding + 'px')
          .style('top', event.pageY + vis.config.tooltipPadding + 'px').html(`
              <div class="tooltip-title">${d.properties.name}</div>
              <div>${codeDensity}</div>
            `);
      })
      .on('mouseleave', () => {
        d3.select('#tooltip').style('display', 'none');
      })
      .on('click', function (event, d) {
        vis.dispatcher.call('countrySelect', event, d.properties.name);
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

    // Update gradient for legend
    vis.linearGradient
      .selectAll('stop')
      .data(vis.legendStops)
      .join('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', (d) => d.color);

    vis.legendRect.attr('fill', 'url(#legend-gradient)');
  }
}
