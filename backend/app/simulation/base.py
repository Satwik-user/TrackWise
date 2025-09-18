"""
Base simulation classes for TrackWise Railway Optimization System
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from enum import Enum
import time
import json
import uuid

logger = logging.getLogger(__name__)


class SimulationStatus(str, Enum):
    """Simulation status enumeration"""
    PENDING = "pending"
    INITIALIZING = "initializing"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class SimulationType(str, Enum):
    """Types of simulations"""
    TRAIN_MOVEMENT = "train_movement"
    NETWORK_FLOW = "network_flow"
    EVENT_DRIVEN = "event_driven"
    REAL_TIME = "real_time"
    SCENARIO = "scenario"
    MONTE_CARLO = "monte_carlo"


@dataclass
class SimulationEvent:
    """Simulation event data structure"""
    event_id: str
    event_type: str
    timestamp: datetime
    entity_id: Optional[int] = None
    data: Optional[Dict[str, Any]] = None
    priority: int = 0
    
    def __post_init__(self):
        if not self.event_id:
            self.event_id = str(uuid.uuid4())
        if self.data is None:
            self.data = {}


@dataclass
class SimulationState:
    """Current state of the simulation"""
    simulation_time: datetime
    real_time: datetime
    time_scale: float  # Simulation speed multiplier
    trains: Dict[int, Dict[str, Any]]
    sections: Dict[int, Dict[str, Any]]
    events: List[SimulationEvent]
    metrics: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "simulation_time": self.simulation_time.isoformat(),
            "real_time": self.real_time.isoformat(),
            "time_scale": self.time_scale,
            "trains": self.trains,
            "sections": self.sections,
            "events": [
                {
                    "event_id": e.event_id,
                    "event_type": e.event_type,
                    "timestamp": e.timestamp.isoformat(),
                    "entity_id": e.entity_id,
                    "data": e.data,
                    "priority": e.priority
                }
                for e in self.events
            ],
            "metrics": self.metrics
        }


@dataclass
class SimulationResult:
    """Result of a simulation run"""
    simulation_id: str
    status: SimulationStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    simulation_duration: float = 0.0
    real_duration: float = 0.0
    final_state: Optional[SimulationState] = None
    metrics: Dict[str, Any] = None
    events_processed: int = 0
    error_message: Optional[str] = None
    
    def __post_init__(self):
        if self.metrics is None:
            self.metrics = {}
        if self.end_time and self.start_time:
            self.real_duration = (self.end_time - self.start_time).total_seconds()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        result = asdict(self)
        result["start_time"] = self.start_time.isoformat()
        if self.end_time:
            result["end_time"] = self.end_time.isoformat()
        if self.final_state:
            result["final_state"] = self.final_state.to_dict()
        return result
    
    def is_successful(self) -> bool:
        """Check if simulation completed successfully"""
        return self.status == SimulationStatus.COMPLETED


@dataclass
class SimulationConfig:
    """Configuration for simulation runs"""
    simulation_type: SimulationType
    duration_minutes: int
    time_scale: float = 1.0
    start_time: Optional[datetime] = None
    parameters: Dict[str, Any] = None
    output_frequency: int = 60  # seconds
    max_events: int = 10000
    
    def __post_init__(self):
        if self.parameters is None:
            self.parameters = {}
        if self.start_time is None:
            self.start_time = datetime.utcnow()


class BaseSimulator(ABC):
    """Base class for all simulators"""
    
    def __init__(self, simulation_type: SimulationType):
        self.simulation_type = simulation_type
        self.simulation_id = str(uuid.uuid4())
        self.config: Optional[SimulationConfig] = None
        self.current_state: Optional[SimulationState] = None
        self.is_running = False
        self.is_paused = False
        self.is_cancelled = False
        self.event_handlers: Dict[str, List[Callable]] = {}
        self.state_callbacks: List[Callable] = []
        self.start_time: Optional[datetime] = None
        
    @abstractmethod
    async def initialize(self, config: SimulationConfig, initial_data: Dict[str, Any]) -> bool:
        """Initialize the simulation"""
        pass
    
    @abstractmethod
    async def step(self) -> bool:
        """Execute one simulation step"""
        pass
    
    @abstractmethod
    async def finalize(self) -> SimulationResult:
        """Finalize and return simulation results"""
        pass
    
    async def run(self, config: SimulationConfig, initial_data: Dict[str, Any]) -> SimulationResult:
        """Run the complete simulation"""
        
        self.config = config
        self.start_time = datetime.utcnow()
        
        try:
            # Initialize simulation
            logger.info(f"Initializing simulation {self.simulation_id}")
            if not await self.initialize(config, initial_data):
                return SimulationResult(
                    simulation_id=self.simulation_id,
                    status=SimulationStatus.FAILED,
                    start_time=self.start_time,
                    end_time=datetime.utcnow(),
                    error_message="Simulation initialization failed"
                )
            
            # Run simulation loop
            self.is_running = True
            logger.info(f"Starting simulation {self.simulation_id}")
            
            step_count = 0
            max_steps = config.duration_minutes * 60  # Convert to seconds
            
            while self.is_running and step_count < max_steps:
                if self.is_cancelled:
                    break
                
                if self.is_paused:
                    await asyncio.sleep(0.1)
                    continue
                
                # Execute simulation step
                if not await self.step():
                    logger.warning(f"Simulation step failed at step {step_count}")
                    break
                
                step_count += 1
                
                # Call state callbacks
                for callback in self.state_callbacks:
                    try:
                        await callback(self.current_state)
                    except Exception as e:
                        logger.warning(f"State callback error: {e}")
                
                # Control simulation speed
                if config.time_scale > 0:
                    await asyncio.sleep(1.0 / config.time_scale)
            
            # Finalize simulation
            self.is_running = False
            result = await self.finalize()
            
            logger.info(f"Simulation {self.simulation_id} completed with status: {result.status}")
            return result
            
        except Exception as e:
            logger.error(f"Simulation {self.simulation_id} failed: {e}")
            self.is_running = False
            
            return SimulationResult(
                simulation_id=self.simulation_id,
                status=SimulationStatus.FAILED,
                start_time=self.start_time,
                end_time=datetime.utcnow(),
                error_message=str(e)
            )
    
    def pause(self):
        """Pause the simulation"""
        self.is_paused = True
        logger.info(f"Simulation {self.simulation_id} paused")
    
    def resume(self):
        """Resume the simulation"""
        self.is_paused = False
        logger.info(f"Simulation {self.simulation_id} resumed")
    
    def cancel(self):
        """Cancel the simulation"""
        self.is_cancelled = True
        self.is_running = False
        logger.info(f"Simulation {self.simulation_id} cancelled")
    
    def register_event_handler(self, event_type: str, handler: Callable):
        """Register an event handler"""
        if event_type not in self.event_handlers:
            self.event_handlers[event_type] = []
        self.event_handlers[event_type].append(handler)
    
    def register_state_callback(self, callback: Callable):
        """Register a state change callback"""
        self.state_callbacks.append(callback)
    
    async def emit_event(self, event: SimulationEvent):
        """Emit a simulation event"""
        if event.event_type in self.event_handlers:
            for handler in self.event_handlers[event.event_type]:
                try:
                    await handler(event, self.current_state)
                except Exception as e:
                    logger.warning(f"Event handler error for {event.event_type}: {e}")
    
    def get_progress(self) -> Dict[str, Any]:
        """Get simulation progress"""
        if not self.config or not self.start_time:
            return {"progress": 0.0, "status": "not_started"}
        
        elapsed = (datetime.utcnow() - self.start_time).total_seconds()
        total_duration = self.config.duration_minutes * 60
        progress = min(100.0, (elapsed / total_duration) * 100) if total_duration > 0 else 0
        
        return {
            "progress": progress,
            "status": self.get_status(),
            "elapsed_seconds": elapsed,
            "simulation_time": self.current_state.simulation_time.isoformat() if self.current_state else None,
            "events_processed": len(self.current_state.events) if self.current_state else 0
        }
    
    def get_status(self) -> str:
        """Get current simulation status"""
        if self.is_cancelled:
            return SimulationStatus.CANCELLED.value
        elif not self.is_running and self.start_time:
            return SimulationStatus.COMPLETED.value
        elif self.is_paused:
            return SimulationStatus.PAUSED.value
        elif self.is_running:
            return SimulationStatus.RUNNING.value
        else:
            return SimulationStatus.PENDING.value
    
    def _create_initial_state(self, initial_data: Dict[str, Any]) -> SimulationState:
        """Create initial simulation state"""
        return SimulationState(
            simulation_time=self.config.start_time,
            real_time=datetime.utcnow(),
            time_scale=self.config.time_scale,
            trains={
                train["id"]: train.copy()
                for train in initial_data.get("trains", [])
            },
            sections={
                section["id"]: section.copy()
                for section in initial_data.get("sections", [])
            },
            events=[],
            metrics={}
        )
    
    def _update_metrics(self):
        """Update simulation metrics"""
        if not self.current_state:
            return
        
        # Calculate basic metrics
        total_trains = len(self.current_state.trains)
        running_trains = sum(1 for train in self.current_state.trains.values() 
                           if train.get("status") == "RUNNING")
        delayed_trains = sum(1 for train in self.current_state.trains.values()
                           if train.get("delay_minutes", 0) > 0)
        
        total_delay = sum(train.get("delay_minutes", 0) 
                         for train in self.current_state.trains.values())
        avg_delay = total_delay / total_trains if total_trains > 0 else 0
        
        # Section utilization
        section_utilization = {}
        for section_id, section in self.current_state.sections.items():
            max_capacity = section.get("max_capacity", 1)
            current_trains = sum(1 for train in self.current_state.trains.values()
                               if train.get("current_section") == section_id)
            utilization = current_trains / max_capacity if max_capacity > 0 else 0
            section_utilization[section_id] = utilization
        
        avg_utilization = sum(section_utilization.values()) / len(section_utilization) if section_utilization else 0
        
        self.current_state.metrics.update({
            "total_trains": total_trains,
            "running_trains": running_trains,
            "delayed_trains": delayed_trains,
            "total_delay_minutes": total_delay,
            "average_delay_minutes": avg_delay,
            "average_section_utilization": avg_utilization,
            "events_processed": len(self.current_state.events),
            "simulation_time": self.current_state.simulation_time.isoformat(),
            "time_scale": self.current_state.time_scale
        })


class SimpleEventSimulator(BaseSimulator):
    """Simple event-driven simulator for basic scenarios"""
    
    def __init__(self):
        super().__init__(SimulationType.EVENT_DRIVEN)
        self.event_queue: List[SimulationEvent] = []
        self.processed_events: List[SimulationEvent] = []
    
    async def initialize(self, config: SimulationConfig, initial_data: Dict[str, Any]) -> bool:
        """Initialize the event simulator"""
        try:
            self.current_state = self._create_initial_state(initial_data)
            
            # Generate initial events
            await self._generate_initial_events()
            
            logger.info(f"Event simulator initialized with {len(self.event_queue)} events")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize event simulator: {e}")
            return False
    
    async def step(self) -> bool:
        """Process next event in the queue"""
        try:
            if not self.event_queue:
                # No more events to process
                return False
            
            # Sort events by timestamp and priority
            self.event_queue.sort(key=lambda e: (e.timestamp, e.priority))
            
            # Process next event
            event = self.event_queue.pop(0)
            await self._process_event(event)
            
            # Update simulation time
            self.current_state.simulation_time = event.timestamp
            self.current_state.real_time = datetime.utcnow()
            
            # Add processed event to history
            self.processed_events.append(event)
            self.current_state.events.append(event)
            
            # Update metrics
            self._update_metrics()
            
            # Emit event to handlers
            await self.emit_event(event)
            
            return True
            
        except Exception as e:
            logger.error(f"Error processing simulation step: {e}")
            return False
    
    async def finalize(self) -> SimulationResult:
        """Finalize the simulation"""
        end_time = datetime.utcnow()
        
        return SimulationResult(
            simulation_id=self.simulation_id,
            status=SimulationStatus.COMPLETED if not self.is_cancelled else SimulationStatus.CANCELLED,
            start_time=self.start_time,
            end_time=end_time,
            final_state=self.current_state,
            metrics=self.current_state.metrics if self.current_state else {},
            events_processed=len(self.processed_events)
        )
    
    async def _generate_initial_events(self):
        """Generate initial simulation events"""
        base_time = self.current_state.simulation_time
        
        # Generate train departure events
        for train_id, train in self.current_state.trains.items():
            scheduled_departure = train.get("scheduled_departure")
            if isinstance(scheduled_departure, str):
                scheduled_departure = datetime.fromisoformat(scheduled_departure.replace('Z', '+00:00'))
            
            if scheduled_departure:
                event = SimulationEvent(
                    event_id=f"departure_{train_id}",
                    event_type="train_departure",
                    timestamp=scheduled_departure,
                    entity_id=train_id,
                    data={"train_id": train_id, "action": "depart"},
                    priority=1
                )
                self.event_queue.append(event)
        
        # Generate section maintenance events (random)
        for section_id, section in self.current_state.sections.items():
            # Random maintenance event in the next 24 hours
            maintenance_time = base_time + timedelta(hours=np.random.uniform(1, 24))
            
            event = SimulationEvent(
                event_id=f"maintenance_{section_id}",
                event_type="section_maintenance",
                timestamp=maintenance_time,
                entity_id=section_id,
                data={"section_id": section_id, "duration_minutes": 60},
                priority=2
            )
            self.event_queue.append(event)
        
        # Generate random delay events
        for i in range(5):  # 5 random delays
            delay_time = base_time + timedelta(minutes=np.random.uniform(30, 480))
            train_id = np.random.choice(list(self.current_state.trains.keys()))
            
            event = SimulationEvent(
                event_id=f"delay_{i}",
                event_type="train_delay",
                timestamp=delay_time,
                entity_id=train_id,
                data={
                    "train_id": train_id,
                    "delay_minutes": np.random.uniform(5, 30),
                    "cause": "signal_failure"
                },
                priority=3
            )
            self.event_queue.append(event)
    
    async def _process_event(self, event: SimulationEvent):
        """Process a simulation event"""
        
        if event.event_type == "train_departure":
            await self._process_train_departure(event)
        elif event.event_type == "train_arrival":
            await self._process_train_arrival(event)
        elif event.event_type == "train_delay":
            await self._process_train_delay(event)
        elif event.event_type == "section_maintenance":
            await self._process_section_maintenance(event)
        else:
            logger.warning(f"Unknown event type: {event.event_type}")
    
    async def _process_train_departure(self, event: SimulationEvent):
        """Process train departure event"""
        train_id = event.entity_id
        
        if train_id in self.current_state.trains:
            train = self.current_state.trains[train_id]
            train["status"] = "RUNNING"
            train["actual_departure"] = event.timestamp.isoformat()
            
            # Schedule arrival event
            route = train.get("route", [])
            if route and len(route) > 1:
                # Simple calculation: 30 minutes to next section
                arrival_time = event.timestamp + timedelta(minutes=30)
                
                arrival_event = SimulationEvent(
                    event_id=f"arrival_{train_id}",
                    event_type="train_arrival",
                    timestamp=arrival_time,
                    entity_id=train_id,
                    data={"train_id": train_id, "section_id": route[1]},
                    priority=1
                )
                self.event_queue.append(arrival_event)
    
    async def _process_train_arrival(self, event: SimulationEvent):
        """Process train arrival event"""
        train_id = event.entity_id
        section_id = event.data.get("section_id")
        
        if train_id in self.current_state.trains:
            train = self.current_state.trains[train_id]
            train["current_section"] = section_id
            train["last_position_update"] = event.timestamp.isoformat()
            
            # Check if this is the final destination
            route = train.get("route", [])
            if section_id == route[-1]:
                train["status"] = "COMPLETED"
                train["actual_arrival"] = event.timestamp.isoformat()
    
    async def _process_train_delay(self, event: SimulationEvent):
        """Process train delay event"""
        train_id = event.entity_id
        delay_minutes = event.data.get("delay_minutes", 0)
        
        if train_id in self.current_state.trains:
            train = self.current_state.trains[train_id]
            current_delay = train.get("delay_minutes", 0)
            train["delay_minutes"] = current_delay + delay_minutes
            train["delay_updated_at"] = event.timestamp.isoformat()
    
    async def _process_section_maintenance(self, event: SimulationEvent):
        """Process section maintenance event"""
        section_id = event.entity_id
        duration = event.data.get("duration_minutes", 60)
        
        if section_id in self.current_state.sections:
            section = self.current_state.sections[section_id]
            section["status"] = "MAINTENANCE"
            section["maintenance_until"] = (event.timestamp + timedelta(minutes=duration)).isoformat()


# Import numpy for random number generation
import numpy as np

# Export classes
__all__ = [
    "BaseSimulator",
    "SimulationResult",
    "SimulationState",
    "SimulationEvent",
    "SimulationConfig",
    "SimulationStatus",
    "SimulationType",
    "SimpleEventSimulator"
]