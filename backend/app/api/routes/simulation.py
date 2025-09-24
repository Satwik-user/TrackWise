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


# Enhanced simulation instance
enhanced_simulation = None
simulation_task = None


@router.get("/status", response_model=Dict[str, Any])
async def get_simulation_status(
    current_user: dict = Depends(get_current_active_user)
):
    """Get current simulation status"""
    global enhanced_simulation
    
    if not enhanced_simulation:
        return {
            "status": "not_running",
            "message": "No simulation is currently running"
        }
    
    return {
        "status": enhanced_simulation.status.value,
        "current_time": enhanced_simulation.current_time.isoformat() if enhanced_simulation.current_time else None,
        "start_time": enhanced_simulation.start_time.isoformat() if enhanced_simulation.start_time else None,
        "end_time": enhanced_simulation.end_time.isoformat() if enhanced_simulation.end_time else None,
        "progress_percentage": enhanced_simulation._calculate_progress() if enhanced_simulation else 0.0,
        "active_trains": enhanced_simulation._count_active_trains() if enhanced_simulation else 0,
        "total_trains": len(enhanced_simulation.trains) if enhanced_simulation else 0,
        "total_sections": len(enhanced_simulation.sections) if enhanced_simulation else 0
    }


@router.post("/start", response_model=Dict[str, Any])
async def start_simulation(
    request: SimulationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_active_user)
):
    """Start a new enhanced simulation with real train movement"""
    global enhanced_simulation, simulation_task
    
    # Stop existing simulation if running
    if enhanced_simulation and enhanced_simulation.status in [SimulationStatus.RUNNING, SimulationStatus.PAUSED]:
        await enhanced_simulation.stop()
        if simulation_task:
            simulation_task.cancel()
    
    try:
        # Create new enhanced simulation
        from app.services.enhanced_simulation_engine import EnhancedSimulationEngine
        enhanced_simulation = EnhancedSimulationEngine()
        
        # Start enhanced simulation in background
        background_tasks.add_task(
            run_enhanced_simulation_background,
            request.duration_hours
        )
        
        return {
            "status": "started",
            "message": f"Enhanced simulation '{request.name}' started successfully with real train movement",
            "simulation_id": f"enhanced_sim_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "duration_hours": request.duration_hours,
            "features": ["real_train_movement", "dynamic_metrics", "position_tracking"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start enhanced simulation: {str(e)}"
        )


@router.post("/pause", response_model=Dict[str, Any])
async def pause_simulation(
    current_user: dict = Depends(get_current_active_user)
):
    """Pause the current enhanced simulation"""
    global enhanced_simulation
    
    if not enhanced_simulation:
        raise HTTPException(
            status_code=404,
            detail="No simulation is currently running"
        )
    
    if enhanced_simulation.status != SimulationStatus.RUNNING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot pause simulation in {enhanced_simulation.status} status"
        )
    
    await enhanced_simulation.pause()
    
    return {
        "status": "paused",
        "message": "Enhanced simulation paused successfully"
    }


@router.post("/resume", response_model=Dict[str, Any])
async def resume_simulation(
    current_user: dict = Depends(get_current_active_user)
):
    """Resume the paused enhanced simulation"""
    global enhanced_simulation
    
    if not enhanced_simulation:
        raise HTTPException(
            status_code=404,
            detail="No simulation is currently running"
        )
    
    if enhanced_simulation.status != SimulationStatus.PAUSED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot resume simulation in {enhanced_simulation.status} status"
        )
    
    await enhanced_simulation.resume()
    
    return {
        "status": "resumed",
        "message": "Enhanced simulation resumed successfully"
    }


@router.post("/stop", response_model=Dict[str, Any])
async def stop_simulation(
    current_user: dict = Depends(get_current_active_user)
):
    """Stop the current enhanced simulation"""
    global enhanced_simulation, simulation_task
    
    if not enhanced_simulation:
        raise HTTPException(
            status_code=404,
            detail="No simulation is currently running"
        )
    
    await enhanced_simulation.stop()
    
    if simulation_task:
        simulation_task.cancel()
        simulation_task = None
    
    return {
        "status": "stopped",
        "message": "Enhanced simulation stopped successfully"
    }


