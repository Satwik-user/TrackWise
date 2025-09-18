"""
Simulation service for TrackWise Railway Optimization System
"""

from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
import asyncio
import logging
import json
from dataclasses import dataclass
from enum import Enum

from app.models.train import Train, TrainStatus
from app.models.section import Section, SectionStatus
from app.models.optimization import OptimizationRun, OptimizationDecision
from app.services.train_service import train_service
from app.services.section_service import section_service
from app.utils.exceptions import ValidationError, NotFoundError
from app.config import settings

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


@dataclass
class SimulationEvent:
    """Simulation event data structure"""
    timestamp: datetime
    event_type: str
    entity_id: int
    entity_type: str
    data: Dict[str, Any]
    priority: int = 1


@dataclass
class SimulationMetrics:
    """Simulation metrics data structure"""
    total_delay_minutes: float
    average_delay_per_train: float
    on_time_percentage: float
    section_utilization: Dict[int, float]
    throughput_trains_per_hour: float
    energy_consumption: float
    cost_efficiency: float


class SimulationEngine:
    """Core simulation engine for railway operations"""
    
    def __init__(self):
        self.status = SimulationStatus.PENDING
        self.speed = SimulationSpeed.REAL_TIME
        self.current_time = datetime.utcnow()
        self.start_time = None
        self.end_time = None
        self.events = []
        self.metrics = None
        self._stop_flag = False
        self._pause_flag = False
    
    async def initialize(
        self,
        db: AsyncSession,
        scenario_config: Dict[str, Any],
        start_time: Optional[datetime] = None,
        duration_hours: int = 24
    ):
        """Initialize simulation with scenario configuration"""
        
        self.start_time = start_time or datetime.utcnow()
        self.end_time = self.start_time + timedelta(hours=duration_hours)
        self.current_time = self.start_time
        
        # Load initial state
        await self._load_initial_state(db, scenario_config)
        
        # Generate initial events
        await self._generate_initial_events(db, scenario_config)
        
        logger.info(f"Simulation initialized from {self.start_time} to {self.end_time}")
    
    async def run(self, db: AsyncSession) -> SimulationMetrics:
        """Run the simulation"""
        
        self.status = SimulationStatus.RUNNING
        self._stop_flag = False
        self._pause_flag = False
        
        logger.info("Starting simulation execution")
        
        try:
            while self.current_time < self.end_time and not self._stop_flag:
                if self._pause_flag:
                    await asyncio.sleep(0.1)
                    continue
                
                # Process events for current time
                await self._process_current_events(db)
                
                # Advance simulation time
                await self._advance_time()
                
                # Update metrics periodically
                if self.current_time.minute % 5 == 0:  # Every 5 minutes
                    await self._update_metrics(db)
                
                # Yield control to event loop
                await asyncio.sleep(0.001)
            
            # Final metrics calculation
            self.metrics = await self._calculate_final_metrics(db)
            self.status = SimulationStatus.COMPLETED
            
            logger.info("Simulation completed successfully")
            
            return self.metrics
            
        except Exception as e:
            self.status = SimulationStatus.FAILED
            logger.error(f"Simulation failed: {e}")
            raise
    
    async def pause(self):
        """Pause the simulation"""
        self._pause_flag = True
        self.status = SimulationStatus.PAUSED
        logger.info("Simulation paused")
    
    async def resume(self):
        """Resume the simulation"""
        self._pause_flag = False
        self.status = SimulationStatus.RUNNING
        logger.info("Simulation resumed")
    
    async def stop(self):
        """Stop the simulation"""
        self._stop_flag = True
        self.status = SimulationStatus.CANCELLED
        logger.info("Simulation stopped")
    
    async def _load_initial_state(self, db: AsyncSession, config: Dict[str, Any]):
        """Load initial state from database"""
        
        # Load trains
        trains_query = select(Train).where(
            and_(Train.is_deleted == False, Train.is_active == True)
        )
        trains_result = await db.execute(trains_query)
        self.trains = {train.id: train for train in trains_result.scalars().all()}
        
        # Load sections
        sections_query = select(Section).where(
            and_(Section.is_deleted == False, Section.is_active == True)
        )
        sections_result = await db.execute(sections_query)
        self.sections = {section.id: section for section in sections_result.scalars().all()}
        
        # Initialize simulation state
        self.train_positions = {}
        self.section_occupancy = {}
        
        for train_id, train in self.trains.items():
            self.train_positions[train_id] = {
                "current_section": train.current_section,
                "progress": 0.0,  # Progress through current section (0-1)
                "speed": train.current_speed or settings.DEFAULT_TRAIN_SPEED,
                "delay": train.delay_minutes
            }
        
        for section_id, section in self.sections.items():
            self.section_occupancy[section_id] = []
    
    async def _generate_initial_events(self, db: AsyncSession, config: Dict[str, Any]):
        """Generate initial simulation events"""
        
        self.events = []
        
        # Generate train departure events
        for train_id, train in self.trains.items():
            if train.status == TrainStatus.STOPPED:
                # Schedule departure
                departure_time = self.start_time + timedelta(minutes=30)  # 30 min from start
                event = SimulationEvent(
                    timestamp=departure_time,
                    event_type="train_departure",
                    entity_id=train_id,
                    entity_type="train",
                    data={"destination_section": train.current_section + 1}
                )
                self.events.append(event)
        
        # Generate maintenance events
        for section_id, section in self.sections.items():
            if section.status == SectionStatus.AVAILABLE:
                # Random maintenance events
                maintenance_time = self.start_time + timedelta(hours=12)
                event = SimulationEvent(
                    timestamp=maintenance_time,
                    event_type="section_maintenance",
                    entity_id=section_id,
                    entity_type="section",
                    data={"duration_minutes": 60}
                )
                self.events.append(event)
        
        # Sort events by timestamp
        self.events.sort(key=lambda x: x.timestamp)
    
    async def _process_current_events(self, db: AsyncSession):
        """Process all events scheduled for current time"""
        
        current_events = [
            event for event in self.events 
            if event.timestamp <= self.current_time
        ]
        
        for event in current_events:
            await self._process_event(db, event)
            self.events.remove(event)
    
    async def _process_event(self, db: AsyncSession, event: SimulationEvent):
        """Process a single simulation event"""
        
        if event.event_type == "train_departure":
            await self._handle_train_departure(db, event)
        elif event.event_type == "train_arrival":
            await self._handle_train_arrival(db, event)
        elif event.event_type == "section_maintenance":
            await self._handle_section_maintenance(db, event)
        elif event.event_type == "delay_incident":
            await self._handle_delay_incident(db, event)
        else:
            logger.warning(f"Unknown event type: {event.event_type}")
    
    async def _handle_train_departure(self, db: AsyncSession, event: SimulationEvent):
        """Handle train departure event"""
        
        train_id = event.entity_id
        train = self.trains.get(train_id)
        
        if not train:
            return
        
        # Update train status
        train.status = TrainStatus.RUNNING
        
        # Calculate arrival time at next section
        destination_section = event.data.get("destination_section")
        if destination_section and destination_section in self.sections:
            section = self.sections[destination_section]
            travel_time = section.length_km / (train.current_speed or settings.DEFAULT_TRAIN_SPEED) * 60  # minutes
            
            arrival_time = event.timestamp + timedelta(minutes=travel_time)
            arrival_event = SimulationEvent(
                timestamp=arrival_time,
                event_type="train_arrival",
                entity_id=train_id,
                entity_type="train",
                data={"section_id": destination_section}
            )
            self.events.append(arrival_event)
            self.events.sort(key=lambda x: x.timestamp)
        
        logger.debug(f"Train {train.train_number} departed at {event.timestamp}")
    
    async def _handle_train_arrival(self, db: AsyncSession, event: SimulationEvent):
        """Handle train arrival event"""
        
        train_id = event.entity_id
        section_id = event.data.get("section_id")
        
        train = self.trains.get(train_id)
        section = self.sections.get(section_id)
        
        if not train or not section:
            return
        
        # Check section capacity
        current_occupancy = len(self.section_occupancy.get(section_id, []))
        if current_occupancy >= section.max_capacity:
            # Delay the train
            delay_minutes = 10
            train.delay_minutes += delay_minutes
            
            # Reschedule arrival
            delayed_arrival = event.timestamp + timedelta(minutes=delay_minutes)
            delayed_event = SimulationEvent(
                timestamp=delayed_arrival,
                event_type="train_arrival",
                entity_id=train_id,
                entity_type="train",
                data=event.data
            )
            self.events.append(delayed_event)
            self.events.sort(key=lambda x: x.timestamp)
            
            logger.debug(f"Train {train.train_number} delayed by {delay_minutes} minutes")
            return
        
        # Move train to new section
        old_section = train.current_section
        train.current_section = section_id
        
        # Update occupancy tracking
        if old_section:
            old_occupancy = self.section_occupancy.get(old_section, [])
            if train_id in old_occupancy:
                old_occupancy.remove(train_id)
        
        new_occupancy = self.section_occupancy.get(section_id, [])
        new_occupancy.append(train_id)
        self.section_occupancy[section_id] = new_occupancy
        
        logger.debug(f"Train {train.train_number} arrived at section {section.section_code}")
    
    async def _handle_section_maintenance(self, db: AsyncSession, event: SimulationEvent):
        """Handle section maintenance event"""
        
        section_id = event.entity_id
        section = self.sections.get(section_id)
        
        if not section:
            return
        
        # Set section to maintenance
        section.status = SectionStatus.MAINTENANCE
        
        # Schedule maintenance completion
        duration = event.data.get("duration_minutes", 60)
        completion_time = event.timestamp + timedelta(minutes=duration)
        
        completion_event = SimulationEvent(
            timestamp=completion_time,
            event_type="maintenance_complete",
            entity_id=section_id,
            entity_type="section",
            data={}
        )
        self.events.append(completion_event)
        self.events.sort(key=lambda x: x.timestamp)
        
        logger.debug(f"Section {section.section_code} entered maintenance")
    
    async def _handle_delay_incident(self, db: AsyncSession, event: SimulationEvent):
        """Handle delay incident event"""
        
        train_id = event.entity_id
        train = self.trains.get(train_id)
        
        if not train:
            return
        
        delay_minutes = event.data.get("delay_minutes", 15)
        train.delay_minutes += delay_minutes
        train.status = TrainStatus.DELAYED
        
        logger.debug(f"Train {train.train_number} delayed by {delay_minutes} minutes due to incident")
    
    async def _advance_time(self):
        """Advance simulation time based on speed setting"""
        
        time_increment = {
            SimulationSpeed.REAL_TIME: timedelta(seconds=1),
            SimulationSpeed.FAST_2X: timedelta(seconds=2),
            SimulationSpeed.FAST_5X: timedelta(seconds=5),
            SimulationSpeed.FAST_10X: timedelta(seconds=10),
            SimulationSpeed.INSTANT: timedelta(minutes=1)
        }
        
        increment = time_increment.get(self.speed, timedelta(seconds=1))
        self.current_time += increment
        
        # Real-world delay based on speed
        real_delay = {
            SimulationSpeed.REAL_TIME: 1.0,
            SimulationSpeed.FAST_2X: 0.5,
            SimulationSpeed.FAST_5X: 0.2,
            SimulationSpeed.FAST_10X: 0.1,
            SimulationSpeed.INSTANT: 0.001
        }
        
        delay = real_delay.get(self.speed, 1.0)
        await asyncio.sleep(delay)
    
    async def _update_metrics(self, db: AsyncSession):
        """Update simulation metrics"""
        
        # Calculate current metrics
        total_trains = len(self.trains)
        delayed_trains = sum(1 for train in self.trains.values() if train.delay_minutes > 5)
        on_time_trains = total_trains - delayed_trains
        
        self.current_metrics = {
            "timestamp": self.current_time.isoformat(),
            "total_trains": total_trains,
            "delayed_trains": delayed_trains,
            "on_time_trains": on_time_trains,
            "on_time_percentage": (on_time_trains / total_trains * 100) if total_trains > 0 else 0,
            "average_delay": sum(train.delay_minutes for train in self.trains.values()) / total_trains if total_trains > 0 else 0
        }
    
    async def _calculate_final_metrics(self, db: AsyncSession) -> SimulationMetrics:
        """Calculate final simulation metrics"""
        
        total_trains = len(self.trains)
        total_delay = sum(train.delay_minutes for train in self.trains.values())
        delayed_trains = sum(1 for train in self.trains.values() if train.delay_minutes > 5)
        
        # Section utilization
        section_utilization = {}
        for section_id, occupancy in self.section_occupancy.items():
            section = self.sections.get(section_id)
            if section:
                utilization = len(occupancy) / section.max_capacity * 100
                section_utilization[section_id] = round(utilization, 2)
        
        # Calculate other metrics
        average_delay = total_delay / total_trains if total_trains > 0 else 0
        on_time_percentage = ((total_trains - delayed_trains) / total_trains * 100) if total_trains > 0 else 0
        
        return SimulationMetrics(
            total_delay_minutes=total_delay,
            average_delay_per_train=round(average_delay, 2),
            on_time_percentage=round(on_time_percentage, 2),
            section_utilization=section_utilization,
            throughput_trains_per_hour=0.0,  # Would need more complex calculation
            energy_consumption=0.0,  # Would need energy model
            cost_efficiency=0.0  # Would need cost model
        )


