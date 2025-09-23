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

## Data Ingestion on a Server

To ingest the eQTL Catalogue data into the PostgreSQL database on a server, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd eqtl-catalogue-db
    ```
    (Replace `<your-repo-url>` with the actual URL of your Git repository.)

2.  **Start the database and backend services:**
    Ensure Docker and Docker Compose are installed on your server.
    ```bash
    docker-compose up --build -d
    ```
    This will build the backend Docker image and start both the PostgreSQL database and the FastAPI backend in detached mode.

3.  **Prepare the data ingestion environment:**
    First, ensure you have Python 3 installed. Then, create and activate a virtual environment for the data ingestion script:
    ```bash
    python3 -m venv data_ingestion/venv
    source data_ingestion/venv/bin/activate
    ```

4.  **Install data ingestion dependencies:**
    ```bash
    pip install -r data_ingestion/requirements.txt
    ```

5.  **Place your data files:**
    Ensure your `.cc.tsv.gz` data files are located in the `./data/` directory within the project root.

6.  **Run the data ingestion script:**
    ```bash
    python data_ingestion/ingest_data.py
    ```
    This script will read all `.cc.tsv.gz` files from the `./data/` directory and load them into the PostgreSQL database. This process can take a significant amount of time depending on the volume of data. Progress will be indicated in the console.

7.  **Verify data ingestion (Optional):**
    You can check the backend's health endpoint to ensure the database is connected:
    ```bash
    curl http://localhost:8001/health
    ```
    You can also try to query the `/eqtl_data/` endpoint (though it will return an empty list if no data has been ingested yet, or if the query parameters don't match any data).
    ```bash
    curl http://localhost:8001/eqtl_data/
    ```