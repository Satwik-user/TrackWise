"""
Enhanced Simulation Engine for TrackWise Railway System
This fixes the existing simulation issues and adds real train movement
"""

import asyncio
import logging
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update

from app.models.train import Train, TrainStatus
from app.models.section import Section, SectionStatus

logger = logging.getLogger(__name__)


class SimulationStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class TrainState:
    """Enhanced train state for simulation"""
    train_id: int
    current_section_id: int
    target_section_id: Optional[int]
    position_in_section: float  # 0.0 to 1.0 (progress through section)
    speed_kmh: float
    delay_minutes: float
    status: TrainStatus
    last_update: datetime
    
    
@dataclass
class SimulationMetrics:
    """Real-time simulation metrics"""
    total_trains: int
    active_trains: int
    delayed_trains: int
    on_time_trains: int
    total_delay_minutes: float
    average_delay_per_train: float
    on_time_percentage: float
    section_utilization: Dict[int, float]
    throughput_trains_per_hour: float
    timestamp: datetime


class EnhancedSimulationEngine:
    """Enhanced simulation engine with real train movement"""
    
    def __init__(self):
        self.status = SimulationStatus.PENDING
        self.current_time = datetime.utcnow()
        self.start_time = None
        self.end_time = None
        self.speed_multiplier = 1.0
        
        # Simulation state
        self.trains: Dict[int, TrainState] = {}
        self.sections: Dict[int, Section] = {}
        self.section_occupancy: Dict[int, List[int]] = {}
        self.metrics_history: List[SimulationMetrics] = []
        
        # Control flags
        self._stop_flag = False
        self._pause_flag = False
        
        # Movement parameters
        self.min_speed_kmh = 40
        self.max_speed_kmh = 120
        self.base_speed_kmh = 80
        self.delay_threshold_minutes = 5
        
    async def initialize(self, db: AsyncSession, duration_hours: int = 24):
        """Initialize simulation with real data"""
        try:
            self.start_time = datetime.utcnow()
            self.end_time = self.start_time + timedelta(hours=duration_hours)
            self.current_time = self.start_time
            
            # Load real trains from database
            await self._load_trains(db)
            
            # Load real sections from database
            await self._load_sections(db)
            
            # Initialize train states with realistic positions
            await self._initialize_train_states()
            
            # Initialize section occupancy tracking
            self._initialize_section_occupancy()
            
            logger.info(f"Enhanced simulation initialized: {len(self.trains)} trains, {len(self.sections)} sections")
            
        except Exception as e:
            logger.error(f"Simulation initialization failed: {e}")
            raise
    
    async def _load_trains(self, db: AsyncSession):
        """Load trains from database"""
        query = select(Train).where(
            Train.train_number.isnot(None)
        ).limit(50)  # Limit for performance
        
        result = await db.execute(query)
        trains = result.scalars().all()
        
        logger.info(f"Loaded {len(trains)} trains from database")
        
        # Convert to train states
        for train in trains:
            # Assign random starting section if none exists
            start_section = train.current_section or random.randint(1, 20)
            
            train_state = TrainState(
                train_id=train.id,
                current_section_id=start_section,
                target_section_id=None,
                position_in_section=random.uniform(0.0, 1.0),
                speed_kmh=train.current_speed or self.base_speed_kmh,
                delay_minutes=train.delay_minutes or 0.0,
                status=TrainStatus.RUNNING if random.random() > 0.3 else TrainStatus.STOPPED,
                last_update=self.current_time
            )
            
            self.trains[train.id] = train_state
    
    async def _load_sections(self, db: AsyncSession):
        """Load sections from database"""
        query = select(Section).where(
            Section.section_code.isnot(None)
        ).limit(100)
        
        result = await db.execute(query)
        sections = result.scalars().all()
        
        logger.info(f"Loaded {len(sections)} sections from database")
        
        for section in sections:
            self.sections[section.id] = section
    
    async def _initialize_train_states(self):
        """Initialize realistic train states"""
        section_ids = list(self.sections.keys())
        
        for train_id, train_state in self.trains.items():
            # Ensure train is in a valid section
            if train_state.current_section_id not in section_ids:
                train_state.current_section_id = random.choice(section_ids)
            
            # Set target section for moving trains
            if train_state.status == TrainStatus.RUNNING:
                available_targets = [sid for sid in section_ids if sid != train_state.current_section_id]
                if available_targets:
                    train_state.target_section_id = random.choice(available_targets)
    
    def _initialize_section_occupancy(self):
        """Initialize section occupancy tracking"""
        for section_id in self.sections.keys():
            self.section_occupancy[section_id] = []
        
        # Place trains in their current sections
        for train_id, train_state in self.trains.items():
            section_id = train_state.current_section_id
            if section_id in self.section_occupancy:
                self.section_occupancy[section_id].append(train_id)
    
    async def run(self, db: AsyncSession) -> SimulationMetrics:
        """Run the enhanced simulation with real train movement"""
        self.status = SimulationStatus.RUNNING
        self._stop_flag = False
        self._pause_flag = False
        
        logger.info("Starting enhanced simulation with real train movement")
        
        update_interval = 5.0  # Update every 5 seconds
        last_update = self.current_time
        
        try:
            while self.current_time < self.end_time and not self._stop_flag:
                if self._pause_flag:
                    await asyncio.sleep(0.1)
                    continue
                
                # Calculate time since last update
                now = datetime.utcnow()
                time_elapsed = (now - last_update).total_seconds()
                
                if time_elapsed >= update_interval:
                    # Update train positions
                    await self._update_train_positions(db, time_elapsed)
                    
                    # Process train movements
                    await self._process_train_movements(db)
                    
                    # Generate random events
                    await self._generate_random_events()
                    
                    # Update metrics
                    await self._update_metrics()
                    
                    # Advance simulation time
                    self.current_time = now
                    last_update = now
                    
                    # Log progress every minute
                    if int(now.timestamp()) % 60 == 0:
                        progress = self._calculate_progress()
                        logger.info(f"Simulation progress: {progress:.1f}% - Active trains: {self._count_active_trains()}")
                
                await asyncio.sleep(0.1)  # Small sleep to prevent CPU overload
            
            # Final metrics
            final_metrics = await self._calculate_final_metrics()
            self.status = SimulationStatus.COMPLETED
            
            logger.info("Enhanced simulation completed successfully")
            return final_metrics
            
        except Exception as e:
            self.status = SimulationStatus.FAILED
            logger.error(f"Enhanced simulation failed: {e}")
            raise
    
    async def _update_train_positions(self, db: AsyncSession, time_elapsed_seconds: float):
        """Update train positions based on speed and time"""
        for train_id, train_state in self.trains.items():
            if train_state.status != TrainStatus.RUNNING:
                continue
            
            # Calculate distance moved
            distance_km = (train_state.speed_kmh * time_elapsed_seconds) / 3600
            
            # Get current section
            section = self.sections.get(train_state.current_section_id)
            if not section:
                continue
            
            # Convert distance to section progress
            section_length = section.length_km or 10.0  # Default 10km if no length
            progress_increment = distance_km / section_length
            
            # Update position
            train_state.position_in_section += progress_increment
            train_state.last_update = self.current_time
            
            # Add random delay chances
            if random.random() < 0.01:  # 1% chance of delay per update
                delay_amount = random.uniform(1, 10)
                train_state.delay_minutes += delay_amount
                train_state.status = TrainStatus.DELAYED
                logger.debug(f"Train {train_id} delayed by {delay_amount:.1f} minutes")
    
    async def _process_train_movements(self, db: AsyncSession):
        """Process trains that need to move to next section"""
        trains_to_move = []
        
        for train_id, train_state in self.trains.items():
            # Train completed current section
            if train_state.position_in_section >= 1.0:
                trains_to_move.append(train_id)
        
        for train_id in trains_to_move:
            await self._move_train_to_next_section(train_id)
    
    async def _move_train_to_next_section(self, train_id: int):
        """Move train to next section"""
        train_state = self.trains[train_id]
        current_section_id = train_state.current_section_id
        
        # Find next section (simple: increment section ID or random)
        available_sections = [sid for sid in self.sections.keys() if sid != current_section_id]
        if not available_sections:
            return
        
        next_section_id = train_state.target_section_id or random.choice(available_sections)
        
        # Check section capacity
        next_section = self.sections.get(next_section_id)
        if next_section:
            current_occupancy = len(self.section_occupancy.get(next_section_id, []))
            max_capacity = next_section.max_capacity or 5
            
            if current_occupancy >= max_capacity:
                # Section full, add delay and try again later
                train_state.delay_minutes += random.uniform(5, 15)
                train_state.status = TrainStatus.DELAYED
                return
        
        # Move train
        old_section_occupancy = self.section_occupancy.get(current_section_id, [])
        if train_id in old_section_occupancy:
            old_section_occupancy.remove(train_id)
        
        new_section_occupancy = self.section_occupancy.get(next_section_id, [])
        new_section_occupancy.append(train_id)
        self.section_occupancy[next_section_id] = new_section_occupancy
        
        # Update train state
        train_state.current_section_id = next_section_id
        train_state.position_in_section = 0.0
        train_state.target_section_id = random.choice(available_sections) if len(available_sections) > 1 else None
        
        # Chance to change status
        if train_state.status == TrainStatus.DELAYED and random.random() > 0.3:
            train_state.status = TrainStatus.RUNNING
        
        logger.debug(f"Train {train_id} moved to section {next_section_id}")
    
    async def _generate_random_events(self):
        """Generate random simulation events"""
        # Random speed changes
        for train_id, train_state in self.trains.items():
            if random.random() < 0.05:  # 5% chance per update
                speed_factor = random.uniform(0.8, 1.2)
                new_speed = max(self.min_speed_kmh, min(self.max_speed_kmh, train_state.speed_kmh * speed_factor))
                train_state.speed_kmh = new_speed
        
        # Random train starts/stops
        for train_id, train_state in self.trains.items():
            if random.random() < 0.02:  # 2% chance per update
                if train_state.status == TrainStatus.STOPPED:
                    train_state.status = TrainStatus.RUNNING
                    train_state.speed_kmh = self.base_speed_kmh
                elif train_state.status == TrainStatus.RUNNING and random.random() > 0.7:
                    train_state.status = TrainStatus.STOPPED
                    train_state.speed_kmh = 0
    
    async def _update_metrics(self):
        """Update real-time simulation metrics"""
        total_trains = len(self.trains)
        active_trains = self._count_active_trains()
        delayed_trains = sum(1 for t in self.trains.values() if t.delay_minutes > self.delay_threshold_minutes)
        on_time_trains = total_trains - delayed_trains
        
        total_delay = sum(t.delay_minutes for t in self.trains.values())
        avg_delay = total_delay / total_trains if total_trains > 0 else 0.0
        on_time_pct = (on_time_trains / total_trains * 100) if total_trains > 0 else 0.0
        
        # Calculate section utilization
        section_util = {}
        for section_id, occupancy in self.section_occupancy.items():
            section = self.sections.get(section_id)
            if section:
                max_capacity = section.max_capacity or 5
                utilization = (len(occupancy) / max_capacity * 100) if max_capacity > 0 else 0.0
                section_util[section_id] = round(utilization, 1)
        
        metrics = SimulationMetrics(
            total_trains=total_trains,
            active_trains=active_trains,
            delayed_trains=delayed_trains,
            on_time_trains=on_time_trains,
            total_delay_minutes=round(total_delay, 2),
            average_delay_per_train=round(avg_delay, 2),
            on_time_percentage=round(on_time_pct, 1),
            section_utilization=section_util,
            throughput_trains_per_hour=self._calculate_throughput(),
            timestamp=self.current_time
        )
        
        self.metrics_history.append(metrics)
        self.current_metrics = metrics
    
    def _count_active_trains(self) -> int:
        """Count trains that are currently running"""
        return sum(1 for t in self.trains.values() if t.status == TrainStatus.RUNNING)
    
    def _calculate_throughput(self) -> float:
        """Calculate trains per hour throughput"""
        if not self.start_time or not self.current_time:
            return 0.0
        
        elapsed_hours = (self.current_time - self.start_time).total_seconds() / 3600
        if elapsed_hours <= 0:
            return 0.0
        
        active_trains = self._count_active_trains()
        return round(active_trains / elapsed_hours, 2)
    
    def _calculate_progress(self) -> float:
        """Calculate simulation progress percentage"""
        if not self.start_time or not self.end_time or not self.current_time:
            return 0.0
        
        total_duration = (self.end_time - self.start_time).total_seconds()
        elapsed_duration = (self.current_time - self.start_time).total_seconds()
        
        return min(100.0, max(0.0, (elapsed_duration / total_duration) * 100))
    
    async def _calculate_final_metrics(self) -> SimulationMetrics:
        """Calculate final simulation metrics"""
        if hasattr(self, 'current_metrics'):
            return self.current_metrics
        
        # Fallback calculation
        await self._update_metrics()
        return self.current_metrics
    
    def get_train_positions(self) -> Dict[str, Any]:
        """Get current train positions for API"""
        positions = {}
        
        for train_id, train_state in self.trains.items():
            positions[str(train_id)] = {
                "section_id": train_state.current_section_id,
                "position_in_section": round(train_state.position_in_section, 3),
                "speed_kmh": round(train_state.speed_kmh, 1),
                "delay_minutes": round(train_state.delay_minutes, 2),
                "status": train_state.status.value,
                "last_update": train_state.last_update.isoformat()
            }
        
        return {
            "timestamp": self.current_time.isoformat(),
            "positions": positions,
            "total_trains": len(positions),
            "active_trains": self._count_active_trains()
        }
    
    async def pause(self):
        """Pause simulation"""
        self._pause_flag = True
        self.status = SimulationStatus.PAUSED
        logger.info("Enhanced simulation paused")
    
    async def resume(self):
        """Resume simulation"""
        self._pause_flag = False
        self.status = SimulationStatus.RUNNING
        logger.info("Enhanced simulation resumed")
    
    async def stop(self):
        """Stop simulation"""
        self._stop_flag = True
        self.status = SimulationStatus.CANCELLED
        logger.info("Enhanced simulation stopped")


# Global instance
enhanced_simulation_engine = None