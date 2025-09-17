from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.train import Train, TrainSchedule
from app.schemas.train import (
    Train as TrainSchema,
    TrainCreate,
    TrainUpdate,
    TrainSchedule as TrainScheduleSchema,
    TrainScheduleCreate,
    TrainPosition
)

router = APIRouter()

@router.get("/", response_model=List[TrainSchema])
async def get_trains(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = Query(None),
    train_type: Optional[str] = Query(None),
    section_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get list of trains with optional filtering"""
    query = db.query(Train)
    
    if status:
        query = query.filter(Train.status == status)
    if train_type:
        query = query.filter(Train.train_type == train_type)
    if section_id:
        query = query.filter(Train.current_section_id == section_id)
    
    trains = query.offset(skip).limit(limit).all()
    return trains

@router.get("/{train_id}", response_model=TrainSchema)
async def get_train(train_id: int, db: Session = Depends(get_db)):
    """Get a specific train by ID"""
    train = db.query(Train).filter(Train.id == train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")
    return train

@router.post("/", response_model=TrainSchema)
async def create_train(train: TrainCreate, db: Session = Depends(get_db)):
    """Create a new train"""
    # Check if train number already exists
    existing_train = db.query(Train).filter(Train.train_number == train.train_number).first()
    if existing_train:
        raise HTTPException(status_code=400, detail="Train number already exists")
    
    db_train = Train(**train.dict())
    db.add(db_train)
    db.commit()
    db.refresh(db_train)
    return db_train

@router.put("/{train_id}", response_model=TrainSchema)
async def update_train(train_id: int, train_update: TrainUpdate, db: Session = Depends(get_db)):
    """Update a train"""
    train = db.query(Train).filter(Train.id == train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")
    
    update_data = train_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(train, field, value)
    
    train.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(train)
    return train

@router.delete("/{train_id}")
async def delete_train(train_id: int, db: Session = Depends(get_db)):
    """Delete a train"""
    train = db.query(Train).filter(Train.id == train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")
    
    db.delete(train)
    db.commit()
    return {"message": "Train deleted successfully"}

@router.get("/{train_id}/schedule", response_model=List[TrainScheduleSchema])
async def get_train_schedule(train_id: int, db: Session = Depends(get_db)):
    """Get schedule for a specific train"""
    train = db.query(Train).filter(Train.id == train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")
    
    schedule = db.query(TrainSchedule).filter(
        TrainSchedule.train_id == train_id
    ).order_by(TrainSchedule.sequence_order).all()
    
    return schedule

@router.post("/{train_id}/schedule", response_model=TrainScheduleSchema)
async def create_train_schedule(
    train_id: int, 
    schedule: TrainScheduleCreate, 
    db: Session = Depends(get_db)
):
    """Create schedule entry for a train"""
    train = db.query(Train).filter(Train.id == train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")
    
    if schedule.train_id != train_id:
        raise HTTPException(status_code=400, detail="Train ID mismatch")
    
    db_schedule = TrainSchedule(**schedule.dict())
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

@router.get("/{train_id}/position", response_model=TrainPosition)
async def get_train_position(train_id: int, db: Session = Depends(get_db)):
    """Get current position of a train"""
    train = db.query(Train).filter(Train.id == train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")
    
    position = TrainPosition(
        train_id=train.id,
        train_number=train.train_number,
        section_id=train.current_section_id or 0,
        position=train.current_position,
        speed=train.current_speed,
        status=train.status,
        timestamp=train.updated_at
    )
    return position

@router.post("/{train_id}/position")
async def update_train_position(
    train_id: int,
    position: float = Query(..., ge=0),
    speed: float = Query(..., ge=0),
    section_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Update train position and speed"""
    train = db.query(Train).filter(Train.id == train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")
    
    train.current_position = position
    train.current_speed = speed
    if section_id is not None:
        train.current_section_id = section_id
    train.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(train)
    return {"message": "Position updated successfully", "train": train}

@router.get("/live/positions", response_model=List[TrainPosition])
async def get_live_positions(
    section_ids: Optional[List[int]] = Query(None),
    db: Session = Depends(get_db)
):
    """Get live positions of all active trains"""
    query = db.query(Train).filter(Train.status.in_(["RUNNING", "DELAYED", "STOPPED"]))
    
    if section_ids:
        query = query.filter(Train.current_section_id.in_(section_ids))
    
    trains = query.all()
    
    positions = []
    for train in trains:
        position = TrainPosition(
            train_id=train.id,
            train_number=train.train_number,
            section_id=train.current_section_id or 0,
            position=train.current_position,
            speed=train.current_speed,
            status=train.status,
            timestamp=train.updated_at
        )
        positions.append(position)
    
    return positions

@router.get("/delays/summary")
async def get_delay_summary(
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db)
):
    """Get delay summary for the specified time period"""
    since = datetime.utcnow() - timedelta(hours=hours)
    
    trains = db.query(Train).filter(
        Train.updated_at >= since,
        Train.status.in_(["RUNNING", "DELAYED", "COMPLETED"])
    ).all()
    
    total_trains = len(trains)
    delayed_trains = len([t for t in trains if t.status == "DELAYED"])
    
    # Calculate average delay (simplified)
    total_delay = 0
    delay_count = 0
    
    for train in trains:
        if train.actual_arrival and train.scheduled_arrival:
            delay = (train.actual_arrival - train.scheduled_arrival).total_seconds() / 60
            if delay > 0:
                total_delay += delay
                delay_count += 1
    
    avg_delay = total_delay / delay_count if delay_count > 0 else 0
    
    return {
        "period_hours": hours,
        "total_trains": total_trains,
        "delayed_trains": delayed_trains,
        "on_time_percentage": ((total_trains - delayed_trains) / total_trains * 100) if total_trains > 0 else 0,
        "average_delay_minutes": round(avg_delay, 2),
        "timestamp": datetime.utcnow()
    }