"""
Real-time simulation for TrackWise Railway Optimization System
"""

import asyncio
import logging
import time
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable, Set
from dataclasses import dataclass
from collections import defaultdict
import threading
import json

from .base import BaseSimulator, SimulationEvent, SimulationConfig, SimulationResult, SimulationStatus, SimulationType
from .train_simulator import TrainMovementSimulator
from .event_simulator import EventSimulator

logger = logging.getLogger(__name__)


@dataclass
class RealTimeMetrics:
    """Real-time performance metrics"""
    update_frequency: float  # Updates per second
    latency_ms: float
    throughput: float  # Events processed per second
    memory_usage_mb: float
    cpu_usage_percent: float
    active_connections: int
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "update_frequency": self.update_frequency,
            "latency_ms": self.latency_ms,
            "throughput": self.throughput,
            "memory_usage_mb": self.memory_usage_mb,
            "cpu_usage_percent": self.cpu_usage_percent,
            "active_connections": self.active_connections
        }


@dataclass
class LiveUpdate:
    """Real-time update message"""
    update_id: str
    update_type: str
    timestamp: datetime
    entity_id: Optional[int]
    data: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "update_id": self.update_id,
            "update_type": self.update_type,
            "timestamp": self.timestamp.isoformat(),
            "entity_id": self.entity_id,
            "data": self.data
        }


