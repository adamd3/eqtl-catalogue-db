# eQTL Catalogue Interactive Browser

## Overview

The goal of this project is to create a public, web-based application for exploring eQTL (expression Quantitative Trait Loci) data from the EMBL-EBI eQTL Catalogue. This tool will serve as a more user-friendly and performant alternative to the existing API by leveraging a custom-built, optimized database. The application will enable researchers and the public to easily search, filter, and visualize complex genetic association data in a specific cell type, tissue, or study.

## Core Architecture

1. The Data Pipeline & Database

   - Data Source: eQTL Catalogue flat files (via FTP).
   - Database: PostgreSQL, a powerful and robust relational database, will be used to store the parsed and structured data.
   - Ingestion: A custom Python script will be developed to handle the data download, parsing, and loading into the PostgreSQL database.

2. The Backend

   - Framework: FastAPI, a modern, high-performance Python web framework, will be used to create the RESTful API.
   - Functionality: The API will expose a set of endpoints that allow the frontend to query the PostgreSQL database efficiently, retrieving data filtered by parameters such as cell type, gene ID, or variant ID.

3. The Frontend

   - Framework: React, a popular JavaScript library for building user interfaces, will be used to create the interactive web application.
   - Visualization: D3.js will be integrated to create powerful and dynamic data visualizations, such as Manhattan plots, LocusZoom plots, and interactive tables.