class SimulationService:
    """Service for managing railway simulations"""
    
    def __init__(self):
        self.active_simulations: Dict[str, SimulationEngine] = {}
    
    async def create_simulation(
        self,
        db: AsyncSession,
        name: str,
        description: str,
        scenario_config: Dict[str, Any],
        user_id: int,
        start_time: Optional[datetime] = None,
        duration_hours: int = 24
    ) -> str:
        """Create a new simulation"""
        
        simulation_id = f"sim_{int(datetime.utcnow().timestamp())}_{user_id}"
        
        engine = SimulationEngine()
        await engine.initialize(db, scenario_config, start_time, duration_hours)
        
        self.active_simulations[simulation_id] = engine
        
        logger.info(f"Simulation {simulation_id} created by user {user_id}")
        
        return simulation_id
    
    async def start_simulation(self, db: AsyncSession, simulation_id: str) -> SimulationMetrics:
        """Start a simulation"""
        
        engine = self.active_simulations.get(simulation_id)
        if not engine:
            raise NotFoundError("Simulation not found")
        
        try:
            metrics = await engine.run(db)
            return metrics
        finally:
            # Clean up completed simulation
            del self.active_simulations[simulation_id]
    
    async def pause_simulation(self, simulation_id: str):
        """Pause a running simulation"""
        
        engine = self.active_simulations.get(simulation_id)
        if not engine:
            raise NotFoundError("Simulation not found")
        
        await engine.pause()
    
    async def resume_simulation(self, simulation_id: str):
        """Resume a paused simulation"""
        
        engine = self.active_simulations.get(simulation_id)
        if not engine:
            raise NotFoundError("Simulation not found")
        
        await engine.resume()
    
    async def stop_simulation(self, simulation_id: str):
        """Stop a simulation"""
        
        engine = self.active_simulations.get(simulation_id)
        if not engine:
            raise NotFoundError("Simulation not found")
        
        await engine.stop()
        del self.active_simulations[simulation_id]
    
    async def get_simulation_status(self, simulation_id: str) -> Dict[str, Any]:
        """Get simulation status and metrics"""
        
        engine = self.active_simulations.get(simulation_id)
        if not engine:
            raise NotFoundError("Simulation not found")
        
        return {
            "simulation_id": simulation_id,
            "status": engine.status.value,
            "current_time": engine.current_time.isoformat(),
            "start_time": engine.start_time.isoformat() if engine.start_time else None,
            "end_time": engine.end_time.isoformat() if engine.end_time else None,
            "speed": engine.speed.value,
            "current_metrics": getattr(engine, 'current_metrics', {}),
            "progress_percentage": self._calculate_progress(engine)
        }
    
    async def update_simulation_speed(self, simulation_id: str, speed: SimulationSpeed):
        """Update simulation speed"""
        
        engine = self.active_simulations.get(simulation_id)
        if not engine:
            raise NotFoundError("Simulation not found")
        
        engine.speed = speed
        logger.info(f"Simulation {simulation_id} speed changed to {speed.value}")
    
    def _calculate_progress(self, engine: SimulationEngine) -> float:
        """Calculate simulation progress percentage"""
        
        if not engine.start_time or not engine.end_time:
            return 0.0
        
        total_duration = (engine.end_time - engine.start_time).total_seconds()
        elapsed_duration = (engine.current_time - engine.start_time).total_seconds()
        
        progress = (elapsed_duration / total_duration * 100) if total_duration > 0 else 0
        return round(min(100.0, max(0.0, progress)), 2)
    
    async def run_optimization_simulation(
        self,
        db: AsyncSession,
        optimization_run: OptimizationRun,
        scenario_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Run simulation with optimization decisions"""
        
        simulation_id = await self.create_simulation(
            db,
            f"Optimization Simulation - {optimization_run.name}",
            f"Simulation for optimization run {optimization_run.id}",
            scenario_config,
            optimization_run.user_id
        )
        
        # Apply optimization decisions to simulation
        engine = self.active_simulations[simulation_id]
        await self._apply_optimization_decisions(engine, optimization_run)
        
        # Run simulation
        metrics = await self.start_simulation(db, simulation_id)
        
        return {
            "simulation_id": simulation_id,
            "optimization_run_id": optimization_run.id,
            "metrics": metrics.__dict__,
            "status": "completed"
        }
    
    async def _apply_optimization_decisions(
        self,
        engine: SimulationEngine,
        optimization_run: OptimizationRun
    ):
        """Apply optimization decisions to simulation"""
        
        if not optimization_run.decisions:
            return
        
        for decision in optimization_run.decisions:
            if decision.decision_type == "route_change":
                # Apply route changes
                train_id = decision.entity_id
                new_route = decision.new_value.get("route", [])
                # Update train route in simulation
                
            elif decision.decision_type == "schedule_adjustment":
                # Apply schedule adjustments
                train_id = decision.entity_id
                delay_adjustment = decision.new_value.get("delay_adjustment", 0)
                # Update train schedule in simulation
                
            elif decision.decision_type == "section_priority":
                # Apply section priority changes
                section_id = decision.entity_id
                priority = decision.new_value.get("priority", 1)
                # Update section priority in simulation


# Create service instance
simulation_service = SimulationService()

# Export service
__all__ = ["simulation_service", "SimulationService", "SimulationEngine", "SimulationMetrics", "SimulationStatus", "SimulationSpeed"]