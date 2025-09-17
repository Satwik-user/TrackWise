from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Decision(Base):
    __tablename__ = "decisions"
    
    id = Column(Integer, primary_key=True, index=True)
    decision_id = Column(String(50), unique=True, index=True, nullable=False)
    
    # Decision context
    train_id = Column(Integer, ForeignKey("trains.id"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    decision_type = Column(String(30), nullable=False)  # PRECEDENCE, ROUTING, SPEED_CONTROL
    
    # Decision details
    recommendation = Column(String(50), nullable=False)  # ALLOW, HOLD, REROUTE, REDUCE_SPEED
    confidence_score = Column(Float, default=0.0)  # 0.0 to 1.0
    
    # Reasoning
    reason = Column(Text, nullable=True)
    constraints_considered = Column(JSON, nullable=True)
    alternatives = Column(JSON, nullable=True)
    
    # Implementation
    status = Column(String(20), default="PENDING")  # PENDING, APPROVED, REJECTED, IMPLEMENTED
    approved_by = Column(String(50), nullable=True)  # Controller ID
    approved_at = Column(DateTime, nullable=True)
    
    # Impact prediction
    predicted_delay_reduction = Column(Float, default=0.0)  # In minutes
    predicted_throughput_gain = Column(Float, default=0.0)  # In trains/hour
    
    # Actual outcome (filled after implementation)
    actual_delay_reduction = Column(Float, nullable=True)
    actual_throughput_gain = Column(Float, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    train = relationship("Train", back_populates="decisions")
    section = relationship("Section")

class OptimizationRun(Base):
    __tablename__ = "optimization_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String(50), unique=True, index=True, nullable=False)
    
    # Run configuration
    scenario_name = Column(String(100), nullable=False)
    optimization_type = Column(String(30), nullable=False)  # REAL_TIME, BATCH, SIMULATION
    
    # Input data
    input_trains = Column(JSON, nullable=False)
    input_sections = Column(JSON, nullable=False)
    constraints = Column(JSON, nullable=True)
    
    # Results
    objective_value = Column(Float, nullable=True)
    solution_status = Column(String(20), nullable=True)  # OPTIMAL, FEASIBLE, INFEASIBLE
    solving_time = Column(Float, nullable=True)  # In seconds
    
    # Metrics
    total_delay = Column(Float, nullable=True)
    throughput = Column(Float, nullable=True)
    safety_violations = Column(Integer, default=0)
    
    # Output decisions
    decisions = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)