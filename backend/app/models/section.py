from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Section(Base):
    __tablename__ = "sections"
    
    id = Column(Integer, primary_key=True, index=True)
    section_code = Column(String(20), unique=True, index=True, nullable=False)
    section_name = Column(String(100), nullable=False)
    
    # Physical characteristics
    length = Column(Float, nullable=False)  # Section length in meters
    max_speed = Column(Float, default=100.0)  # Max allowed speed in km/h
    gradient = Column(Float, default=0.0)  # Gradient percentage
    curvature = Column(Float, default=0.0)  # Curvature radius
    
    # Track configuration
    track_count = Column(Integer, default=2)  # Number of tracks
    platform_count = Column(Integer, default=0)  # Number of platforms
    has_loop_line = Column(Boolean, default=False)
    
    # Signal configuration
    entry_signal_id = Column(String(20), nullable=True)
    exit_signal_id = Column(String(20), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    maintenance_mode = Column(Boolean, default=False)
    
    # Operational data
    current_occupancy = Column(Integer, default=0)  # Number of trains
    max_occupancy = Column(Integer, default=1)  # Max trains allowed
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    trains = relationship("Train", back_populates="current_section")
    blocks = relationship("Block", back_populates="section")

class Block(Base):
    __tablename__ = "blocks"
    
    id = Column(Integer, primary_key=True, index=True)
    block_code = Column(String(20), unique=True, index=True, nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    
    # Position within section
    start_position = Column(Float, nullable=False)  # Start position in meters
    end_position = Column(Float, nullable=False)  # End position in meters
    
    # Block characteristics
    block_type = Column(String(20), default="STANDARD")  # STANDARD, PLATFORM, SIDING
    is_occupied = Column(Boolean, default=False)
    occupied_by_train = Column(String(20), nullable=True)
    
    # Signal information
    entry_signal = Column(String(20), nullable=True)
    exit_signal = Column(String(20), nullable=True)
    signal_aspect = Column(String(20), default="GREEN")  # RED, YELLOW, GREEN
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    section = relationship("Section", back_populates="blocks")