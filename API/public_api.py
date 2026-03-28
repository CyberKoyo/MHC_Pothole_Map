from fastapi import FastAPI, HTTPException, Query, Depends
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional

# Database configuration
DATABASE_URL = "sqlite:///./potholes.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 1. Updated SQLAlchemy Model
class Pothole(Base):
    __tablename__ = "potholes"
    
    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    
    # New searchable fields
    address = Column(String, index=True, nullable=True)
    zip_code = Column(String, index=True, nullable=True)
    borough = Column(String, index=True, nullable=True)
    
    # Kept for backward compatibility or extra notes
    location_description = Column(String, nullable=True)
    
    first_reported = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_reported = Column(DateTime, default=datetime.utcnow, nullable=False)
    occurrences = Column(Integer, default=1, nullable=False)

# 2. Updated Pydantic Schemas
class PotholeCreate(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None
    zip_code: Optional[str] = None
    borough: Optional[str] = None
    location_description: Optional[str] = None

class PotholeUpdate(BaseModel):
    address: Optional[str] = None
    zip_code: Optional[str] = None
    borough: Optional[str] = None
    location_description: Optional[str] = None
    last_reported: Optional[datetime] = None
    occurrences: Optional[int] = None

class PotholeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    latitude: float
    longitude: float
    # We add "= None" here to prevent the "Field required" validation error
    address: Optional[str] = None
    zip_code: Optional[str] = None
    borough: Optional[str] = None
    location_description: Optional[str] = None
    first_reported: datetime
    last_reported: datetime
    occurrences: int

# Dependency for database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI(title="Pothole Tracker API")

# 3. Updated GET Endpoint with search logic
@app.get("/potholes/", response_model=List[PotholeResponse])
def list_potholes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    borough: Optional[str] = None,
    zip_code: Optional[str] = None,
    address: Optional[str] = None,
    min_occurrences: Optional[int] = Query(None, ge=0),
    max_occurrences: Optional[int] = Query(None, ge=0),
    sort_by_frequency: bool = False,
    db: Session = Depends(get_db)
):
    """
    List potholes with filters for location and occurrence count.
    Set sort_by_frequency=True to see the most reported potholes first.
    """
    query = db.query(Pothole)

    # Location Filters
    if borough:
        query = query.filter(Pothole.borough.ilike(f"%{borough}%"))
    if zip_code:
        query = query.filter(Pothole.zip_code == zip_code)
    if address:
        query = query.filter(Pothole.address.ilike(f"%{address}%"))

    # Occurrence Filters
    if min_occurrences is not None:
        query = query.filter(Pothole.occurrences >= min_occurrences)
    if max_occurrences is not None:
        query = query.filter(Pothole.occurrences <= max_occurrences)

    # Sorting logic
    if sort_by_frequency:
        query = query.order_by(Pothole.occurrences.desc())
    else:
        query = query.order_by(Pothole.id.asc())

    return query.offset(skip).limit(limit).all()

@app.get("/stats/")
def get_stats(db: Session = Depends(get_db)):
    """Get general statistics"""
    from sqlalchemy import func
    
    total = db.query(Pothole).count()
    total_occurrences = db.query(func.sum(Pothole.occurrences)).scalar() or 0
    
    return {
        "total_potholes": total,
        "total_occurrences": total_occurrences,
        "average_occurrences": round(total_occurrences / total, 2) if total > 0 else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)