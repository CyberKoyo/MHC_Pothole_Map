from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import Column, DateTime, Float, Integer, String, create_engine, func
from sqlalchemy.orm import Session, declarative_base, sessionmaker

# Database: file next to this script (stable path regardless of cwd)
DB_PATH = Path(__file__).resolve().parent / "potholes.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# SQLAlchemy model
class PotholeDB(Base):
    __tablename__ = "potholes"

    address = Column(String, primary_key=True, index=True)
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
    address: str
    latitude: float
    longitude: float
    location_description: Optional[str] = None


class PotholeUpdate(BaseModel):
    location_description: Optional[str] = None
    last_reported: Optional[datetime] = None
    occurrences: Optional[int] = None


class PotholeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    address: str
    latitude: float
    longitude: float
    location_description: Optional[str]
    first_reported: datetime
    last_reported: datetime
    occurrences: int


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
def create_pothole(pothole: PotholeCreate, db: Session = Depends(get_db)):
    """Create a new pothole report (address must be unique)."""
    existing = db.query(PotholeDB).filter(PotholeDB.address == pothole.address).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Pothole with this address already exists",
        )
    db_pothole = PotholeDB(**pothole.model_dump())
    db.add(db_pothole)
    db.commit()
    db.refresh(db_pothole)
    return db_pothole


@app.get("/potholes/{address}", response_model=PotholeResponse)
def get_pothole(address: str, db: Session = Depends(get_db)):
    """Get a specific pothole by address (primary key)."""
    pothole = db.query(PotholeDB).filter(PotholeDB.address == address).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole not found")
    return pothole


@app.get("/potholes/", response_model=List[PotholeResponse])
def list_potholes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    min_occurrences: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List all potholes with optional filtering."""
    query = db.query(PotholeDB).filter(PotholeDB.occurrences >= min_occurrences)
    potholes = query.order_by(PotholeDB.address).offset(skip).limit(limit).all()
    return potholes


@app.put("/potholes/{address}", response_model=PotholeResponse)
def update_pothole(
    address: str,
    pothole_update: PotholeUpdate,
    db: Session = Depends(get_db),
):
    """Update a pothole (e.g., mark as re-reported)."""
    pothole = db.query(PotholeDB).filter(PotholeDB.address == address).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole not found")

    update_data = pothole_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pothole, field, value)

    db.commit()
    db.refresh(pothole)
    return pothole


@app.post("/potholes/{address}/report")
def report_pothole_again(address: str, db: Session = Depends(get_db)):
    """Increment occurrence count and update last_reported timestamp."""
    pothole = db.query(PotholeDB).filter(PotholeDB.address == address).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole not found")

    pothole.occurrences += 1
    pothole.last_reported = datetime.utcnow()
    db.commit()
    db.refresh(pothole)
    return {"message": "Pothole reported", "occurrences": pothole.occurrences}


@app.delete("/potholes/{address}")
def delete_pothole(address: str, db: Session = Depends(get_db)):
    """Delete a pothole record."""
    pothole = db.query(PotholeDB).filter(PotholeDB.address == address).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole not found")

    db.delete(pothole)
    db.commit()
    return {"message": "Pothole deleted"}


@app.get("/stats/")
def get_stats(db: Session = Depends(get_db)):
    """Get general statistics."""
    total = db.query(PotholeDB).count()
    total_occurrences = db.query(PotholeDB).with_entities(
        func.sum(PotholeDB.occurrences)
    ).scalar() or 0

    return {
        "total_potholes": total,
        "total_occurrences": total_occurrences,
        "average_occurrences": total_occurrences / total if total > 0 else 0,
    }


@app.get("/")
def root():
    """Health check endpoint."""
    return {"message": "Pothole Tracker API is running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
