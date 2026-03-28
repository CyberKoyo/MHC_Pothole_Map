from fastapi import FastAPI, HTTPException, Query, Depends, Security, status
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional
import requests

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
    severity: Optional[str] = None

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

# Authentication
class LoginRequest(BaseModel):
    email: str
    password: str

# Define the header key name
api_key_header = APIKeyHeader(name="access_token", auto_error=False)

async def get_admin_user(api_key: str = Security(api_key_header)):
    """
    Checks if the provided API key is valid.
    Used to protect SENSITIVE routes (PUT, DELETE).
    """
    if api_key == "your_super_secret_admin_key":
        return True
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized. Please sign in as an admin."
    )


# Dependency for database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pothole Tracker API")

#Allows comm with frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For hackathons, allowing all is fine
    allow_methods=["*"],
    allow_headers=["*"],
)

# auth continued 
@app.post("/login")
async def login(data: LoginRequest):
    # REPLACE THIS with actual database user verification
    if data.email == "admin@nyc.gov" and data.password == "password123":
        return {"access_token": "your_super_secret_admin_key", "token_type": "bearer"}
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password"
    )

def reverse_geocode(lat: float, lon: float) -> dict:
    """Calls Nominatim to resolve lat/lng into address, zip_code, and borough.
    Returns a dict with those three keys; any may be None on failure."""
    try:
        r = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": lat, "lon": lon, "format": "json"},
            headers={"User-Agent": "MHC-Pothole-Map/1.0"},
            timeout=5,
        )
        r.raise_for_status()
        addr = r.json().get("address", {})
        road = " ".join(filter(None, [addr.get("house_number"), addr.get("road")]))
        return {
            "address": road or None,
            "zip_code": addr.get("postcode"),
            "borough": addr.get("suburb") or addr.get("borough") or addr.get("city_district"),
        }
    except Exception:
        return {"address": None, "zip_code": None, "borough": None}


def _compose_location_description(
    location_description: Optional[str], severity: Optional[str]
) -> Optional[str]:
    parts = []
    if severity:
        parts.append(f"Severity: {severity}")
    if location_description:
        parts.append(location_description)
    if not parts:
        return None
    return ". ".join(parts)



# 3. Updated GET Endpoint with search logic
@app.post("/potholes/", response_model=PotholeResponse)
def create_pothole(pothole_in: PotholeCreate, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    loc = _compose_location_description(
        pothole_in.location_description, pothole_in.severity
    )

    geo: dict = {}
    if not (pothole_in.address and pothole_in.zip_code and pothole_in.borough):
        geo = reverse_geocode(pothole_in.latitude, pothole_in.longitude)

    row = Pothole(
        latitude=pothole_in.latitude,
        longitude=pothole_in.longitude,
        address=pothole_in.address or geo.get("address"),
        zip_code=pothole_in.zip_code or geo.get("zip_code"),
        borough=pothole_in.borough or geo.get("borough"),
        location_description=loc,
        first_reported=now,
        last_reported=now,
        occurrences=1,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


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

@app.put("/potholes/{pothole_id}", response_model=PotholeResponse)
def update_pothole(
    pothole_id: int,
    pothole_update: PotholeUpdate,
    db: Session = Depends(get_db),
    #Prevents general user deletion
    admin: bool = Depends(get_admin_user)
):
    """Update a pothole"""
    pothole = db.query(Pothole).filter(Pothole.id == pothole_id).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole not found")
    
    update_data = pothole_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pothole, field, value)
    
    db.commit()
    db.refresh(pothole)
    return pothole

@app.post("/potholes/{pothole_id}/report")
def report_pothole_again(pothole_id: int, db: Session = Depends(get_db)):
    """Increment occurrence count and update last_reported timestamp"""
    pothole = db.query(Pothole).filter(Pothole.id == pothole_id).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole not found")
    
    pothole.occurrences += 1
    pothole.last_reported = datetime.utcnow()
    db.commit()
    db.refresh(pothole)
    return {"message": "Pothole reported", "occurrences": pothole.occurrences}

@app.delete("/potholes/{pothole_id}", status_code=204)
def delete_pothole(
    pothole_id: int, 
    db: Session = Depends(get_db),
    #Prevents general user deletion
    admin: bool = Depends(get_admin_user)
    ):
    """Delete a pothole record"""
    pothole = db.query(Pothole).filter(Pothole.id == pothole_id).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole not found")
    
    db.delete(pothole)
    db.commit()
    return None

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

@app.get("/")
def health_check():
    """Health check endpoint"""
    return {"message": "Pothole Tracker API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)