class RealTimeDataSource:
    """Simulates real-time data feeds"""
    
    def __init__(self):
        self.is_active = False
        self.update_interval = 1.0  # seconds
        self.subscribers: Set[Callable] = set()
        self.data_generators = {}
        self._setup_data_generators()
    
    def _setup_data_generators(self):
        """Setup data generators for different types"""
        
        self.data_generators = {
            "gps_position": self._generate_gps_data,
            "speed_sensor": self._generate_speed_data,
            "signal_status": self._generate_signal_data,
            "passenger_count": self._generate_passenger_data,
            "weather_conditions": self._generate_weather_data,
            "track_sensors": self._generate_track_sensor_data
        }
    
    def subscribe(self, callback: Callable):
        """Subscribe to real-time updates"""
        self.subscribers.add(callback)
    
    def unsubscribe(self, callback: Callable):
        """Unsubscribe from real-time updates"""
        self.subscribers.discard(callback)
    
    async def start(self):
        """Start real-time data generation"""
        self.is_active = True
        
        while self.is_active:
            # Generate updates for all data types
            for data_type, generator in self.data_generators.items():
                try:
                    updates = await generator()
                    for update in updates:
                        await self._broadcast_update(update)
                except Exception as e:
                    logger.error(f"Error generating {data_type} data: {e}")
            
            await asyncio.sleep(self.update_interval)
    
    def stop(self):
        """Stop real-time data generation"""
        self.is_active = False
    
    async def _broadcast_update(self, update: LiveUpdate):
        """Broadcast update to all subscribers"""
        for callback in self.subscribers.copy():  # Copy to avoid modification during iteration
            try:
                await callback(update)
            except Exception as e:
                logger.warning(f"Error in subscriber callback: {e}")
    
    async def _generate_gps_data(self) -> List[LiveUpdate]:
        """Generate GPS position updates"""
        updates = []
        
        # Generate updates for 3-5 random trains
        num_trains = np.random.randint(3, 6)
        
        for i in range(num_trains):
            train_id = np.random.randint(1, 11)  # Assume trains 1-10
            
            # Generate realistic GPS coordinates (around a fictional railway line)
            base_lat = 40.7589  # New York area
            base_lon = -73.9851
            
            # Random position along a railway line
            position_offset = np.random.uniform(-0.1, 0.1)
            latitude = base_lat + position_offset
            longitude = base_lon + np.random.uniform(-0.05, 0.05)
            
            update = LiveUpdate(
                update_id=f"gps_{train_id}_{int(time.time())}",
                update_type="gps_position",
                timestamp=datetime.utcnow(),
                entity_id=train_id,
                data={
                    "latitude": latitude,
                    "longitude": longitude,
                    "altitude": np.random.uniform(10, 50),
                    "heading": np.random.uniform(0, 360),
                    "accuracy_meters": np.random.uniform(1, 5)
                }
            )
            updates.append(update)
        
        return updates
    
    async def _generate_speed_data(self) -> List[LiveUpdate]:
        """Generate speed sensor updates"""
        updates = []
        
        # Generate speed updates for 2-4 trains
        num_trains = np.random.randint(2, 5)
        
        for i in range(num_trains):
            train_id = np.random.randint(1, 11)
            
            # Generate realistic speed (0-120 km/h)
            speed = max(0, np.random.normal(60, 20))  # Normal distribution around 60 km/h
            
            update = LiveUpdate(
                update_id=f"speed_{train_id}_{int(time.time())}",
                update_type="speed_sensor",
                timestamp=datetime.utcnow(),
                entity_id=train_id,
                data={
                    "speed_kmh": speed,
                    "acceleration": np.random.uniform(-2, 2),
                    "engine_load": np.random.uniform(0.3, 0.9),
                    "fuel_consumption_rate": speed * 0.1 + np.random.uniform(0, 5)
                }
            )
            updates.append(update)
        
        return updates
    
    async def _generate_signal_data(self) -> List[LiveUpdate]:
        """Generate signal status updates"""
        updates = []
        
        # Occasional signal changes
        if np.random.random() < 0.3:  # 30% chance
            section_id = np.random.randint(1, 6)
            signal_states = ["GREEN", "YELLOW", "RED"]
            new_state = np.random.choice(signal_states)
            
            update = LiveUpdate(
                update_id=f"signal_{section_id}_{int(time.time())}",
                update_type="signal_status",
                timestamp=datetime.utcnow(),
                entity_id=section_id,
                data={
                    "signal_state": new_state,
                    "aspect": new_state.lower(),
                    "next_change_estimate": (datetime.utcnow() + timedelta(minutes=np.random.uniform(5, 30))).isoformat()
                }
            )
            updates.append(update)
        
        return updates
    
    async def _generate_passenger_data(self) -> List[LiveUpdate]:
        """Generate passenger count updates"""
        updates = []
        
        # Generate passenger updates less frequently
        if np.random.random() < 0.2:  # 20% chance
            train_id = np.random.randint(1, 11)
            
            # Passenger count varies by time of day
            current_hour = datetime.utcnow().hour
            if 7 <= current_hour <= 9 or 17 <= current_hour <= 19:
                # Rush hour - higher passenger count
                base_passengers = 150
                variation = 50
            else:
                # Off-peak
                base_passengers = 80
                variation = 30
            
            passenger_count = max(0, int(np.random.normal(base_passengers, variation)))
            
            update = LiveUpdate(
                update_id=f"passengers_{train_id}_{int(time.time())}",
                update_type="passenger_count",
                timestamp=datetime.utcnow(),
                entity_id=train_id,
                data={
                    "current_passengers": passenger_count,
                    "boarding_rate": np.random.uniform(0.1, 0.8),
                    "capacity_utilization": passenger_count / 200,  # Assume 200 capacity
                    "next_stop_eta": np.random.uniform(3, 15)
                }
            )
            updates.append(update)
        
        return updates
    
    async def _generate_weather_data(self) -> List[LiveUpdate]:
        """Generate weather condition updates"""
        updates = []
        
        # Weather updates less frequently
        if np.random.random() < 0.1:  # 10% chance
            conditions = ["clear", "cloudy", "rain", "snow", "fog"]
            condition = np.random.choice(conditions)
            
            # Temperature varies by season (simplified)
            base_temp = 15  # Celsius
            temperature = base_temp + np.random.uniform(-10, 15)
            
            update = LiveUpdate(
                update_id=f"weather_{int(time.time())}",
                update_type="weather_conditions",
                timestamp=datetime.utcnow(),
                entity_id=None,  # Weather affects entire system
                data={
                    "condition": condition,
                    "temperature_c": temperature,
                    "humidity_percent": np.random.uniform(30, 90),
                    "wind_speed_kmh": np.random.uniform(0, 25),
                    "visibility_km": np.random.uniform(1, 50),
                    "precipitation_mm": np.random.uniform(0, 5) if condition in ["rain", "snow"] else 0
                }
            )
            updates.append(update)
        
        return updates
    
    async def _generate_track_sensor_data(self) -> List[LiveUpdate]:
        """Generate track sensor updates"""
        updates = []
        
        # Track sensor updates occasionally
        if np.random.random() < 0.15:  # 15% chance
            section_id = np.random.randint(1, 6)
            
            update = LiveUpdate(
                update_id=f"track_{section_id}_{int(time.time())}",
                update_type="track_sensors",
                timestamp=datetime.utcnow(),
                entity_id=section_id,
                data={
                    "vibration_level": np.random.uniform(0.1, 2.0),
                    "track_temperature": np.random.uniform(-5, 40),
                    "rail_stress": np.random.uniform(0.2, 0.8),
                    "ballast_condition": np.random.choice(["good", "fair", "poor"]),
                    "drainage_status": np.random.choice(["clear", "blocked"])
                }
            )
            updates.append(update)
        
        return updates


