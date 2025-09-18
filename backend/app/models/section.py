"""
Section model
"""

from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Section(Base):
    __tablename__ = "sections"
    
    id = Column(Integer, primary_key=True, index=True)
    section_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200))
    section_type = Column(String(50), default="MAIN_LINE")
    status = Column(String(50), default="AVAILABLE")
    length_km = Column(Float, default=10.0)
    max_speed_kmh = Column(Float, default=80.0)
    max_capacity = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())