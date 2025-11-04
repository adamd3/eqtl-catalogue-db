import * as d3 from 'd3';
import './style.css';

const API_BASE_URL = 'http://localhost:8001'; // Your FastAPI backend URL

let currentZoomBehavior; // Global variable to store the D3 zoom behavior
let currentSvgElement; // Global variable to store the main SVG element
let selectedLocusPoint = null; // Global variable to store the currently selected locus plot point
let selectedVariantId = null;
let selectedGeneId = null;
let currentTableSortColumn = 'position'; // Default sort column
let currentTableSortOrder = 'asc'; // Default sort order
let currentTableData = []; // Store the full data for sorting

// Function to handle selection of a variant, updating both plot and table
function selectVariant(variantId, geneId) {
  // Clear previous selections
  d3.selectAll('.selected-point')
    .attr('r', 5)
    .attr('fill', 'steelblue')
    .classed('selected-point', false);
  d3.selectAll('#results-table tbody tr').classed('selected', false);

  // Highlight new point in Locus Plot
  d3.select(`#locus-plot circle[data-variant-id="${variantId}"]`)
    .attr('r', 8)
    .attr('fill', 'red')
    .classed('selected-point', true);

  // Highlight new row in Results Table
  d3.select(`#results-table tbody tr[data-variant-id="${variantId}"]`)
    .classed('selected', true);

  // Update global selected IDs
  selectedVariantId = variantId;
  selectedGeneId = geneId;

  // Fetch and render effect size plot
  fetchEffectSize(variantId, geneId);
}

document.addEventListener('DOMContentLoaded', () => {
  const searchButton = document.getElementById('search-button');
  const geneSearchInput = document.getElementById('gene-search');

  searchButton.addEventListener('click', () => {
    const geneName = geneSearchInput.value.trim();
    if (geneName) {
      fetchAssociations(geneName);
    } else {
      alert('Please enter a gene name.');
    }
  });

  // Add event listeners for zoom buttons
  const zoomInButton = document.getElementById('zoom-in');
  const zoomOutButton = document.getElementById('zoom-out');

  zoomInButton.addEventListener('click', () => {
    if (currentSvgElement && currentZoomBehavior) {
      const svgNode = currentSvgElement.node();
      const currentTransform = d3.zoomTransform(svgNode);
      currentSvgElement.transition().call(currentZoomBehavior.scaleBy, 1.2);
    }
  });

  zoomOutButton.addEventListener('click', () => {
    if (currentSvgElement && currentZoomBehavior) {
      const svgNode = currentSvgElement.node();
      const currentTransform = d3.zoomTransform(svgNode);
      currentSvgElement.transition().call(currentZoomBehavior.scaleBy, 1 / 1.2);
    }
  });

  const downloadButton = document.getElementById('download-results-button');
  downloadButton.addEventListener('click', downloadResultsAsCsv);
});

function downloadResultsAsCsv() {
  if (currentTableData.length === 0) {
    alert('No data to download.');
    return;
  }

  const headers = [
    'Variant ID',
    'RSID',
    'Gene ID',
    'Gene Name',
    'P-value',
    'Beta',
    'SE',
    'Position',
  ];

  const rows = currentTableData.map((d) => [
    d.variant.variant_id,
    d.variant.rsid || 'N/A',
    d.gene.gene_id,
    d.gene.gene_name || 'N/A',
    d.pvalue.toExponential(2),
    d.beta.toFixed(3),
    d.se.toFixed(3),
    d.variant.position,
  ]);

  let csvContent = headers.join(',') + '\n';
  rows.forEach((row) => {
    csvContent += row.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'eqtl_results.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function fetchAssociations(geneName) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/associations/?gene_name=${geneName}&p_value_threshold=0.05`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Associations data:', data);

    let exons = [];
    if (data.length > 0) {
      const geneId = data[0].gene.gene_id;
      exons = await fetchExons(geneId);
    }

    renderLocusPlot(data, geneName, exons);
    populateResultsTable(data);
  } catch (error) {
    console.error('Error fetching associations:', error);
    alert('Failed to fetch associations. Please try again.');
  }
}

