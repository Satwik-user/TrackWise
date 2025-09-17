from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class DecisionType(str, Enum):
    PRECEDENCE = "PRECEDENCE"
    ROUTING = "ROUTING"
    SPEED_CONTROL = "SPEED_CONTROL"
    PLATFORM_ASSIGNMENT = "PLATFORM_ASSIGNMENT"

class Recommendation(str, Enum):
    ALLOW = "ALLOW"
    HOLD = "HOLD"
    REROUTE = "REROUTE"
    REDUCE_SPEED = "REDUCE_SPEED"
    INCREASE_SPEED = "INCREASE_SPEED"
    CHANGE_PLATFORM = "CHANGE_PLATFORM"

class DecisionStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    IMPLEMENTED = "IMPLEMENTED"

class OptimizationType(str, Enum):
    REAL_TIME = "REAL_TIME"
    BATCH = "BATCH"
    SIMULATION = "SIMULATION"
    PREDICTIVE = "PREDICTIVE"

class SolutionStatus(str, Enum):
    OPTIMAL = "OPTIMAL"
    FEASIBLE = "FEASIBLE"
    INFEASIBLE = "INFEASIBLE"
    TIMEOUT = "TIMEOUT"
    ERROR = "ERROR"

class OptimizationRequest(BaseModel):
    scenario_name: str = Field(..., description="Name of the scenario")
    optimization_type: OptimizationType = OptimizationType.REAL_TIME
    train_ids: List[int] = Field(..., description="List of train IDs to optimize")
    section_ids: List[int] = Field(..., description="List of section IDs to consider")
    
    # Optimization parameters
    time_horizon: int = Field(default=3600, gt=0, description="Time horizon in seconds")
    objective_weights: Dict[str, float] = Field(
        default={"delay": 0.6, "throughput": 0.4},
        description="Weights for optimization objectives"
    )
    
    # Constraints
    safety_buffer: float = Field(default=120.0, gt=0, description="Safety buffer in seconds")
    max_delay_tolerance: float = Field(default=15.0, gt=0, description="Max delay tolerance in minutes")
    
    # Advanced options
    use_ml_predictions: bool = Field(default=True, description="Use ML for predictions")
    solver_timeout: int = Field(default=5, gt=0, description="Solver timeout in seconds")

class DecisionBase(BaseModel):
    train_id: int
    section_id: int
    decision_type: DecisionType
    recommendation: Recommendation
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    reason: Optional[str] = None
    constraints_considered: Optional[Dict[str, Any]] = None
    alternatives: Optional[List[Dict[str, Any]]] = None

class DecisionCreate(DecisionBase):
    decision_id: str = Field(..., description="Unique decision identifier")
    predicted_delay_reduction: float = Field(default=0.0, description="Predicted delay reduction in minutes")
    predicted_throughput_gain: float = Field(default=0.0, description="Predicted throughput gain")

class DecisionUpdate(BaseModel):
    status: Optional[DecisionStatus] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    actual_delay_reduction: Optional[float] = None
    actual_throughput_gain: Optional[float] = None

class Decision(DecisionBase):
    id: int
    decision_id: str
    status: DecisionStatus = DecisionStatus.PENDING
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    predicted_delay_reduction: float = 0.0
    predicted_throughput_gain: float = 0.0
    actual_delay_reduction: Optional[float] = None
    actual_throughput_gain: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class OptimizationResult(BaseModel):
    run_id: str
    scenario_name: str
    optimization_type: OptimizationType
    solution_status: SolutionStatus
    objective_value: Optional[float] = None
    solving_time: float
    
    # Metrics
    total_delay: Optional[float] = None
    throughput: Optional[float] = None
    safety_violations: int = 0
    
    # Decisions
    decisions: List[Decision] = []
    
    # Summary
    trains_affected: int = 0
    sections_involved: int = 0
    improvements: Dict[str, float] = Field(default_factory=dict)
    
    created_at: datetime
    completed_at: Optional[datetime] = None

class OptimizationMetrics(BaseModel):
    timestamp: datetime
    scenario: str
    
    # Performance metrics
    avg_delay: float = Field(..., description="Average delay in minutes")
    total_throughput: float = Field(..., description="Total throughput in trains/hour")
    capacity_utilization: float = Field(..., ge=0.0, le=1.0, description="Capacity utilization ratio")
    
    # Quality metrics
    on_time_performance: float = Field(..., ge=0.0, le=1.0, description="On-time performance ratio")
    safety_score: float = Field(..., ge=0.0, le=1.0, description="Safety compliance score")
    
    # Efficiency metrics
    energy_efficiency: Optional[float] = Field(None, description="Energy efficiency score")
    resource_utilization: Optional[float] = Field(None, description="Resource utilization score")

class PredictionRequest(BaseModel):
    train_id: int
    section_id: int
    prediction_type: str = Field(..., description="Type of prediction: delay, arrival, conflict")
    time_horizon: int = Field(default=1800, gt=0, description="Prediction horizon in seconds")
    include_uncertainty: bool = Field(default=True, description="Include uncertainty bounds")

class PredictionResult(BaseModel):
    train_id: int
    section_id: int
    prediction_type: str
    predicted_value: float
    confidence_interval: Optional[tuple[float, float]] = None
    uncertainty: Optional[float] = None
    factors: Dict[str, float] = Field(default_factory=dict)
    timestamp: datetime