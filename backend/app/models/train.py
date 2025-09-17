from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Train(Base):
    __tablename__ = "trains"
    
    id = Column(Integer, primary_key=True, index=True)
    train_number = Column(String(20), unique=True, index=True, nullable=False)
    train_name = Column(String(100), nullable=False)
    train_type = Column(String(20), nullable=False)  # EXPRESS, FREIGHT, SUBURBAN
    priority = Column(Integer, default=1)  # 1=highest, 5=lowest
    
    # Current status
    current_section_id = Column(Integer, ForeignKey("sections.id"), nullable=True)
    current_position = Column(Float, default=0.0)  # Position in meters
    current_speed = Column(Float, default=0.0)  # Speed in km/h
    status = Column(String(20), default="SCHEDULED")  # SCHEDULED, RUNNING, DELAYED, STOPPED
    
    # Schedule
    scheduled_arrival = Column(DateTime, nullable=True)
    actual_arrival = Column(DateTime, nullable=True)
    scheduled_departure = Column(DateTime, nullable=True)
    actual_departure = Column(DateTime, nullable=True)
    
    # Characteristics
    length = Column(Float, default=200.0)  # Train length in meters
    max_speed = Column(Float, default=120.0)  # Max speed in km/h
    acceleration = Column(Float, default=0.5)  # m/s²
    deceleration = Column(Float, default=0.8)  # m/s²
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    current_section = relationship("Section", back_populates="trains")
    decisions = relationship("Decision", back_populates="train")

class TrainSchedule(Base):
    __tablename__ = "train_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    train_id = Column(Integer, ForeignKey("trains.id"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    sequence_order = Column(Integer, nullable=False)
    
    planned_arrival = Column(DateTime, nullable=False)
    planned_departure = Column(DateTime, nullable=False)
    actual_arrival = Column(DateTime, nullable=True)
    actual_departure = Column(DateTime, nullable=True)
    
    platform_number = Column(String(10), nullable=True)
    stop_duration = Column(Integer, default=0)  # Stop duration in seconds
    
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    train = relationship("Train")
    section = relationship("Section")