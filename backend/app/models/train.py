"""
Train model
"""

from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from enum import Enum
from app.database import Base


class TrainStatus(str, Enum):
    """Train status enumeration"""
    STOPPED = "STOPPED"
    RUNNING = "RUNNING"
    MOVING = "MOVING"
    ACTIVE = "ACTIVE"
    IDLE = "IDLE"
    MAINTENANCE = "MAINTENANCE"
    DELAYED = "DELAYED"


class TrainType(str, Enum):
    """Train type enumeration"""
    PASSENGER = "PASSENGER"
    FREIGHT = "FREIGHT"
    EXPRESS = "EXPRESS"
    LOCAL = "LOCAL"
    METRO = "METRO"
    HIGH_SPEED = "HIGH_SPEED"


class Train(Base):
    __tablename__ = "trains"
    
    id = Column(Integer, primary_key=True, index=True)
    train_number = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200))
    train_type = Column(String(50), default="PASSENGER")
    status = Column(String(50), default="STOPPED")
    max_speed_kmh = Column(Float, default=80.0)
    current_speed = Column(Float, default=0.0)
    current_section = Column(Integer, default=1)
    delay_minutes = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())