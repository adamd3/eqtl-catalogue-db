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

## Data Ingestion on a Server (with Docker)

To ingest the eQTL Catalogue data into the PostgreSQL database on a server using Docker, follow these steps:

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

## Data Ingestion and Backend Deployment (without Docker)

If you do not have `sudo` privileges to install Docker, you can deploy the backend and ingest data by connecting to an external PostgreSQL database. You will need access to an existing PostgreSQL database (e.g., a managed cloud service).

1.  **Clone the repository:**

    ```bash
    git clone <your-repo-url>
    cd eqtl-catalogue-db
    ```

    (Replace `<your-repo-url>` with the actual URL of your Git repository.)

2.  **Prepare the Python environment:**
    Ensure you have Python 3 installed. Create and activate a virtual environment for all project dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install all Python dependencies:**

    ```bash
    pip install -r backend/requirements.txt
    pip install -r data_ingestion/requirements.txt
    ```

4.  **Set the database connection string:**
    You _must_ set the `DATABASE_URL` environment variable to connect to your external PostgreSQL database. Replace `<your-external-database-url>` with your actual connection string.

    ```bash
    export DATABASE_URL="<your-external-database-url>"
    ```

    Example: `export DATABASE_URL="postgresql://user:password@host:port/database_name"`

5.  **Place your data files:**
    Ensure your `.cc.tsv.gz` data files are located in the `./data/` directory within the project root.

6.  **Run the data ingestion script:**

    ```bash
    python data_ingestion/ingest_data.py
    ```

    This script will create the necessary tables and load data into your external PostgreSQL database. This process can take a significant amount of time depending on the volume of data. Progress will be indicated in the console.

7.  **Run the FastAPI backend:**
    ```bash
    uvicorn backend.main:app --host 0.0.0.0 --port 8001 &
    ```
    This will start the FastAPI application in the background on port 8001. Ensure this port is available and accessible.

**Important Considerations for Deployment without Docker:**

- **External PostgreSQL:** You must have access to an external PostgreSQL database. This setup does not include a local database server.
- **Port Availability:** Ensure that port 8001 is available on your server and not blocked by any firewall rules.
- **Process Management:** For production environments, consider using a process manager (e.g., `systemd`, `supervisor`) to manage the FastAPI backend process, ensuring it restarts automatically if it crashes.
- **Security:** Be mindful of exposing your backend directly. Consider using a reverse proxy (like Nginx or Apache) for better security and performance in a production setting.

### Using Conda for Local PostgreSQL (without sudo)

If you cannot use Docker and do not have `sudo` privileges for system-wide PostgreSQL installation, you can install and run PostgreSQL within a Conda environment. This provides a local database instance without requiring root access, but comes with its own set of considerations.

1.  **Clone the repository:**

    ```bash
    git clone <your-repo-url>
    cd eqtl-catalogue-db
    ```

    (Replace `<your-repo-url>` with the actual URL of your Git repository.)

2.  **Create and activate a Conda environment with PostgreSQL:**
    Ensure Conda is installed on your server. Then, create an environment and install PostgreSQL:

    ```bash
    conda create -n eqtl_env python=3.9 postgresql -c conda-forge
    conda activate eqtl_env
    ```

3.  **Initialize the PostgreSQL data directory:**
    You need a dedicated directory for PostgreSQL to store its data. Create one in your home directory (or another suitable location):

    ```bash
    mkdir -p ./eqtl_pgdata
    initdb -D ./eqtl_pgdata
    ```

4.  **Start the PostgreSQL server:**

    ```bash
    pg_ctl -D ./eqtl_pgdata -l ./eqtl_pgdata/logfile start
    ```

    (To stop the server: `pg_ctl -D ./eqtl_pgdata stop`)
    _Note: You might need to adjust the port if 5432 is not available or desired. This can be done by editing `postgresql.conf` within `./eqtl_pgdata` before starting the server._

5.  **Create the database and user, and grant privileges:**
    Once the PostgreSQL server is running, create the database and a user with a password. Then, grant the necessary privileges to this user on the database.

    ```bash
    createdb eqtl_catalogue
    createuser --pwprompt user
    # Enter 'password' when prompted for the password

    # Connect to the database and grant privileges
    psql -d eqtl_catalogue -U [your_system_username] # Use the superuser or the user who created the database
    # Inside psql, run the following commands:
    GRANT CREATE ON SCHEMA public TO eqtl_user;
    GRANT ALL PRIVILEGES ON DATABASE eqtl_catalogue TO eqtl_user;
    ALTER DEFAULT PRIVILEGES FOR ROLE eqtl_user IN SCHEMA public GRANT ALL ON TABLES TO eqtl_user;
    ALTER DEFAULT PRIVILEGES FOR ROLE eqtl_user IN SCHEMA public GRANT ALL ON SEQUENCES TO eqtl_user;
    ALTER DEFAULT PRIVILEGES FOR ROLE eqtl_user IN SCHEMA public GRANT ALL ON FUNCTIONS TO eqtl_user;
    ALTER USER eqtl_user CREATEDB; # Optional: allows 'eqtl_user' to create databases, useful for some ORM operations
    \q # Exit psql
    ```

6.  **Install Python dependencies:**

    ```bash
    pip install -r backend/requirements.txt
    pip install -r data_ingestion/requirements.txt
    ```

7.  **Set the database connection string:**

    ```bash
    export DATABASE_URL="postgresql://eqtl_user:password@localhost:5432/eqtl_catalogue"
    ```

8.  **Place your data files:**
    Ensure your `.cc.tsv.gz` data files are located in the `./data/` directory within the project root.

9.  **Run the data ingestion script:**

    ```bash
    python data_ingestion/ingest_data.py
    ```

10. **Run the FastAPI backend:**
    ```bash
    uvicorn backend.main:app --host 0.0.0.0 --port 8001 &
    ```
    This will start the FastAPI application in the background on port 8001. Ensure this port is available and accessible.

**Considerations for Conda PostgreSQL:**

- **Resource Usage:** Running a full PostgreSQL server within your user space can consume significant CPU and RAM. Monitor your server's resources.
- **Performance:** Performance might be lower compared to a system-installed or Dockerized PostgreSQL, especially for high-throughput operations.
- **Management:** Starting, stopping, and managing the PostgreSQL server will be a manual process within your Conda environment. For long-running services, consider using a process manager (like `systemd` or `supervisor`) if available and configurable without `sudo`.
- **Persistence:** Ensure your `./eqtl_pgdata` directory is backed up regularly if it contains critical data.
