from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TrainType(str, Enum):
    EXPRESS = "EXPRESS"
    FREIGHT = "FREIGHT"
    SUBURBAN = "SUBURBAN"
    SPECIAL = "SPECIAL"

class TrainStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    RUNNING = "RUNNING"
    DELAYED = "DELAYED"
    STOPPED = "STOPPED"
    COMPLETED = "COMPLETED"

class TrainBase(BaseModel):
    train_number: str = Field(..., description="Unique train number")
    train_name: str = Field(..., description="Train name")
    train_type: TrainType = Field(..., description="Type of train")
    priority: int = Field(default=3, ge=1, le=5, description="Priority (1=highest, 5=lowest)")
    
    # Physical characteristics
    length: float = Field(default=200.0, gt=0, description="Train length in meters")
    max_speed: float = Field(default=120.0, gt=0, description="Maximum speed in km/h")
    acceleration: float = Field(default=0.5, gt=0, description="Acceleration in m/s²")
    deceleration: float = Field(default=0.8, gt=0, description="Deceleration in m/s²")

class TrainCreate(TrainBase):
    scheduled_arrival: Optional[datetime] = None
    scheduled_departure: Optional[datetime] = None
    current_section_id: Optional[int] = None

class TrainUpdate(BaseModel):
    train_name: Optional[str] = None
    priority: Optional[int] = Field(None, ge=1, le=5)
    current_position: Optional[float] = Field(None, ge=0)
    current_speed: Optional[float] = Field(None, ge=0)
    status: Optional[TrainStatus] = None
    actual_arrival: Optional[datetime] = None
    actual_departure: Optional[datetime] = None

class Train(TrainBase):
    id: int
    current_section_id: Optional[int] = None
    current_position: float = 0.0
    current_speed: float = 0.0
    status: TrainStatus = TrainStatus.SCHEDULED
    
    scheduled_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    scheduled_departure: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TrainScheduleBase(BaseModel):
    train_id: int
    section_id: int
    sequence_order: int
    planned_arrival: datetime
    planned_departure: datetime
    platform_number: Optional[str] = None
    stop_duration: int = Field(default=0, ge=0, description="Stop duration in seconds")

class TrainScheduleCreate(TrainScheduleBase):
    pass

class TrainSchedule(TrainScheduleBase):
    id: int
    actual_arrival: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class TrainPosition(BaseModel):
    train_id: int
    train_number: str
    section_id: int
    position: float
    speed: float
    status: TrainStatus
    timestamp: datetime