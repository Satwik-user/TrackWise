"""
Optimization routes for TrackWise Railway Optimization System
"""

from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from enum import Enum

from app.core.security import get_current_active_user

router = APIRouter()


class OptimizationType(str, Enum):
    """Types of optimization"""
    SCHEDULE_OPTIMIZATION = "schedule_optimization"
    ROUTE_OPTIMIZATION = "route_optimization"
    CAPACITY_OPTIMIZATION = "capacity_optimization"
    DELAY_MINIMIZATION = "delay_minimization"
    ENERGY_OPTIMIZATION = "energy_optimization"


class OptimizationStatus(str, Enum):
    """Optimization status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class SolverType(str, Enum):
    """Solver types"""
    HEURISTIC = "heuristic"
    LINEAR_PROGRAMMING = "linear_programming"
    CP_SAT = "cp_sat"
    GENETIC_ALGORITHM = "genetic_algorithm"


class OptimizationRequest(BaseModel):
    name: str = Field(..., description="Optimization request name")
    optimization_type: OptimizationType
    solver_type: SolverType = SolverType.HEURISTIC
    time_horizon_hours: int = Field(default=24, ge=1, le=168, description="Time horizon in hours")
    objectives: List[str] = Field(default=["minimize_delays"], description="Optimization objectives")
    constraints: Dict[str, Any] = Field(default_factory=dict, description="Optimization constraints")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Solver parameters")
    train_ids: Optional[List[int]] = Field(default=None, description="Specific trains to optimize")
    section_ids: Optional[List[int]] = Field(default=None, description="Specific sections to optimize")


class OptimizationResponse(BaseModel):
    id: int
    name: str
    optimization_type: OptimizationType
    solver_type: SolverType
    status: OptimizationStatus
    progress_percentage: float
    time_horizon_hours: int
    objectives: List[str]
    constraints: Dict[str, Any]
    parameters: Dict[str, Any]
    train_ids: Optional[List[int]]
    section_ids: Optional[List[int]]
    results: Optional[Dict[str, Any]]
    metrics: Optional[Dict[str, Any]]
    error_message: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_by: str

    class Config:
        from_attributes = True


class OptimizationSummary(BaseModel):
    id: int
    name: str
    optimization_type: OptimizationType
    status: OptimizationStatus
    progress_percentage: float
    created_at: datetime
    completed_at: Optional[datetime]
    duration_seconds: Optional[float]


class OptimizationMetrics(BaseModel):
    total_delay_reduction: float
    energy_savings_percentage: float
    capacity_utilization: float
    solution_quality: float
    computation_time_seconds: float


# Mock optimization runs database
MOCK_OPTIMIZATIONS = [
    {
        "id": 1,
        "name": "Morning Rush Hour Optimization",
        "optimization_type": "schedule_optimization",
        "solver_type": "heuristic",
        "status": "completed",
        "progress_percentage": 100.0,
        "time_horizon_hours": 4,
        "objectives": ["minimize_delays", "maximize_throughput"],
        "constraints": {"max_speed_limit": 120, "safety_distance": 500},
        "parameters": {"max_iterations": 1000, "convergence_threshold": 0.01},
        "train_ids": [1, 2, 4],
        "section_ids": [1, 2, 3],
        "results": {
            "optimized_schedule": [
                {"train_id": 1, "departure_time": "08:00:00", "route": [1, 2, 3]},
                {"train_id": 2, "departure_time": "08:15:00", "route": [2, 3, 1]},
                {"train_id": 4, "departure_time": "08:30:00", "route": [1, 3, 2]}
            ],
            "total_delay_reduction": 15.5,
            "energy_savings": 8.2
        },
        "metrics": {
            "total_delay_reduction": 15.5,
            "energy_savings_percentage": 8.2,
            "capacity_utilization": 87.3,
            "solution_quality": 0.94,
            "computation_time_seconds": 45.2
        },
        "error_message": None,
        "created_at": datetime.utcnow() - timedelta(hours=2),
        "started_at": datetime.utcnow() - timedelta(hours=2),
        "completed_at": datetime.utcnow() - timedelta(hours=1, minutes=30),
        "created_by": "admin"
    },
    {
        "id": 2,
        "name": "Route Optimization Test",
        "optimization_type": "route_optimization",
        "solver_type": "linear_programming",
        "status": "running",
        "progress_percentage": 65.0,
        "time_horizon_hours": 8,
        "objectives": ["minimize_distance", "minimize_delays"],
        "constraints": {"avoid_maintenance_sections": True},
        "parameters": {"solver_timeout": 300},
        "train_ids": None,
        "section_ids": None,
        "results": None,
        "metrics": None,
        "error_message": None,
        "created_at": datetime.utcnow() - timedelta(minutes=30),
        "started_at": datetime.utcnow() - timedelta(minutes=25),
        "completed_at": None,
        "created_by": "admin"
    },
    {
        "id": 3,
        "name": "Capacity Analysis",
        "optimization_type": "capacity_optimization",
        "solver_type": "cp_sat",
        "status": "failed",
        "progress_percentage": 25.0,
        "time_horizon_hours": 12,
        "objectives": ["maximize_capacity"],
        "constraints": {},
        "parameters": {},
        "train_ids": None,
        "section_ids": [1, 2, 3, 4, 5],
        "results": None,
        "metrics": None,
        "error_message": "Solver timeout exceeded",
        "created_at": datetime.utcnow() - timedelta(hours=1),
        "started_at": datetime.utcnow() - timedelta(hours=1),
        "completed_at": datetime.utcnow() - timedelta(minutes=45),
        "created_by": "admin"
    }
]


@router.get("/", response_model=List[OptimizationSummary])
async def get_optimizations(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    status: Optional[OptimizationStatus] = Query(None, description="Filter by status"),
    optimization_type: Optional[OptimizationType] = Query(None, description="Filter by type"),
    current_user: dict = Depends(get_current_active_user)
) -> List[OptimizationSummary]:
    """Get all optimization runs with optional filtering"""
    
    optimizations = MOCK_OPTIMIZATIONS.copy()
    
    # Apply filters
    if status:
        optimizations = [o for o in optimizations if o["status"] == status.value]
    
    if optimization_type:
        optimizations = [o for o in optimizations if o["optimization_type"] == optimization_type.value]
    
    # Apply pagination
    optimizations = optimizations[skip: skip + limit]
    
    # Calculate duration for completed optimizations and prepare data for model
    result = []
    for opt in optimizations:
        duration = None
        if opt["completed_at"] and opt["started_at"]:
            duration = (opt["completed_at"] - opt["started_at"]).total_seconds()
        
        # Create summary object with only the fields the model expects
        summary_data = {
            "id": opt["id"],
            "name": opt["name"], 
            "optimization_type": opt["optimization_type"],
            "status": opt["status"],
            "progress_percentage": opt["progress_percentage"],
            "created_at": opt["created_at"],
            "completed_at": opt.get("completed_at"),
            "duration_seconds": duration
        }
        result.append(OptimizationSummary(**summary_data))
    
    return result


@router.get("/decisions", response_model=List[Dict[str, Any]])
async def get_optimization_decisions(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    current_user: dict = Depends(get_current_active_user)
) -> List[Dict[str, Any]]:
    """Get recent optimization decisions"""
    
    # Mock decisions data
    mock_decisions = [
        {
            "id": 1,
            "optimization_id": 1,
            "decision_type": "route_adjustment",
            "description": "Reroute Train 1045 via Section B to avoid congestion",
            "status": "implemented",
            "created_at": datetime.utcnow() - timedelta(minutes=15),
            "impact": "Reduced delay by 8 minutes"
        },
        {
            "id": 2,
            "optimization_id": 1,
            "decision_type": "schedule_change",
            "description": "Delay departure of Train 2033 by 5 minutes",
            "status": "pending",
            "created_at": datetime.utcnow() - timedelta(minutes=30),
            "impact": "Expected to improve overall throughput"
        },
        {
            "id": 3,
            "optimization_id": 2,
            "decision_type": "speed_adjustment",
            "description": "Increase speed limit on Section C to 80 km/h",
            "status": "implemented",
            "created_at": datetime.utcnow() - timedelta(hours=1),
            "impact": "Reduced travel time by 12 minutes"
        }
    ]
    
    # Apply pagination
    decisions = mock_decisions[skip: skip + limit]
    
    return decisions


@router.get("/runs", response_model=List[OptimizationSummary])
async def get_optimization_runs(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    status: Optional[OptimizationStatus] = Query(None, description="Filter by status"),
    optimization_type: Optional[OptimizationType] = Query(None, description="Filter by type"),
    current_user: dict = Depends(get_current_active_user)
) -> List[OptimizationSummary]:
    """Get all optimization runs with optional filtering - alias for compatibility"""
    return await get_optimizations(skip, limit, status, optimization_type, current_user)
@router.get("/{optimization_id}", response_model=OptimizationResponse)
async def get_optimization(
    optimization_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> OptimizationResponse:
    """Get optimization run by ID"""
    
    optimization = next((o for o in MOCK_OPTIMIZATIONS if o["id"] == optimization_id), None)
    if not optimization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Optimization with ID {optimization_id} not found"
        )
    
    return OptimizationResponse(**optimization)


@router.post("/", response_model=OptimizationResponse)
async def create_optimization(
    optimization_request: OptimizationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_active_user)
) -> OptimizationResponse:
    """Create and start new optimization run"""
    
    # Create new optimization run
    new_optimization = {
        "id": max((o["id"] for o in MOCK_OPTIMIZATIONS), default=0) + 1,
        "name": optimization_request.name,
        "optimization_type": optimization_request.optimization_type.value,
        "solver_type": optimization_request.solver_type.value,
        "status": "pending",
        "progress_percentage": 0.0,
        "time_horizon_hours": optimization_request.time_horizon_hours,
        "objectives": optimization_request.objectives,
        "constraints": optimization_request.constraints,
        "parameters": optimization_request.parameters,
        "train_ids": optimization_request.train_ids,
        "section_ids": optimization_request.section_ids,
        "results": None,
        "metrics": None,
        "error_message": None,
        "created_at": datetime.utcnow(),
        "started_at": None,
        "completed_at": None,
        "created_by": current_user["username"]
    }
    
    MOCK_OPTIMIZATIONS.append(new_optimization)
    
    # Start optimization in background
    background_tasks.add_task(run_optimization_task, new_optimization["id"])
    
    return OptimizationResponse(**new_optimization)


@router.post("/{optimization_id}/cancel")
async def cancel_optimization(
    optimization_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> dict:
    """Cancel running optimization"""
    
    optimization = next((o for o in MOCK_OPTIMIZATIONS if o["id"] == optimization_id), None)
    if not optimization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Optimization with ID {optimization_id} not found"
        )
    
    if optimization["status"] not in ["pending", "running"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel optimization with status: {optimization['status']}"
        )
    
    optimization["status"] = "cancelled"
    optimization["completed_at"] = datetime.utcnow()
    
    return {"message": f"Optimization {optimization_id} cancelled successfully"}


@router.delete("/{optimization_id}")
async def delete_optimization(
    optimization_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> dict:
    """Delete optimization run"""
    
    optimization_index = next((i for i, o in enumerate(MOCK_OPTIMIZATIONS) if o["id"] == optimization_id), None)
    if optimization_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Optimization with ID {optimization_id} not found"
        )
    
    optimization = MOCK_OPTIMIZATIONS[optimization_index]
    
    # Don't allow deleting running optimizations
    if optimization["status"] == "running":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete running optimization. Cancel it first."
        )
    
    deleted_optimization = MOCK_OPTIMIZATIONS.pop(optimization_index)
    
    return {"message": f"Optimization '{deleted_optimization['name']}' deleted successfully"}


@router.get("/{optimization_id}/results")
async def get_optimization_results(
    optimization_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> dict:
    """Get detailed optimization results"""
    
    optimization = next((o for o in MOCK_OPTIMIZATIONS if o["id"] == optimization_id), None)
    if not optimization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Optimization with ID {optimization_id} not found"
        )
    
    if optimization["status"] != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Optimization is not completed. Status: {optimization['status']}"
        )
    
    return {
        "optimization_id": optimization_id,
        "results": optimization.get("results", {}),
        "metrics": optimization.get("metrics", {}),
        "summary": {
            "optimization_type": optimization["optimization_type"],
            "solver_type": optimization["solver_type"],
            "computation_time": (optimization["completed_at"] - optimization["started_at"]).total_seconds() if optimization["completed_at"] and optimization["started_at"] else None,
            "objectives_achieved": len(optimization["objectives"]),
            "constraints_satisfied": len(optimization["constraints"])
        }
    }


@router.get("/metrics/current", response_model=Dict[str, Any])
async def get_current_optimization_metrics(
    current_user: dict = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """Get current optimization metrics"""
    
    # Mock current metrics
    current_metrics = {
        "active_optimizations": 2,
        "completed_today": 5,
        "average_completion_time": 45.2,
        "success_rate": 0.87,
        "total_delay_reduction": 23.5,
        "energy_savings": 12.3,
        "last_updated": datetime.utcnow().isoformat()
    }
    
    return current_metrics


@router.get("/{optimization_id}/metrics", response_model=OptimizationMetrics)
async def get_optimization_metrics(
    optimization_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> OptimizationMetrics:
    """Get optimization performance metrics"""
    
    optimization = next((o for o in MOCK_OPTIMIZATIONS if o["id"] == optimization_id), None)
    if not optimization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Optimization with ID {optimization_id} not found"
        )
    
    if not optimization.get("metrics"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No metrics available for this optimization"
        )
    
    return OptimizationMetrics(**optimization["metrics"])


@router.get("/statistics/summary")
async def get_optimization_summary(
    current_user: dict = Depends(get_current_active_user)
) -> dict:
    """Get optimization statistics summary"""
    
    total_optimizations = len(MOCK_OPTIMIZATIONS)
    completed_optimizations = len([o for o in MOCK_OPTIMIZATIONS if o["status"] == "completed"])
    running_optimizations = len([o for o in MOCK_OPTIMIZATIONS if o["status"] == "running"])
    failed_optimizations = len([o for o in MOCK_OPTIMIZATIONS if o["status"] == "failed"])
    
    # Calculate average metrics for completed optimizations
    completed_opts = [o for o in MOCK_OPTIMIZATIONS if o["status"] == "completed" and o.get("metrics")]
    
    avg_delay_reduction = sum(o["metrics"]["total_delay_reduction"] for o in completed_opts) / len(completed_opts) if completed_opts else 0
    avg_energy_savings = sum(o["metrics"]["energy_savings_percentage"] for o in completed_opts) / len(completed_opts) if completed_opts else 0
    avg_computation_time = sum(o["metrics"]["computation_time_seconds"] for o in completed_opts) / len(completed_opts) if completed_opts else 0
    
    return {
        "total_optimizations": total_optimizations,
        "completed_optimizations": completed_optimizations,
        "running_optimizations": running_optimizations,
        "failed_optimizations": failed_optimizations,
        "success_rate": (completed_optimizations / total_optimizations * 100) if total_optimizations > 0 else 0,
        "average_delay_reduction": round(avg_delay_reduction, 2),
        "average_energy_savings": round(avg_energy_savings, 2),
        "average_computation_time": round(avg_computation_time, 2)
    }


async def run_optimization_task(optimization_id: int):
    """Background task to simulate optimization execution"""
    import asyncio
    
    optimization = next((o for o in MOCK_OPTIMIZATIONS if o["id"] == optimization_id), None)
    if not optimization:
        return
    
    try:
        # Start optimization
        optimization["status"] = "running"
        optimization["started_at"] = datetime.utcnow()
        
        # Simulate optimization progress
        for progress in range(0, 101, 10):
            optimization["progress_percentage"] = float(progress)
            await asyncio.sleep(1)  # Simulate work
            
            # Check if cancelled
            if optimization["status"] == "cancelled":
                return
        
        # Complete optimization with mock results
        optimization["status"] = "completed"
        optimization["completed_at"] = datetime.utcnow()
        optimization["progress_percentage"] = 100.0
        
        # Generate mock results based on optimization type
        if optimization["optimization_type"] == "schedule_optimization":
            optimization["results"] = {
                "optimized_schedule": [
                    {"train_id": tid, "departure_time": f"{8 + i}:00:00", "route": [1, 2, 3]}
                    for i, tid in enumerate(optimization.get("train_ids", [1, 2, 3]))
                ],
                "total_delay_reduction": 12.3,
                "energy_savings": 6.8
            }
        elif optimization["optimization_type"] == "route_optimization":
            optimization["results"] = {
                "optimized_routes": [
                    {"train_id": tid, "route": [1, 3, 2], "distance_km": 45.2}
                    for tid in optimization.get("train_ids", [1, 2, 3])
                ],
                "total_distance_saved": 8.7,
                "time_saved_minutes": 15.4
            }
        else:
            optimization["results"] = {
                "optimization_completed": True,
                "improvement_percentage": 8.5
            }
        
        # Generate mock metrics
        optimization["metrics"] = {
            "total_delay_reduction": 10.5 + (optimization_id % 10),
            "energy_savings_percentage": 5.2 + (optimization_id % 5),
            "capacity_utilization": 80.0 + (optimization_id % 20),
            "solution_quality": 0.85 + (optimization_id % 10) / 100,
            "computation_time_seconds": (optimization["completed_at"] - optimization["started_at"]).total_seconds()
        }
        
    except Exception as e:
        optimization["status"] = "failed"
        optimization["error_message"] = str(e)
        optimization["completed_at"] = datetime.utcnow()