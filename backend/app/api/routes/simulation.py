"""
Simulation API routes for TrackWise Railway Optimization System
"""

from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import logging

from app.core.security import get_current_active_user
from app.services.simulation_service import simulation_service
from app.database import AsyncSessionLocal
from app.core.websocket import websocket_manager

router = APIRouter()
logger = logging.getLogger(__name__)


class SimulationStatus(str, Enum):
    """Simulation status enumeration"""
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class SimulationSpeed(str, Enum):
    """Simulation speed enumeration"""
    REAL_TIME = "real_time"
    FAST_2X = "fast_2x"
    FAST_5X = "fast_5x"
    FAST_10X = "fast_10x"
    INSTANT = "instant"


class SimulationRequest(BaseModel):
    name: str = Field(..., description="Simulation name")
    duration_hours: int = Field(default=24, ge=1, le=168, description="Simulation duration in hours")
    speed: SimulationSpeed = Field(default=SimulationSpeed.REAL_TIME, description="Simulation speed")
    scenario_config: Dict[str, Any] = Field(default_factory=dict, description="Scenario configuration")
    auto_start: bool = Field(default=True, description="Auto-start simulation")


class SimulationResponse(BaseModel):
    id: str
    name: str
    status: SimulationStatus
    speed: SimulationSpeed
    start_time: Optional[datetime]
    current_time: Optional[datetime]
    end_time: Optional[datetime]
    progress_percentage: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SimulationMetricsResponse(BaseModel):
    total_delay_minutes: float
    average_delay_per_train: float
    on_time_percentage: float
    section_utilization: Dict[int, float]
    throughput_trains_per_hour: float
    energy_consumption: float
    cost_efficiency: float


# Global simulation instance
current_simulation = None
simulation_task = None


@router.get("/status", response_model=Dict[str, Any])
async def get_simulation_status(
    current_user: dict = Depends(get_current_active_user)
):
    """Get current simulation status"""
    global current_simulation
    
    if not current_simulation:
        return {
            "status": "not_running",
            "message": "No simulation is currently running"
        }
    
    return {
        "status": current_simulation.status.value,
        "speed": current_simulation.speed.value,
        "current_time": current_simulation.current_time.isoformat() if current_simulation.current_time else None,
        "start_time": current_simulation.start_time.isoformat() if current_simulation.start_time else None,
        "end_time": current_simulation.end_time.isoformat() if current_simulation.end_time else None,
        "progress_percentage": calculate_progress_percentage(current_simulation),
        "active_trains": len(getattr(current_simulation, 'trains', {})),
        "active_sections": len(getattr(current_simulation, 'sections', {}))
    }


@router.post("/start", response_model=Dict[str, Any])
async def start_simulation(
    request: SimulationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_active_user)
):
    """Start a new simulation"""
    global current_simulation, simulation_task
    
    # Stop existing simulation if running
    if current_simulation and current_simulation.status in [SimulationStatus.RUNNING, SimulationStatus.PAUSED]:
        await current_simulation.stop()
        if simulation_task:
            simulation_task.cancel()
    
    try:
        # Create new simulation
        from app.services.simulation_service import SimulationEngine
        current_simulation = SimulationEngine()
        current_simulation.speed = request.speed
        
        # Initialize simulation in background
        background_tasks.add_task(
            run_simulation_background,
            request.duration_hours,
            request.scenario_config
        )
        
        return {
            "status": "started",
            "message": f"Simulation '{request.name}' started successfully",
            "simulation_id": f"sim_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "duration_hours": request.duration_hours,
            "speed": request.speed.value
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start simulation: {str(e)}"
        )


@router.post("/pause", response_model=Dict[str, Any])
async def pause_simulation(
    current_user: dict = Depends(get_current_active_user)
):
    """Pause the current simulation"""
    global current_simulation
    
    if not current_simulation:
        raise HTTPException(
            status_code=404,
            detail="No simulation is currently running"
        )
    
    if current_simulation.status != SimulationStatus.RUNNING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot pause simulation in {current_simulation.status} status"
        )
    
    await current_simulation.pause()
    
    return {
        "status": "paused",
        "message": "Simulation paused successfully"
    }


@router.post("/resume", response_model=Dict[str, Any])
async def resume_simulation(
    current_user: dict = Depends(get_current_active_user)
):
    """Resume the paused simulation"""
    global current_simulation
    
    if not current_simulation:
        raise HTTPException(
            status_code=404,
            detail="No simulation is currently running"
        )
    
    if current_simulation.status != SimulationStatus.PAUSED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot resume simulation in {current_simulation.status} status"
        )
    
    await current_simulation.resume()
    
    return {
        "status": "resumed",
        "message": "Simulation resumed successfully"
    }


