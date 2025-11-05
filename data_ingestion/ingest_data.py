import os
import glob
import pandas as pd
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from tqdm import tqdm
import gzip

# Database connection details
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://eqtl_user:password@localhost:5432/eqtl_catalogue")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Define the EQTLData model (must match the backend model)
class EQTLData(Base):
    __tablename__ = "eqtl_data"
    id = Column(Integer, primary_key=True, index=True)
    molecular_trait_id = Column(String, index=True)
    chromosome = Column(String(3), index=True)
    position = Column(Integer)
    ref = Column(String)
    alt = Column(String)
    variant = Column(String, index=True)
    ma_samples = Column(Integer)
    maf = Column(Float)
    pvalue = Column(Float, index=True)
    beta = Column(Float)
    se = Column(Float)
    type = Column(String)
    ac = Column(Integer)
    an = Column(Integer)
    r2 = Column(Float)
    gene_id = Column(String, index=True)
    median_tpm = Column(Float)
    rsid = Column(String, index=True)
    dataset_id = Column(String, index=True)


# Function to ingest data
def ingest_data(file_path: str):
    total_rows_ingested = 0
    try:
        # Extract dataset_id from file_path
        file_name = os.path.basename(file_path)
        dataset_id = file_name.split(".")[0]  # Assumes filename format like QTD000393.cc.tsv.gz

        # Read gzipped TSV in chunks using pandas
        # low_memory=True is used here to potentially reduce memory usage during parsing,
        # though chunksize is the primary mechanism for memory control.
        for chunk_df in pd.read_csv(file_path, sep="\t", compression="gzip", chunksize=1000, low_memory=True):
            # Add the dataset_id column to the DataFrame
            chunk_df["dataset_id"] = dataset_id

            # Replace NaN values with None for database compatibility within each chunk
            chunk_df = chunk_df.where(pd.notna(chunk_df), None)

            # Use to_sql for bulk insertion of each chunk
            # The 'multi' method is generally faster for PostgreSQL
            chunk_df.to_sql(EQTLData.__tablename__, con=engine, if_exists="append", index=False, method="multi")
            total_rows_ingested += len(chunk_df)
        print(f"Successfully ingested {total_rows_ingested} rows from {file_path}")
    except Exception as e:
        print(f"Error ingesting data from {file_path}: {e}")


if __name__ == "__main__":
    # Ensure tables are created (this should ideally be handled by the backend on startup)
    # But for standalone ingestion, it's good to have.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    data_files = glob.glob("./data/*.cc.tsv.gz")
    if not data_files:
        print("No .cc.tsv.gz files found in the ./data/ directory.")
    else:
        print(f"Found {len(data_files)} data files. Starting ingestion...")
        for file in tqdm(data_files, desc="Ingesting data files"):
            ingest_data(file)
        print("Data ingestion complete.")
