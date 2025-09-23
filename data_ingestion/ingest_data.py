import os
import glob
import pandas as pd
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from tqdm import tqdm
import gzip

# Database connection details
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/eqtl_catalogue")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Define the EQTLData model (must match the backend model)
class EQTLData(Base):
    __tablename__ = "eqtl_data"
    id = Column(Integer, primary_key=True, index=True)
    molecular_trait_id = Column(String, index=True)
    chromosome = Column(String, index=True)
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
    molecular_trait_object_id = Column(String)
    gene_id = Column(String, index=True)
    median_tpm = Column(Float)
    rsid = Column(String, index=True)

# Function to ingest data
def ingest_data(file_path: str):
    db = SessionLocal()
    try:
        # Read gzipped TSV using pandas
        df = pd.read_csv(file_path, sep='\t', compression='gzip')
        
        # Rename columns to match model attributes if necessary (e.g., if there are spaces or special chars)
        # For now, assuming column names in TSV match model attributes directly
        
        # Convert DataFrame to list of dictionaries, then to EQTLData objects
        data_to_insert = []
        for index, row in df.iterrows():
            # Handle potential NaN values for float columns by converting to None
            row_dict = row.to_dict()
            for key, value in row_dict.items():
                if pd.isna(value):
                    row_dict[key] = None
            data_to_insert.append(EQTLData(**row_dict))

        # Bulk insert data
        db.bulk_save_objects(data_to_insert)
        db.commit()
        print(f"Successfully ingested {len(data_to_insert)} rows from {file_path}")
    except Exception as e:
        db.rollback()
        print(f"Error ingesting data from {file_path}: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # Ensure tables are created (this should ideally be handled by the backend on startup)
    # But for standalone ingestion, it's good to have.
    Base.metadata.create_all(bind=engine)

    data_files = glob.glob("/Users/adamdinan/eqtl-catalogue-db/data/*.cc.tsv.gz")
    if not data_files:
        print("No .cc.tsv.gz files found in the ./data/ directory.")
    else:
        print(f"Found {len(data_files)} data files. Starting ingestion...")
        for file in tqdm(data_files, desc="Ingesting data files"):
            ingest_data(file)
        print("Data ingestion complete.")
