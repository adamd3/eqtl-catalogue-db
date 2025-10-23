FROM postgres:13

# Copy the SQL dump files into the PostgreSQL initialization directory
# These scripts will be executed when the container starts for the first time
COPY ../data/gene.sql /docker-entrypoint-initdb.d/
COPY ../data/variant.sql /docker-entrypoint-initdb.d/
COPY ../data/association.sql /docker-entrypoint-initdb.d/