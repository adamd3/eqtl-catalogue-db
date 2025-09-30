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


# Function to ingest data
def ingest_data(file_path: str):
    try:
        # Read gzipped TSV using pandas
        df = pd.read_csv(file_path, sep="\t", compression="gzip", low_memory=False)

        # Rename columns to match model attributes if necessary (e.g., if there are spaces or special chars)
        # For now, assuming column names in TSV match model attributes directly

        # Replace NaN values with None for database compatibility
        df = df.where(pd.notna(df), None)

        # Use to_sql for bulk insertion
        # The 'multi' method is generally faster for PostgreSQL
        df.to_sql(EQTLData.__tablename__, con=engine, if_exists="append", index=False, method="multi")
        print(f"Successfully ingested {len(df)} rows from {file_path}")
    except Exception as e:
        print(f"Error ingesting data from {file_path}: {e}")


if __name__ == "__main__":
    # Ensure tables are created (this should ideally be handled by the backend on startup)
    # But for standalone ingestion, it's good to have.
    Base.metadata.create_all(bind=engine)

    data_files = glob.glob("./data/*.cc.tsv.gz")
    if not data_files:
        print("No .cc.tsv.gz files found in the ./data/ directory.")
    else:
        print(f"Found {len(data_files)} data files. Starting ingestion...")
        for file in tqdm(data_files, desc="Ingesting data files"):
            ingest_data(file)
        print("Data ingestion complete.")
