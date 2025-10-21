from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import create_engine, Column, Integer, Float, text, String, ForeignKey
from sqlalchemy.orm import sessionmaker, Session, relationship, declarative_base
import os
from typing import Optional
from pydantic import BaseModel

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Gene(Base):
    __tablename__ = "gene"
    gene_id = Column(String(30), primary_key=True, index=True)
    median_tpm = Column(Float)
    gene_name = Column(String(30), index=True)
    associations = relationship("Association", back_populates="gene")

class Variant(Base):
    __tablename__ = "variant"
    variant_id = Column(String(200), primary_key=True, index=True)
    rsid = Column(String, index=True)
    chromosome = Column(String, index=True)
    position = Column(Integer)
    ref = Column(String)
    alt = Column(String)
    associations = relationship("Association", back_populates="variant")

class Association(Base):
    __tablename__ = "association"
    id = Column(Integer, primary_key=True, index=True)
    variant_id = Column(String(200), ForeignKey("variant.variant_id"))
    gene_id = Column(String(30), ForeignKey("gene.gene_id"))
    pvalue = Column(Float, index=True)
    beta = Column(Float)
    se = Column(Float)
    gene = relationship("Gene", back_populates="associations")
    variant = relationship("Variant", back_populates="associations")
    
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

class VariantBase(BaseModel):
    variant_id: str
    rsid: Optional[str]
    chromosome: Optional[str]
    position: Optional[int]
    ref: Optional[str]
    alt: Optional[str]

    class Config:
        from_attributes = True

class GeneBase(BaseModel):
    gene_id: str
    median_tpm: Optional[float] = None
    gene_name: Optional[str] = None

    class Config:
        from_attributes = True

class AssociationBase(BaseModel):
    id: int
    pvalue: float
    beta: Optional[float] = None
    se: Optional[float] = None
    variant: VariantBase
    gene: GeneBase

    class Config:
        from_attributes = True

class EffectSizeResponse(BaseModel):
    beta: float
    se: float
    variant: VariantBase
    gene: GeneBase

    class Config:
        from_attributes = True

@app.get("/associations/", response_model=list[AssociationBase])
async def get_associations(
    gene_name: Optional[str] = None,
    p_value_threshold: float = 0.05,
    db: Session = Depends(get_db)
):
    query = db.query(Association).join(Gene).join(Variant)

    if gene_name:
        query = query.filter(Gene.gene_name == gene_name)
    
    query = query.filter(Association.pvalue <= p_value_threshold)
    
    return query.limit(100).all() # Limit to 100 for now to avoid large responses

@app.get("/effect_size/", response_model=EffectSizeResponse)
async def get_effect_size(
    variant_id: str,
    gene_id: str,
    db: Session = Depends(get_db)
):
    association = db.query(Association).join(Gene).join(Variant).filter(
        Association.variant_id == variant_id,
        Association.gene_id == gene_id
    ).first()

    if not association:
        raise HTTPException(status_code=404, detail="Effect size not found for the given variant and gene.")

    return association
