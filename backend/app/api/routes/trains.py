"""
Train management routes for TrackWise Railway Optimization System
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from datetime import datetime

from app.core.security import get_current_active_user

router = APIRouter()


class TrainBase(BaseModel):
    train_number: str = Field(..., description="Unique train number")
    name: str = Field(..., description="Train name")
    train_type: str = Field(default="PASSENGER", description="Train type (PASSENGER, FREIGHT, MAINTENANCE)")
    max_speed_kmh: float = Field(default=80.0, ge=0, le=300, description="Maximum speed in km/h")
    capacity_passengers: Optional[int] = Field(default=None, ge=0, description="Passenger capacity")
    capacity_cargo_tons: Optional[float] = Field(default=None, ge=0, description="Cargo capacity in tons")


class TrainCreate(TrainBase):
    pass


class TrainUpdate(BaseModel):
    name: Optional[str] = None
    train_type: Optional[str] = None
    status: Optional[str] = None
    max_speed_kmh: Optional[float] = Field(None, ge=0, le=300)
    current_speed: Optional[float] = Field(None, ge=0)
    current_section: Optional[int] = Field(None, ge=1)
    delay_minutes: Optional[float] = Field(None, ge=0)
    capacity_passengers: Optional[int] = Field(None, ge=0)
    capacity_cargo_tons: Optional[float] = Field(None, ge=0)


class TrainResponse(TrainBase):
    id: int
    status: str
    current_speed: float
    current_section: int
    delay_minutes: float
    operator: str
    priority_level: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TrainStatus(BaseModel):
    train_id: int
    status: str
    current_speed: float
    current_section: int
    delay_minutes: float
    last_update: datetime


# Mock trains database
MOCK_TRAINS = [
    {
        "id": 1,
        "train_number": "TW001",
        "name": "Central Express",
        "train_type": "PASSENGER",
        "status": "RUNNING",
        "max_speed_kmh": 120.0,
        "current_speed": 85.0,
        "current_section": 1,
        "delay_minutes": 5.0,
        "capacity_passengers": 300,
        "capacity_cargo_tons": None,
        "operator": "TrackWise Railways",
        "priority_level": 1,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": 2,
        "train_number": "TW002",
        "name": "Northern Commuter",
        "train_type": "PASSENGER",
        "status": "STOPPED",
        "max_speed_kmh": 100.0,
        "current_speed": 0.0,
        "current_section": 2,
        "delay_minutes": 0.0,
        "capacity_passengers": 250,
        "capacity_cargo_tons": None,
        "operator": "TrackWise Railways",
        "priority_level": 2,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": 3,
        "train_number": "TW003",
        "name": "Freight Hauler",
        "train_type": "FREIGHT",
        "status": "RUNNING",
        "max_speed_kmh": 80.0,
        "current_speed": 60.0,
        "current_section": 3,
        "delay_minutes": 15.0,
        "capacity_passengers": None,
        "capacity_cargo_tons": 2000.0,
        "operator": "TrackWise Freight",
        "priority_level": 3,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": 4,
        "train_number": "TW004",
        "name": "City Shuttle",
        "train_type": "PASSENGER",
        "status": "RUNNING",
        "max_speed_kmh": 90.0,
        "current_speed": 70.0,
        "current_section": 1,
        "delay_minutes": 2.0,
        "capacity_passengers": 180,
        "capacity_cargo_tons": None,
        "operator": "City Transport",
        "priority_level": 2,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": 5,
        "train_number": "TW005",
        "name": "Cargo Express",
        "train_type": "FREIGHT",
        "status": "MAINTENANCE",
        "max_speed_kmh": 70.0,
        "current_speed": 0.0,
        "current_section": 4,
        "delay_minutes": 0.0,
        "capacity_passengers": None,
        "capacity_cargo_tons": 1500.0,
        "operator": "Express Freight",
        "priority_level": 3,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
]


@router.get("/", response_model=List[TrainResponse])
async def get_trains(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    train_type: Optional[str] = Query(None, description="Filter by train type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: dict = Depends(get_current_active_user)
) -> List[TrainResponse]:
    """Get all trains with optional filtering"""
    
    trains = MOCK_TRAINS.copy()
    
    # Apply filters
    if train_type:
        trains = [t for t in trains if t["train_type"].lower() == train_type.lower()]
    
    if status:
        trains = [t for t in trains if t["status"].lower() == status.lower()]
    
    # Apply pagination
    trains = trains[skip: skip + limit]
    
    return [TrainResponse(**train) for train in trains]


@router.get("/{train_id}", response_model=TrainResponse)
async def get_train(
    train_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> TrainResponse:
    """Get train by ID"""
    
    train = next((t for t in MOCK_TRAINS if t["id"] == train_id), None)
    if not train:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Train with ID {train_id} not found"
        )
    
    return TrainResponse(**train)


@router.post("/", response_model=TrainResponse)
async def create_train(
    train_in: TrainCreate,
    current_user: dict = Depends(get_current_active_user)
) -> TrainResponse:
    """Create new train"""
    
    # Check if train number already exists
    if any(t["train_number"] == train_in.train_number for t in MOCK_TRAINS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Train number {train_in.train_number} already exists"
        )
    
    # Create new train
    new_train = {
        "id": max((t["id"] for t in MOCK_TRAINS), default=0) + 1,
        **train_in.dict(),
        "status": "STOPPED",
        "current_speed": 0.0,
        "current_section": 1,
        "delay_minutes": 0.0,
        "operator": "TrackWise Railways",
        "priority_level": 2,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    MOCK_TRAINS.append(new_train)
    
    return TrainResponse(**new_train)


@router.put("/{train_id}", response_model=TrainResponse)
async def update_train(
    train_id: int,
    train_in: TrainUpdate,
    current_user: dict = Depends(get_current_active_user)
) -> TrainResponse:
    """Update train"""
    
    train = next((t for t in MOCK_TRAINS if t["id"] == train_id), None)
    if not train:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Train with ID {train_id} not found"
        )
    
    # Update train fields
    update_data = train_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field in train:
            train[field] = value
    
    train["updated_at"] = datetime.utcnow()
    
    return TrainResponse(**train)


@router.delete("/{train_id}")
async def delete_train(
    train_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> dict:
    """Delete train"""
    
    train_index = next((i for i, t in enumerate(MOCK_TRAINS) if t["id"] == train_id), None)
    if train_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Train with ID {train_id} not found"
        )
    
    deleted_train = MOCK_TRAINS.pop(train_index)
    
    return {"message": f"Train {deleted_train['train_number']} deleted successfully"}


@router.get("/{train_id}/status", response_model=TrainStatus)
async def get_train_status(
    train_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> TrainStatus:
    """Get current train status"""
    
    train = next((t for t in MOCK_TRAINS if t["id"] == train_id), None)
    if not train:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Train with ID {train_id} not found"
        )
    
    return TrainStatus(
        train_id=train["id"],
        status=train["status"],
        current_speed=train["current_speed"],
        current_section=train["current_section"],
        delay_minutes=train["delay_minutes"],
        last_update=train["updated_at"]
    )


@router.post("/{train_id}/start")
async def start_train(
    train_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> dict:
    """Start train"""
    
    train = next((t for t in MOCK_TRAINS if t["id"] == train_id), None)
    if not train:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Train with ID {train_id} not found"
        )
    
    if train["status"] == "RUNNING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Train is already running"
        )
    
    train["status"] = "RUNNING"
    train["current_speed"] = 40.0  # Starting speed
    train["updated_at"] = datetime.utcnow()
    
    return {"message": f"Train {train['train_number']} started successfully"}


@router.post("/{train_id}/stop")
async def stop_train(
    train_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> dict:
    """Stop train"""
    
    train = next((t for t in MOCK_TRAINS if t["id"] == train_id), None)
    if not train:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Train with ID {train_id} not found"
        )
    
    train["status"] = "STOPPED"
    train["current_speed"] = 0.0
    train["updated_at"] = datetime.utcnow()
    
    return {"message": f"Train {train['train_number']} stopped successfully"}


@router.get("/statistics/summary")
async def get_trains_summary(
    current_user: dict = Depends(get_current_active_user)
) -> dict:
    """Get trains summary statistics"""
    
    total_trains = len(MOCK_TRAINS)
    running_trains = len([t for t in MOCK_TRAINS if t["status"] == "RUNNING"])
    stopped_trains = len([t for t in MOCK_TRAINS if t["status"] == "STOPPED"])
    maintenance_trains = len([t for t in MOCK_TRAINS if t["status"] == "MAINTENANCE"])
    
    passenger_trains = len([t for t in MOCK_TRAINS if t["train_type"] == "PASSENGER"])
    freight_trains = len([t for t in MOCK_TRAINS if t["train_type"] == "FREIGHT"])
    
    total_delays = sum(t["delay_minutes"] for t in MOCK_TRAINS)
    avg_delay = total_delays / total_trains if total_trains > 0 else 0
    
    return {
        "total_trains": total_trains,
        "running_trains": running_trains,
        "stopped_trains": stopped_trains,
        "maintenance_trains": maintenance_trains,
        "passenger_trains": passenger_trains,
        "freight_trains": freight_trains,
        "total_delay_minutes": total_delays,
        "average_delay_minutes": round(avg_delay, 2)
    }