class RealTimeSimulator(BaseSimulator):
    """Real-time simulation with live data integration"""
    
    def __init__(self):
        super().__init__(SimulationType.REAL_TIME)
        self.data_source = RealTimeDataSource()
        self.train_simulator = TrainMovementSimulator()
        self.event_simulator = EventSimulator()
        self.live_updates: List[LiveUpdate] = []
        self.performance_metrics = RealTimeMetrics(0, 0, 0, 0, 0, 0)
        self.update_callbacks: Set[Callable] = set()
        self.last_update_time = time.time()
        self.events_processed = 0
        
    async def initialize(self, config: SimulationConfig, initial_data: Dict[str, Any]) -> bool:
        """Initialize the real-time simulator"""
        try:
            # Initialize base state
            self.current_state = self._create_initial_state(initial_data)
            
            # Initialize sub-simulators
            await self.train_simulator.initialize(config, initial_data)
            await self.event_simulator.initialize(config, initial_data)
            
            # Setup real-time data source
            self.data_source.subscribe(self._handle_live_update)
            
            # Start data source
            asyncio.create_task(self.data_source.start())
            
            logger.info("Real-time simulator initialized")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize real-time simulator: {e}")
            return False
    
    async def step(self) -> bool:
        """Execute one real-time simulation step"""
        try:
            step_start_time = time.time()
            
            # Update sub-simulators
            train_step_success = await self.train_simulator.step()
            event_step_success = await self.event_simulator.step()
            
            if not (train_step_success or event_step_success):
                return False
            
            # Merge states from sub-simulators
            await self._merge_simulator_states()
            
            # Process any pending live updates
            await self._process_live_updates()
            
            # Update performance metrics
            self._update_performance_metrics(step_start_time)
            
            # Notify subscribers
            await self._notify_update_callbacks()
            
            # Update simulation time
            self.current_state.simulation_time = datetime.utcnow()
            self.current_state.real_time = datetime.utcnow()
            
            # Update base metrics
            self._update_metrics()
            
            self.events_processed += 1
            return True
            
        except Exception as e:
            logger.error(f"Error in real-time simulation step: {e}")
            return False
    
    async def finalize(self) -> SimulationResult:
        """Finalize the real-time simulation"""
        
        # Stop data source
        self.data_source.stop()
        
        # Finalize sub-simulators
        train_result = await self.train_simulator.finalize()
        event_result = await self.event_simulator.finalize()
        
        # Combine metrics
        combined_metrics = {
            "real_time_metrics": self.performance_metrics.to_dict(),
            "train_metrics": train_result.metrics,
            "event_metrics": event_result.metrics,
            "live_updates_processed": len(self.live_updates),
            "total_events_processed": self.events_processed
        }
        
        end_time = datetime.utcnow()
        
        return SimulationResult(
            simulation_id=self.simulation_id,
            status=SimulationStatus.COMPLETED if not self.is_cancelled else SimulationStatus.CANCELLED,
            start_time=self.start_time,
            end_time=end_time,
            final_state=self.current_state,
            metrics=combined_metrics,
            events_processed=self.events_processed
        )
    
    def subscribe_to_updates(self, callback: Callable):
        """Subscribe to real-time updates"""
        self.update_callbacks.add(callback)
    
    def unsubscribe_from_updates(self, callback: Callable):
        """Unsubscribe from real-time updates"""
        self.update_callbacks.discard(callback)
    
    async def _handle_live_update(self, update: LiveUpdate):
        """Handle incoming live data update"""
        
        # Store update
        self.live_updates.append(update)
        
        # Apply update to current state
        await self._apply_live_update(update)
        
        # Generate simulation event if needed
        if update.update_type in ["signal_status", "weather_conditions"]:
            await self._generate_event_from_update(update)
    
    async def _apply_live_update(self, update: LiveUpdate):
        """Apply live update to simulation state"""
        
        if update.update_type == "gps_position" and update.entity_id:
            # Update train position
            train_id = update.entity_id
            if train_id in self.current_state.trains:
                train = self.current_state.trains[train_id]
                train["latitude"] = update.data.get("latitude")
                train["longitude"] = update.data.get("longitude")
                train["heading"] = update.data.get("heading")
                train["last_position_update"] = update.timestamp.isoformat()
        
        elif update.update_type == "speed_sensor" and update.entity_id:
            # Update train speed
            train_id = update.entity_id
            if train_id in self.current_state.trains:
                train = self.current_state.trains[train_id]
                train["current_speed"] = update.data.get("speed_kmh", 0)
                train["acceleration"] = update.data.get("acceleration", 0)
                train["fuel_consumption_rate"] = update.data.get("fuel_consumption_rate", 0)
        
        elif update.update_type == "signal_status" and update.entity_id:
            # Update section signal
            section_id = update.entity_id
            if section_id in self.current_state.sections:
                section = self.current_state.sections[section_id]
                section["signal_state"] = update.data.get("signal_state")
                section["signal_updated_at"] = update.timestamp.isoformat()
        
        elif update.update_type == "passenger_count" and update.entity_id:
            # Update passenger information
            train_id = update.entity_id
            if train_id in self.current_state.trains:
                train = self.current_state.trains[train_id]
                train["current_passengers"] = update.data.get("current_passengers", 0)
                train["capacity_utilization"] = update.data.get("capacity_utilization", 0)
        
        elif update.update_type == "weather_conditions":
            # Update weather for all sections
            weather_data = update.data
            for section in self.current_state.sections.values():
                section["weather_condition"] = weather_data.get("condition")
                section["temperature"] = weather_data.get("temperature_c")
                section["visibility"] = weather_data.get("visibility_km")
        
        elif update.update_type == "track_sensors" and update.entity_id:
            # Update track conditions
            section_id = update.entity_id
            if section_id in self.current_state.sections:
                section = self.current_state.sections[section_id]
                section["track_condition"] = {
                    "vibration_level": update.data.get("vibration_level"),
                    "track_temperature": update.data.get("track_temperature"),
                    "rail_stress": update.data.get("rail_stress"),
                    "ballast_condition": update.data.get("ballast_condition")
                }
    
    async def _generate_event_from_update(self, update: LiveUpdate):
        """Generate simulation event from live update if needed"""
        
        if update.update_type == "signal_status":
            signal_state = update.data.get("signal_state")
            if signal_state == "RED":
                # Generate stop event
                event = SimulationEvent(
                    event_id=f"signal_stop_{update.entity_id}_{int(time.time())}",
                    event_type="signal_stop",
                    timestamp=update.timestamp,
                    entity_id=update.entity_id,
                    data={"reason": "red_signal", "update_id": update.update_id}
                )
                
                # Add to event simulator
                if hasattr(self.event_simulator, 'event_queue'):
                    from .event_simulator import PrioritizedEvent
                    import heapq
                    heapq.heappush(self.event_simulator.event_queue, PrioritizedEvent(0, event))
        
        elif update.update_type == "weather_conditions":
            condition = update.data.get("condition")
            if condition in ["rain", "snow", "fog"]:
                # Generate weather event
                event = SimulationEvent(
                    event_id=f"weather_impact_{int(time.time())}",
                    event_type="weather_event",
                    timestamp=update.timestamp,
                    entity_id=None,
                    data={
                        "weather_condition": condition,
                        "severity": 0.5 if condition == "rain" else 0.7,
                        "update_id": update.update_id
                    }
                )
                
                # Add to current state events
                self.current_state.events.append(event)
    
    async def _merge_simulator_states(self):
        """Merge states from sub-simulators"""
        
        # Merge train states from train simulator
        if hasattr(self.train_simulator, 'train_states'):
            for train_id, train_state in self.train_simulator.train_states.items():
                if train_id in self.current_state.trains:
                    train = self.current_state.trains[train_id]
                    train.update({
                        "position_km": train_state.position_km,
                        "current_speed": train_state.velocity_kmh,
                        "current_section": train_state.section_id,
                        "delay_minutes": train_state.delay_minutes,
                        "status": train_state.status,
                        "energy_consumed": train_state.energy_consumed
                    })
        
        # Merge events from event simulator
        if hasattr(self.event_simulator, 'current_state') and self.event_simulator.current_state:
            # Add new events
            existing_event_ids = {e.event_id for e in self.current_state.events}
            for event in self.event_simulator.current_state.events:
                if event.event_id not in existing_event_ids:
                    self.current_state.events.append(event)
    
    async def _process_live_updates(self):
        """Process pending live updates"""
        
        # Process recent updates (last 10 seconds)
        cutoff_time = datetime.utcnow() - timedelta(seconds=10)
        recent_updates = [u for u in self.live_updates if u.timestamp > cutoff_time]
        
        # Group updates by type and process
        update_groups = defaultdict(list)
        for update in recent_updates:
            update_groups[update.update_type].append(update)
        
        # Process each group
        for update_type, updates in update_groups.items():
            if update_type == "gps_position":
                await self._process_position_updates(updates)
            elif update_type == "speed_sensor":
                await self._process_speed_updates(updates)
    
    async def _process_position_updates(self, updates: List[LiveUpdate]):
        """Process GPS position updates"""
        
        # Calculate velocities from position changes
        position_history = defaultdict(list)
        
        for update in updates:
            if update.entity_id:
                position_history[update.entity_id].append(update)
        
        for train_id, positions in position_history.items():
            if len(positions) >= 2:
                # Sort by timestamp
                positions.sort(key=lambda u: u.timestamp)
                
                # Calculate velocity
                latest = positions[-1]
                previous = positions[-2]
                
                time_diff = (latest.timestamp - previous.timestamp).total_seconds()
                if time_diff > 0:
                    # Simple distance calculation (not accurate for real GPS)
                    lat_diff = latest.data["latitude"] - previous.data["latitude"]
                    lon_diff = latest.data["longitude"] - previous.data["longitude"]
                    distance_deg = np.sqrt(lat_diff**2 + lon_diff**2)
                    
                    # Convert to km (very rough approximation)
                    distance_km = distance_deg * 111  # ~111 km per degree
                    
                    velocity_kmh = (distance_km / time_diff) * 3600
                    
                    # Update train velocity if reasonable
                    if 0 <= velocity_kmh <= 200:  # Reasonable range
                        if train_id in self.current_state.trains:
                            self.current_state.trains[train_id]["calculated_speed"] = velocity_kmh
    
    async def _process_speed_updates(self, updates: List[LiveUpdate]):
        """Process speed sensor updates"""
        
        # Detect rapid speed changes that might indicate issues
        speed_changes = defaultdict(list)
        
        for update in updates:
            if update.entity_id:
                speed_changes[update.entity_id].append(update.data.get("speed_kmh", 0))
        
        for train_id, speeds in speed_changes.items():
            if len(speeds) >= 2:
                speed_variance = np.var(speeds)
                if speed_variance > 100:  # High variance might indicate issues
                    # Generate alert event
                    event = SimulationEvent(
                        event_id=f"speed_anomaly_{train_id}_{int(time.time())}",
                        event_type="speed_anomaly",
                        timestamp=datetime.utcnow(),
                        entity_id=train_id,
                        data={
                            "variance": speed_variance,
                            "speeds": speeds,
                            "alert_type": "speed_instability"
                        }
                    )
                    self.current_state.events.append(event)
    
    def _update_performance_metrics(self, step_start_time: float):
        """Update real-time performance metrics"""
        
        current_time = time.time()
        step_duration = current_time - step_start_time
        
        # Calculate latency
        latency_ms = step_duration * 1000
        
        # Calculate update frequency
        time_since_last = current_time - self.last_update_time
        frequency = 1.0 / max(time_since_last, 0.001)
        
        # Calculate throughput
        throughput = self.events_processed / max(current_time - self.start_time.timestamp(), 1)
        
        # Mock resource usage (in real implementation, would use psutil)
        memory_usage = 50 + np.random.uniform(-10, 10)  # MB
        cpu_usage = 30 + np.random.uniform(-15, 20)  # %
        
        self.performance_metrics = RealTimeMetrics(
            update_frequency=frequency,
            latency_ms=latency_ms,
            throughput=throughput,
            memory_usage_mb=memory_usage,
            cpu_usage_percent=max(0, min(100, cpu_usage)),
            active_connections=len(self.update_callbacks)
        )
        
        self.last_update_time = current_time
    
    async def _notify_update_callbacks(self):
        """Notify all registered update callbacks"""
        
        if not self.update_callbacks:
            return
        
        # Create update payload
        update_payload = {
            "timestamp": datetime.utcnow().isoformat(),
            "simulation_time": self.current_state.simulation_time.isoformat(),
            "trains": list(self.current_state.trains.values()),
            "sections": list(self.current_state.sections.values()),
            "recent_events": [e.to_dict() if hasattr(e, 'to_dict') else e.__dict__ for e in self.current_state.events[-10:]],
            "metrics": self.current_state.metrics,
            "performance": self.performance_metrics.to_dict()
        }
        
        # Notify all callbacks
        for callback in self.update_callbacks.copy():
            try:
                await callback(update_payload)
            except Exception as e:
                logger.warning(f"Error in update callback: {e}")
    
    def get_real_time_status(self) -> Dict[str, Any]:
        """Get current real-time simulation status"""
        
        return {
            "simulation_id": self.simulation_id,
            "status": self.get_status(),
            "simulation_time": self.current_state.simulation_time.isoformat() if self.current_state else None,
            "real_time": datetime.utcnow().isoformat(),
            "performance_metrics": self.performance_metrics.to_dict(),
            "active_trains": len([t for t in self.current_state.trains.values() if t.get("status") == "RUNNING"]) if self.current_state else 0,
            "total_events": len(self.current_state.events) if self.current_state else 0,
            "live_updates_count": len(self.live_updates),
            "subscribers": len(self.update_callbacks)
        }


# Export classes
__all__ = [
    "RealTimeSimulator",
    "RealTimeDataSource",
    "RealTimeMetrics",
    "LiveUpdate"
]