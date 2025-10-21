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
        renderLocusPlot(data);
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

function renderLocusPlot(data) {
    // Placeholder for D3.js Locus Plot rendering logic
    const locusPlotDiv = d3.select('#locus-plot');
    locusPlotDiv.html(''); // Clear previous plot
    locusPlotDiv.append('p').text('Locus Plot will be rendered here for ' + data.length + ' associations.');

    // Example: Add click event to trigger effect size plot (this would be on a data point in a real plot)
    if (data.length > 0) {
        const firstAssociation = data[0];
        locusPlotDiv.append('button')
            .text('Show Effect Size for first variant')
            .on('click', () => fetchEffectSize(firstAssociation.variant.variant_id, firstAssociation.gene.gene_id));
    }
}

function renderEffectSizePlot(data) {
    // Placeholder for D3.js Effect Size Plot rendering logic
    const effectSizePlotDiv = d3.select('#effect-size-plot');
    effectSizePlotDiv.html(''); // Clear previous plot
    effectSizePlotDiv.append('p').text(`Effect Size Plot for Variant: ${data.variant.rsid || data.variant.variant_id}, Gene: ${data.gene.gene_name || data.gene.gene_id} (Beta: ${data.beta.toFixed(3)}, SE: ${data.se.toFixed(3)})`);
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