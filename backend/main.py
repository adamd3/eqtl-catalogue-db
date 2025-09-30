from fastapi import FastAPI, Depends, HTTPException
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import create_engine, Column, Integer, String, Float, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import os

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class EQTLData(Base):
    __tablename__ = "eqtl_data"
    id = Column(Integer, primary_key=True, index=True) # Add a primary key
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

import time

# ... (rest of the imports and definitions)

# Retry mechanism for database table creation
MAX_RETRIES = 5
RETRY_DELAY = 5  # seconds

for i in range(MAX_RETRIES):
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
        break
    except Exception as e:
        print(f"Attempt {i+1}/{MAX_RETRIES}: Could not connect to database or create tables. Retrying in {RETRY_DELAY} seconds... Error: {e}")
        time.sleep(RETRY_DELAY)
else:
    print("Failed to connect to database and create tables after multiple retries.")
    exit(1) # Exit if unable to connect after retries

app = FastAPI()

# Dependency to get the DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
async def read_root():
    return {"message": "Welcome to the eQTL Catalogue Backend!"}

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        # Try to make a simple query to the database
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {e}")

@app.get("/eqtl_data/")
async def get_eqtl_data(
    molecular_trait_id: str = None,
    gene_id: str = None,
    chromosome: str = None,
    variant: str = None,
    p_value_threshold: float = None,
    db: Session = Depends(get_db)
):
    query = db.query(EQTLData)
    if molecular_trait_id:
        query = query.filter(EQTLData.molecular_trait_id == molecular_trait_id)
    if gene_id:
        query = query.filter(EQTLData.gene_id == gene_id)
    if chromosome:
        query = query.filter(EQTLData.chromosome == chromosome)
    if variant:
        query = query.filter(EQTLData.variant == variant)
    if p_value_threshold:
        query = query.filter(EQTLData.pvalue <= p_value_threshold)
    
    return query.limit(100).all() # Limit to 100 for now to avoid large responses