async function fetchExons(geneId) {
  try {
    const response = await fetch(`${API_BASE_URL}/exons/${geneId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Exons data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching exons:', error);
    return [];
  }
}

async function fetchEffectSize(variantId, geneId) {
  console.log(
    `Fetching effect size for variant: ${variantId}, gene: ${geneId}`
  );
  try {
    const response = await fetch(
      `${API_BASE_URL}/effect_size/?variant_id=${variantId}&gene_id=${geneId}`
    );
    console.log('Effect size fetch response status:', response.status);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Effect size data:', data);
    renderEffectSizePlot(data);
  } catch (error) {
    console.error('Error fetching effect size:', error);
    alert('Failed to fetch effect size. Please try again.');
  }
}

function renderLocusPlot(data, geneName, exons) {
  const margin = { top: 20, right: 30, bottom: 120, left: 60 }; // Reverted bottom margin
  const width = 960 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom; // Adjusted height

  let geneStart = null;
  let geneEnd = null;

  const locusPlotDiv = d3.select('#locus-plot');
  locusPlotDiv.html(''); // Clear previous plot

  // Show zoom controls
  d3.select('.zoom-controls').style('display', 'block');

  const svg = locusPlotDiv
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  currentSvgElement = d3.select(svg.node().parentNode); // Store the parent SVG element

  // Process data for plotting
  data.forEach((d) => {
    d.logP = -Math.log10(d.pvalue);
    d.position = +d.variant.position; // Ensure position is a number
  });

  // Scales
  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.position))
    .range([0, width]);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.logP) * 1.1]) // 10% buffer
    .range([height, 0]);

  // Axes
  const formatPosition = (d) => {
    return parseFloat((d / 1000000).toFixed(2));
  };

  const xAxis = d3.axisBottom(xScale).tickFormat(formatPosition);
  const yAxis = d3.axisLeft(yScale);

  svg
    .append('g')
    .attr('class', 'x-axis') // Added class
    .attr('transform', `translate(0,${height})`)
    .call(xAxis)
    .style('font-size', '18px') // 75% of 24px
    .selectAll('text') // Select all text elements within the x-axis group
    .style('text-anchor', 'end') // Anchor the text to the end for proper rotation
    .attr('dx', '-.8em') // Adjust position after rotation
    .attr('dy', '.15em') // Adjust position after rotation
    .attr('transform', 'rotate(-45)'); // Rotate by -45 degrees

  // Append x-axis title directly to the main SVG group, not the x-axis group
  svg
    .append('text')
    .attr('class', 'x-axis-title') // Add a class for easier selection
    .attr('y', height + margin.bottom - 5) // Position below the x-axis
    .attr('x', width / 2)
    .attr('fill', 'black')
    .attr('text-anchor', 'middle')
    .style('font-size', '21px') // 75% of 28px
    .text('Position (Mb)');

  svg
    .append('g')
    .attr('class', 'y-axis') // Added class
    .call(yAxis)
    .style('font-size', '18px') // 75% of 24px
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -margin.left + 15)
    .attr('x', -height / 2)
    .attr('fill', 'black')
    .attr('text-anchor', 'middle')
    .style('font-size', '21px') // 75% of 28px
    .text('-log10(P-value)');

  // Zoom and Pan
  const zoom = d3
    .zoom()
    .scaleExtent([1, 10])
    .extent([
      [0, 0],
      [width, height],
    ])
    .on('zoom', zoomed);

  currentZoomBehavior = zoom; // Store the zoom behavior globally

  svg
    .append('rect')
    .attr('width', width)
    .attr('height', height)
    .style('fill', 'none')
    .style('pointer-events', 'all')
    .call(zoom);

  const scatter = svg.append('g').attr('clip-path', 'url(#clip)');

  scatter
    .selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', (d) => xScale(d.position))
    .attr('cy', (d) => yScale(d.logP))
    .attr('r', 5)
    .attr('fill', 'steelblue')
    .attr('data-variant-id', (d) => d.variant.variant_id) // Add data attribute
    .on('mouseover', function () {
      if (!d3.select(this).classed('selected-point')) {
        d3.select(this).attr('r', 8).attr('fill', 'orange');
      }
    })
    .on('mouseout', function () {
      if (!d3.select(this).classed('selected-point')) {
        d3.select(this).attr('r', 5).attr('fill', 'steelblue');
      }
    })
    .on('click', function (event, d) {
      selectVariant(d.variant.variant_id, d.gene.gene_id);
    })
    .append('title') // Tooltip
    .text(
      (d) =>
        `RSID: ${d.variant.rsid || 'N/A'}\nVariant: ${d.variant.variant_id}\nGene: ${
          d.gene.gene_name || d.gene.gene_id
        }\nP-value: ${d.pvalue.toExponential(2)}\nBeta: ${d.beta.toFixed(
          3
        )}\nSE: ${d.se.toFixed(3)}`
    );

  // If a variant was previously selected, re-select it to maintain highlight
  if (selectedVariantId && selectedGeneId) {
    selectVariant(selectedVariantId, selectedGeneId);
  }

  function zoomed(event) {
    const newXScale = event.transform.rescaleX(xScale);
    svg
      .select('.x-axis')
      .call(d3.axisBottom(newXScale).tickFormat(formatPosition))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');
    scatter.selectAll('circle').attr('cx', (d) => newXScale(d.position));

    // Update gene body line
    if (geneStart !== null && geneEnd !== null) {
      svg
        .selectAll('.gene-body-line')
        .attr('x1', newXScale(geneStart))
        .attr('x2', newXScale(geneEnd));
    }

    // Update exons
    svg
      .selectAll('.exon')
      .attr('x', (d) => newXScale(d.start_position))
      .attr(
        'width',
        (d) => newXScale(d.end_position) - newXScale(d.start_position)
      );

    // Update gene name label
    svg
      .selectAll('.gene-name-label')
      .attr('x', newXScale((geneStart + geneEnd) / 2));

    // Update x-axis title position
    svg
      .select('.x-axis-title')
      .attr('x', newXScale(d3.mean(data, (d) => d.position)));
  }

  // Clip path for zooming
  svg
    .append('defs')
    .append('clipPath')
    .attr('id', 'clip')
    .append('rect')
    .attr('width', width)
    .attr('height', height);

  // Gene Track
  const geneTrackY = height + 60; // Position below the x-axis
  const geneTrackHeight = 20;

  if (exons && exons.length > 0) {
    geneStart = d3.min(exons, (d) => d.start_position);
    geneEnd = d3.max(exons, (d) => d.end_position);

    // Draw gene body (a line across the extent of the gene)
    svg
      .append('line')
      .attr('class', 'gene-body-line') // Add a class for easier selection
      .attr('x1', xScale(geneStart))
      .attr('y1', geneTrackY + geneTrackHeight / 2)
      .attr('x2', xScale(geneEnd))
      .attr('y2', geneTrackY + geneTrackHeight / 2)
      .attr('stroke', 'black')
      .attr('stroke-width', 1);

    // Draw exons
    svg
      .selectAll('.exon')
      .data(exons)
      .enter()
      .append('rect')
      .attr('class', 'exon')
      .attr('x', (d) => xScale(d.start_position))
      .attr('y', geneTrackY)
      .attr('width', (d) => xScale(d.end_position) - xScale(d.start_position))
      .attr('height', geneTrackHeight)
      .attr('fill', 'darkgreen');

    // Add gene name below the gene track
    svg
      .append('text')
      .attr('class', 'gene-name-label') // Add a class for easier selection
      .attr('x', xScale((geneStart + geneEnd) / 2))
      .attr('y', geneTrackY + geneTrackHeight + 20) // Position below exons
      .attr('text-anchor', 'middle')
      .style('font-style', 'italic')
      .style('font-size', '16px')
      .text(geneName);
  }
}

function renderEffectSizePlot(data) {
  const margin = { top: 50, right: 30, bottom: 40, left: 60 }; // Increased top margin
  const width = 400 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const effectSizePlotDiv = d3.select('#effect-size-plot');
  effectSizePlotDiv.html(''); // Clear previous plot

  const svg = effectSizePlotDiv
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Add title
  svg
    .append('text')
    .attr('x', width / 2)
    .attr('y', 0 - margin.top / 2)
    .attr('text-anchor', 'middle')
    .style('font-size', '22px') // Reduced font size by ~10%
    .style('text-decoration', 'underline')
    .text(`Effect Size: ${data.variant.rsid || data.variant.variant_id}`);

  // Add p-value annotation
  svg
    .append('text')
    .attr('x', width - 5) // Move slightly more to the right
    .attr('y', 0 - margin.top / 2 + 20) // Adjust y position for new margin.top
    .attr('text-anchor', 'end') // Anchor to the end for right alignment
    .style('font-size', '14px') // Smaller font size
    .text(`P-value: ${data.pvalue.toExponential(2)}`);

  // Data for bar chart (beta and SE)
  const plotData = [{ label: 'Beta', value: data.beta, error: data.se }];

  // Calculate 95% Confidence Interval
  const lowerCI = (data.beta - 1.96 * data.se).toFixed(3);
  const upperCI = (data.beta + 1.96 * data.se).toFixed(3);

  // Scales
  const yMin = d3.min(plotData, (d) => d.value - d.error);
  const yMax = d3.max(plotData, (d) => d.value + d.error);
  const yScale = d3
    .scaleLinear()
    .domain([Math.min(0, yMin) * 1.1, Math.max(0, yMax) * 1.1]) // Ensure 0 is included and add 10% buffer
    .range([height, 0]);

  const xScale = d3
    .scaleBand()
    .domain(plotData.map((d) => d.label))
    .range([0, width])
    .padding(0.5);

  // Axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);

  svg
    .append('g')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis)
    .style('font-size', '18px');

  svg
    .append('g')
    .call(yAxis)
    .style('font-size', '18px') // 75% of 24px
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -margin.left + 15)
    .attr('x', -height / 2)
    .attr('fill', 'black')
    .attr('text-anchor', 'middle')
    .style('font-size', '21px') // 75% of 28px
    .text('Effect Size');

  // Bars
  svg
    .selectAll('.bar')
    .data(plotData)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', (d) => xScale(d.label))
    .attr('y', (d) => yScale(Math.max(0, d.value)))
    .attr('width', xScale.bandwidth())
    .attr('height', (d) => Math.abs(yScale(d.value) - yScale(0)))
    .attr('fill', 'teal');

  // Error bars
  svg
    .selectAll('.error-line')
    .data(plotData)
    .enter()
    .append('line')
    .attr('class', 'error-line')
    .attr('x1', (d) => xScale(d.label) + xScale.bandwidth() / 2)
    .attr('y1', (d) => yScale(d.value - d.error))
    .attr('x2', (d) => xScale(d.label) + xScale.bandwidth() / 2)
    .attr('y2', (d) => yScale(d.value + d.error))
    .attr('stroke', 'black')
    .attr('stroke-width', 1.5);

  // Error bar caps
  svg
    .selectAll('.error-cap')
    .data(plotData)
    .enter()
    .append('line')
    .attr('class', 'error-cap')
    .attr('x1', (d) => xScale(d.label) + xScale.bandwidth() / 2 - 5)
    .attr('y1', (d) => yScale(d.value - d.error))
    .attr('x2', (d) => xScale(d.label) + xScale.bandwidth() / 2 + 5)
    .attr('y2', (d) => yScale(d.value - d.error))
    .attr('stroke', 'black')
    .attr('stroke-width', 1.5);

  svg
    .selectAll('.error-cap-top')
    .data(plotData)
    .enter()
    .append('line')
    .attr('class', 'error-cap-top')
    .attr('x1', (d) => xScale(d.label) + xScale.bandwidth() / 2 - 5)
    .attr('y1', (d) => yScale(d.value + d.error))
    .attr('x2', (d) => xScale(d.label) + xScale.bandwidth() / 2 + 5)
    .attr('y2', (d) => yScale(d.value + d.error))
    .attr('stroke', 'black')
    .attr('stroke-width', 1.5);

  // Add 95% Confidence Interval text
  svg
    .append('text')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom / 2 + 20) // Moved down slightly
    .attr('text-anchor', 'middle')
    .style('font-size', '18px')
    .text(`95% CI: [${lowerCI}, ${upperCI}]`);
}

function populateResultsTable(data) {
  currentTableData = data; // Store the data globally
  const table = d3.select('#results-table table');
  const thead = table.select('thead');
  const tbody = table.select('tbody');

  tbody.html(''); // Clear previous results

  if (data.length === 0) {
    tbody
      .append('tr')
      .append('td')
      .attr('colspan', 8) // Updated colspan for new column
      .text('No associations found.');
    return;
  }

  // Add click listeners to headers for sorting
  thead.selectAll('th').on('click', function() {
    const column = d3.select(this).attr('data-column');
    if (column) {
      if (currentTableSortColumn === column) {
        currentTableSortOrder = currentTableSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentTableSortColumn = column;
        currentTableSortOrder = 'asc';
      }
      sortAndRenderTable();
    }
  });

  // Initial sort and render
  sortAndRenderTable();
}

function sortAndRenderTable() {
  const tbody = d3.select('#results-table tbody');
  tbody.html(''); // Clear previous results

  // Sort the data
  const sortedData = [...currentTableData].sort((a, b) => {
    let valA, valB;

    switch (currentTableSortColumn) {
      case 'variant_id':
        valA = a.variant.variant_id;
        valB = b.variant.variant_id;
        break;
      case 'rsid':
        valA = a.variant.rsid;
        valB = b.variant.rsid;
        break;
      case 'gene_id':
        valA = a.gene.gene_id;
        valB = b.gene.gene_id;
        break;
      case 'gene_name':
        valA = a.gene.gene_name;
        valB = b.gene.gene_name;
        break;
      case 'pvalue':
        valA = a.pvalue;
        valB = b.pvalue;
        break;
      case 'beta':
        valA = a.beta;
        valB = b.beta;
        break;
      case 'se':
        valA = a.se;
        valB = b.se;
        break;
      case 'position':
        valA = a.variant.position;
        valB = b.variant.position;
        break;
      default:
        return 0;
    }

    if (valA < valB) {
      return currentTableSortOrder === 'asc' ? -1 : 1;
    }
    if (valA > valB) {
      return currentTableSortOrder === 'asc' ? 1 : -1;
    }
    return 0;
  });

  sortedData.forEach((association) => {
    const row = tbody.append('tr')
      .attr('data-variant-id', association.variant.variant_id) // Add data attribute
      .on('click', (event) => {
        selectVariant(association.variant.variant_id, association.gene.gene_id);
      });
    row.append('td').text(association.variant.variant_id);
    row.append('td').text(association.variant.rsid || 'N/A');
    row.append('td').text(association.gene.gene_id);
    row.append('td').text(association.gene.gene_name || 'N/A');
    row.append('td').text(association.pvalue.toExponential(2));
    row.append('td').text(association.beta.toFixed(3));
    row.append('td').text(association.se.toFixed(3));
    row.append('td').text(association.variant.position);
  });

  // Re-highlight the selected variant if one exists
  if (selectedVariantId && selectedGeneId) {
    selectVariant(selectedVariantId, selectedGeneId);
  }
}
