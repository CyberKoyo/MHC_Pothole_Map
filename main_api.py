from fastapi import FastAPI, HTTPException, Query
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# Database setup
DATABASE_URL = "sqlite:///./potholes.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# SQLAlchemy model
class PotholeDB(Base):
    __tablename__ = "potholes"
    
    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_description = Column(String, nullable=True)
    first_reported = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_reported = Column(DateTime, default=datetime.utcnow, nullable=False)
    occurrences = Column(Integer, default=1, nullable=False)

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic models for request/response
class PotholeCreate(BaseModel):
    latitude: float
    longitude: float
    location_description: Optional[str] = None

class PotholeUpdate(BaseModel):
    location_description: Optional[str] = None
    last_reported: Optional[datetime] = None
    occurrences: Optional[int] = None

class PotholeResponse(BaseModel):
    id: int
    latitude: float
    longitude: float
    location_description: Optional[str]
    first_reported: datetime
    last_reported: datetime
    occurrences: int
    
    class Config:
        from_attributes = True

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# FastAPI app
app = FastAPI(title="Pothole Tracker API", version="1.0.0")

# Endpoints

@app.post("/potholes/", response_model=PotholeResponse)
def create_pothole(pothole: PotholeCreate, db: Session = Query(dependency=get_db)):
    """Create a new pothole report"""
    db_pothole = PotholeDB(**pothole.dict())
    db.add(db_pothole)
    db.commit()
    db.refresh(db_pothole)
    return db_pothole

@app.get("/potholes/{pothole_id}", response_model=PotholeResponse)
def get_pothole(pothole_id: int, db: Session = Query(dependency=get_db)):
    """Get a specific pothole by ID"""
    pothole = db.query(PotholeDB).filter(PotholeDB.id == pothole_id).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole not found")
    return pothole

@app.get("/potholes/", response_model=List[PotholeResponse])
def list_potholes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    min_occurrences: int = Query(0, ge=0),
    db: Session = Query(dependency=get_db)
):
    """List all potholes with optional filtering"""
    query = db.query(PotholeDB).filter(PotholeDB.occurrences >= min_occurrences)
    total = query.count()
    potholes = query.offset(skip).limit(limit).all()
    return potholes

@app.put("/potholes/{pothole_id}", response_model=PotholeResponse)
def update_pothole(
    pothole_id: int,
    pothole_update: PotholeUpdate,
    db: Session = Query(dependency=get_db)
):
    """Update a pothole (e.g., mark as re-reported)"""
    pothole = db.query(PotholeDB).filter(PotholeDB.id == pothole_id).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole not found")
    
    update_data = pothole_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pothole, field, value)
    
    db.commit()
    db.refresh(pothole)
    return pothole

@app.post("/potholes/{pothole_id}/report")
def report_pothole_again(pothole_id: int, db: Session = Query(dependency=get_db)):
    """Increment occurrence count and update last_reported timestamp"""
    pothole = db.query(PotholeDB).filter(PotholeDB.id == pothole_id).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole not found")
    
    pothole.occurrences += 1
    pothole.last_reported = datetime.utcnow()
    db.commit()
    db.refresh(pothole)
    return {"message": "Pothole reported", "occurrences": pothole.occurrences}

@app.delete("/potholes/{pothole_id}")
def delete_pothole(pothole_id: int, db: Session = Query(dependency=get_db)):
    """Delete a pothole record"""
    pothole = db.query(PotholeDB).filter(PotholeDB.id == pothole_id).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole not found")
    
    db.delete(pothole)
    db.commit()
    return {"message": "Pothole deleted"}

@app.get("/stats/")
def get_stats(db: Session = Query(dependency=get_db)):
    """Get general statistics"""
    total = db.query(PotholeDB).count()
    total_occurrences = db.query(PotholeDB).with_entities(
        __import__('sqlalchemy').func.sum(PotholeDB.occurrences)
    ).scalar() or 0
    
    return {
        "total_potholes": total,
        "total_occurrences": total_occurrences,
        "average_occurrences": total_occurrences / total if total > 0 else 0
    }

@app.get("/")
def root():
    """Health check endpoint"""
    return {"message": "Pothole Tracker API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)