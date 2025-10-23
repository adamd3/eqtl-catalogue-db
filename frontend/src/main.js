import * as d3 from 'd3';
import './style.css';

const API_BASE_URL = 'http://localhost:8001'; // Your FastAPI backend URL

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
});

async function fetchAssociations(geneName) {
    try {
        const response = await fetch(`${API_BASE_URL}/associations/?gene_name=${geneName}&p_value_threshold=0.05`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Associations data:', data);
        renderLocusPlot(data, geneName);
        populateResultsTable(data);
    } catch (error) {
        console.error('Error fetching associations:', error);
        alert('Failed to fetch associations. Please try again.');
    }
}

async function fetchEffectSize(variantId, geneId) {
    try {
        const response = await fetch(`${API_BASE_URL}/effect_size/?variant_id=${variantId}&gene_id=${geneId}`);
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

function renderLocusPlot(data, geneName) {
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 960 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const locusPlotDiv = d3.select('#locus-plot');
    locusPlotDiv.html(''); // Clear previous plot

    const svg = locusPlotDiv.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add title
    svg.append('text')
        .attr('x', (width / 2))
        .attr('y', 0 - (margin.top / 2))
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('text-decoration', 'underline')
        .text(`Locus Plot for Gene: ${geneName}`);

    // Process data for plotting
    data.forEach(d => {
        d.logP = -Math.log10(d.pvalue);
        d.position = +d.variant.position; // Ensure position is a number
    });

    // Scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.position))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.logP) * 1.1]) // 10% buffer
        .range([height, 0]);

    // Axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis)
        .append('text')
        .attr('y', margin.bottom - 5)
        .attr('x', width / 2)
        .attr('fill', 'black')
        .text('Position');

    svg.append('g')
        .call(yAxis)
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 15)
        .attr('x', -height / 2)
        .attr('fill', 'black')
        .attr('text-anchor', 'middle')
        .text('-log10(P-value)');

    // Zoom and Pan
    const zoom = d3.zoom()
        .scaleExtent([1, 10])
        .extent([[0, 0], [width, height]])
        .on('zoom', zoomed);

    const scatter = svg.append('g')
        .attr('clip-path', 'url(#clip)');

    scatter.selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.position))
        .attr('cy', d => yScale(d.logP))
        .attr('r', 3)
        .attr('fill', 'steelblue')
        .on('click', (event, d) => {
            fetchEffectSize(d.variant.variant_id, d.gene.gene_id);
        })
        .append('title') // Tooltip
        .text(d => `Variant: ${d.variant.rsid || d.variant.variant_id}\nGene: ${d.gene.gene_name || d.gene.gene_id}\nP-value: ${d.pvalue.toExponential(2)}\nBeta: ${d.beta.toFixed(3)}\nSE: ${d.se.toFixed(3)}`);

    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .call(zoom);

    function zoomed(event) {
        const newXScale = event.transform.rescaleX(xScale);
        svg.select('.x.axis').call(xAxis.scale(newXScale));
        scatter.selectAll('circle')
            .attr('cx', d => newXScale(d.position));
    }

    // Clip path for zooming
    svg.append('defs').append('clipPath')
        .attr('id', 'clip')
        .append('rect')
        .attr('width', width)
        .attr('height', height);
}

function renderEffectSizePlot(data) {
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 400 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const effectSizePlotDiv = d3.select('#effect-size-plot');
    effectSizePlotDiv.html(''); // Clear previous plot

    const svg = effectSizePlotDiv.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add title
    svg.append('text')
        .attr('x', (width / 2))
        .attr('y', 0 - (margin.top / 2))
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('text-decoration', 'underline')
        .text(`Effect Size for ${data.variant.rsid || data.variant.variant_id}`);

    // Data for bar chart (beta and SE)
    const plotData = [
        { label: 'Beta', value: data.beta, error: data.se }
    ];

    // Scales
    const yScale = d3.scaleLinear()
        .domain([d3.min(plotData, d => d.value - d.error) * 1.1, d3.max(plotData, d => d.value + d.error) * 1.1]) // 10% buffer
        .range([height, 0]);

    const xScale = d3.scaleBand()
        .domain(plotData.map(d => d.label))
        .range([0, width])
        .padding(0.5);

    // Axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis);

    svg.append('g')
        .call(yAxis)
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 15)
        .attr('x', -height / 2)
        .attr('fill', 'black')
        .attr('text-anchor', 'middle')
        .text('Effect Size (Beta)');

    // Bars
    svg.selectAll('.bar')
        .data(plotData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.label))
        .attr('y', d => yScale(Math.max(0, d.value)))
        .attr('width', xScale.bandwidth())
        .attr('height', d => Math.abs(yScale(d.value) - yScale(0)))
        .attr('fill', 'teal');

    // Error bars
    svg.selectAll('.error-line')
        .data(plotData)
        .enter()
        .append('line')
        .attr('class', 'error-line')
        .attr('x1', d => xScale(d.label) + xScale.bandwidth() / 2)
        .attr('y1', d => yScale(d.value - d.error))
        .attr('x2', d => xScale(d.label) + xScale.bandwidth() / 2)
        .attr('y2', d => yScale(d.value + d.error))
        .attr('stroke', 'black')
        .attr('stroke-width', 1.5);

    // Error bar caps
    svg.selectAll('.error-cap')
        .data(plotData)
        .enter()
        .append('line')
        .attr('class', 'error-cap')
        .attr('x1', d => xScale(d.label) + xScale.bandwidth() / 2 - 5)
        .attr('y1', d => yScale(d.value - d.error))
        .attr('x2', d => xScale(d.label) + xScale.bandwidth() / 2 + 5)
        .attr('y2', d => yScale(d.value - d.error))
        .attr('stroke', 'black')
        .attr('stroke-width', 1.5);

    svg.selectAll('.error-cap-top')
        .data(plotData)
        .enter()
        .append('line')
        .attr('class', 'error-cap-top')
        .attr('x1', d => xScale(d.label) + xScale.bandwidth() / 2 - 5)
        .attr('y1', d => yScale(d.value + d.error))
        .attr('x2', d => xScale(d.label) + xScale.bandwidth() / 2 + 5)
        .attr('y2', d => yScale(d.value + d.error))
        .attr('stroke', 'black')
        .attr('stroke-width', 1.5);
}

function populateResultsTable(data) {
    const tbody = d3.select('#results-table tbody');
    tbody.html(''); // Clear previous results

    if (data.length === 0) {
        tbody.append('tr').append('td').attr('colspan', 7).text('No associations found.');
        return;
    }

    data.forEach(association => {
        const row = tbody.append('tr');
        row.append('td').text(association.variant.variant_id);
        row.append('td').text(association.variant.rsid || 'N/A');
        row.append('td').text(association.gene.gene_id);
        row.append('td').text(association.gene.gene_name || 'N/A');
        row.append('td').text(association.pvalue.toExponential(2));
        row.append('td').text(association.beta.toFixed(3));
        row.append('td').text(association.se.toFixed(3));
    });
}