@router.post("/stop", response_model=Dict[str, Any])
async def stop_simulation(
    current_user: dict = Depends(get_current_active_user)
):
    """Stop the current simulation"""
    global current_simulation, simulation_task
    
    if not current_simulation:
        raise HTTPException(
            status_code=404,
            detail="No simulation is currently running"
        )
    
    await current_simulation.stop()
    
    if simulation_task:
        simulation_task.cancel()
        simulation_task = None
    
    return {
        "status": "stopped",
        "message": "Simulation stopped successfully"
    }


@router.get("/metrics", response_model=SimulationMetricsResponse)
async def get_simulation_metrics(
    current_user: dict = Depends(get_current_active_user)
):
    """Get current simulation metrics"""
    global current_simulation
    
    if not current_simulation:
        raise HTTPException(
            status_code=404,
            detail="No simulation is currently running"
        )
    
    if not current_simulation.metrics:
        # Calculate current metrics
        async with AsyncSessionLocal() as session:
            metrics = await current_simulation._calculate_final_metrics(session)
            return SimulationMetricsResponse(**metrics.__dict__)
    
    return SimulationMetricsResponse(**current_simulation.metrics.__dict__)


@router.get("/trains/positions", response_model=Dict[str, Any])
async def get_train_positions(
    current_user: dict = Depends(get_current_active_user)
):
    """Get current train positions in simulation"""
    global current_simulation
    
    if not current_simulation:
        raise HTTPException(
            status_code=404,
            detail="No simulation is currently running"
        )
    
    positions = getattr(current_simulation, 'train_positions', {})
    
    return {
        "timestamp": current_simulation.current_time.isoformat() if current_simulation.current_time else None,
        "positions": positions,
        "total_trains": len(positions)
    }


async def run_simulation_background(duration_hours: int, scenario_config: Dict[str, Any]):
    """Run simulation in background task"""
    global current_simulation, simulation_task
    
    try:
        async with AsyncSessionLocal() as session:
            # Initialize simulation
            await current_simulation.initialize(
                session, 
                scenario_config, 
                duration_hours=duration_hours
            )
            
            # Start broadcasting initial state
            await broadcast_simulation_update("simulation_started", {
                "status": current_simulation.status.value,
                "start_time": current_simulation.start_time.isoformat() if current_simulation.start_time else None,
                "end_time": current_simulation.end_time.isoformat() if current_simulation.end_time else None
            })
            
            # Run simulation with periodic updates
            simulation_task = asyncio.create_task(run_with_updates(session))
            await simulation_task
            
    except asyncio.CancelledError:
        await broadcast_simulation_update("simulation_cancelled", {
            "status": "cancelled",
            "message": "Simulation was cancelled"
        })
    except Exception as e:
        await broadcast_simulation_update("simulation_error", {
            "status": "failed",
            "error": str(e)
        })


async def run_with_updates(session):
    """Run simulation with periodic WebSocket updates"""
    global current_simulation
    
    try:
        # Start simulation
        metrics = await current_simulation.run(session)
        
        # Broadcast completion
        await broadcast_simulation_update("simulation_completed", {
            "status": "completed",
            "metrics": {
                "total_delay_minutes": metrics.total_delay_minutes,
                "on_time_percentage": metrics.on_time_percentage,
                "throughput": metrics.throughput_trains_per_hour
            }
        })
        
    except Exception as e:
        await broadcast_simulation_update("simulation_failed", {
            "status": "failed",
            "error": str(e)
        })


async def broadcast_simulation_update(event_type: str, data: Dict[str, Any]):
    """Broadcast simulation updates via WebSocket"""
    message = {
        "type": event_type,
        "timestamp": datetime.utcnow().isoformat(),
        "data": data
    }
    
    await websocket_manager.broadcast_json(message)


def calculate_progress_percentage(simulation) -> float:
    """Calculate simulation progress percentage"""
    if not simulation.start_time or not simulation.end_time or not simulation.current_time:
        return 0.0
    
    total_duration = (simulation.end_time - simulation.start_time).total_seconds()
    elapsed_duration = (simulation.current_time - simulation.start_time).total_seconds()
    
    if total_duration <= 0:
        return 0.0
    
    return min(100.0, max(0.0, (elapsed_duration / total_duration) * 100))


# Optional: Add startup task for auto-simulation
# This can be called from main.py startup if needed
async def start_demo_simulation():
    """Start a demo simulation for testing"""
    global current_simulation, simulation_task
    
    try:
        # Create demo simulation
        from app.services.simulation_service import SimulationEngine
        current_simulation = SimulationEngine()
        
        # Demo scenario config
        scenario_config = {
            "traffic_density": "normal",
            "weather_conditions": "clear",
            "include_disruptions": False,
            "optimization_enabled": True
        }
        
        # Start background simulation
        background_task = asyncio.create_task(
            run_simulation_background(24, scenario_config)
        )
        
        logger.info("Demo simulation started successfully")
        
    except Exception as e:
        logger.error(f"Failed to start demo simulation: {e}")