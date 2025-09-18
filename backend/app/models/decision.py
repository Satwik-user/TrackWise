"""
Decision model (placeholder)
"""

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Decision(Base):
    __tablename__ = "decisions"
    
    id = Column(Integer, primary_key=True, index=True)
    decision_type = Column(String(100))
    description = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())