@router.get("/metrics", response_model=SimulationMetricsResponse)
async def get_simulation_metrics(
    current_user: dict = Depends(get_current_active_user)
):
    """Get current enhanced simulation metrics with real-time data"""
    global enhanced_simulation
    
    if not enhanced_simulation:
        raise HTTPException(
            status_code=404,
            detail="No simulation is currently running"
        )
    
    # Get real-time metrics from enhanced simulation
    if hasattr(enhanced_simulation, 'current_metrics'):
        metrics = enhanced_simulation.current_metrics
        return SimulationMetricsResponse(
            total_delay_minutes=metrics.total_delay_minutes,
            average_delay_per_train=metrics.average_delay_per_train,
            on_time_percentage=metrics.on_time_percentage,
            section_utilization=metrics.section_utilization,
            throughput_trains_per_hour=metrics.throughput_trains_per_hour,
            energy_consumption=0.0,  # Future enhancement
            cost_efficiency=0.0     # Future enhancement
        )
    else:
        # Fallback to basic metrics
        return SimulationMetricsResponse(
            total_delay_minutes=0.0,
            average_delay_per_train=0.0,
            on_time_percentage=100.0,
            section_utilization={},
            throughput_trains_per_hour=0.0,
            energy_consumption=0.0,
            cost_efficiency=0.0
        )


@router.get("/trains/positions", response_model=Dict[str, Any])
async def get_train_positions(
    current_user: dict = Depends(get_current_active_user)
):
    """Get real-time train positions with enhanced tracking"""
    global enhanced_simulation
    
    if not enhanced_simulation:
        raise HTTPException(
            status_code=404,
            detail="No simulation is currently running"
        )
    
    # Get real-time train positions from enhanced simulation
    return enhanced_simulation.get_train_positions()


async def run_enhanced_simulation_background(duration_hours: int):
    """Run enhanced simulation in background task with real train movement"""
    global enhanced_simulation, simulation_task
    
    try:
        async with AsyncSessionLocal() as session:
            # Initialize enhanced simulation
            await enhanced_simulation.initialize(session, duration_hours=duration_hours)
            
            # Start broadcasting initial state
            await broadcast_simulation_update("simulation_started", {
                "status": enhanced_simulation.status.value,
                "start_time": enhanced_simulation.start_time.isoformat() if enhanced_simulation.start_time else None,
                "end_time": enhanced_simulation.end_time.isoformat() if enhanced_simulation.end_time else None,
                "total_trains": len(enhanced_simulation.trains),
                "total_sections": len(enhanced_simulation.sections)
            })
            
            # Run enhanced simulation with periodic updates
            simulation_task = asyncio.create_task(run_enhanced_with_updates(session))
            await simulation_task
            
    except asyncio.CancelledError:
        await broadcast_simulation_update("simulation_cancelled", {
            "status": "cancelled",
            "message": "Enhanced simulation was cancelled"
        })
    except Exception as e:
        logger.error(f"Enhanced simulation background task failed: {e}")
        await broadcast_simulation_update("simulation_error", {
            "status": "failed", 
            "error": str(e)
        })


async def run_simulation_background(duration_hours: int, scenario_config: Dict[str, Any]):
    """Legacy simulation background task - keeping for compatibility"""
    # Redirect to enhanced simulation
    await run_enhanced_simulation_background(duration_hours)


async def run_enhanced_with_updates(session):
    """Run enhanced simulation with periodic WebSocket updates"""
    global enhanced_simulation
    
    try:
        # Start enhanced simulation with real train movement
        metrics = await enhanced_simulation.run(session)
        
        # Broadcast completion
        await broadcast_simulation_update("simulation_completed", {
            "status": "completed",
            "metrics": {
                "total_delay_minutes": metrics.total_delay_minutes,
                "on_time_percentage": metrics.on_time_percentage,
                "active_trains": metrics.active_trains,
                "throughput": metrics.throughput_trains_per_hour
            }
        })
        
    except Exception as e:
        logger.error(f"Enhanced simulation execution failed: {e}")
        await broadcast_simulation_update("simulation_failed", {
            "status": "failed",
            "error": str(e)
        })


async def run_with_updates(session):
    """Legacy simulation runner - redirect to enhanced"""
    # Redirect to enhanced simulation
    await run_enhanced_with_updates(session)


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