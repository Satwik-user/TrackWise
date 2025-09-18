"""
Train movement simulation for TrackWise Railway Optimization System
"""

import asyncio
import logging
import math
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

from .base import BaseSimulator, SimulationEvent, SimulationConfig, SimulationResult, SimulationStatus, SimulationType

logger = logging.getLogger(__name__)


@dataclass
class TrainPhysics:
    """Physical properties for train simulation"""
    mass_tons: float = 500.0
    max_acceleration: float = 1.0  # m/s²
    max_deceleration: float = 2.0  # m/s²
    rolling_resistance: float = 0.002
    air_resistance_coefficient: float = 0.4
    traction_coefficient: float = 0.25
    brake_efficiency: float = 0.9


@dataclass
class TrainState:
    """Current state of a train in simulation"""
    train_id: int
    position_km: float
    velocity_kmh: float
    acceleration: float
    section_id: int
    distance_in_section: float
    status: str
    target_speed: float
    delay_minutes: float
    fuel_consumed: float
    energy_consumed: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "train_id": self.train_id,
            "position_km": self.position_km,
            "velocity_kmh": self.velocity_kmh,
            "acceleration": self.acceleration,
            "section_id": self.section_id,
            "distance_in_section": self.distance_in_section,
            "status": self.status,
            "target_speed": self.target_speed,
            "delay_minutes": self.delay_minutes,
            "fuel_consumed": self.fuel_consumed,
            "energy_consumed": self.energy_consumed
        }


class TrainMovementSimulator(BaseSimulator):
    """Physics-based train movement simulator"""
    
    def __init__(self):
        super().__init__(SimulationType.TRAIN_MOVEMENT)
        self.train_states: Dict[int, TrainState] = {}
        self.train_physics: Dict[int, TrainPhysics] = {}
        self.section_network: Dict[int, Dict[str, Any]] = {}
        self.time_step = 1.0  # seconds
    
    async def initialize(self, config: SimulationConfig, initial_data: Dict[str, Any]) -> bool:
        """Initialize the train movement simulator"""
        try:
            self.current_state = self._create_initial_state(initial_data)
            
            # Initialize train states and physics
            await self._initialize_trains(initial_data.get("trains", []))
            
            # Build section network
            await self._build_section_network(initial_data.get("sections", []))
            
            logger.info(f"Train movement simulator initialized with {len(self.train_states)} trains")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize train movement simulator: {e}")
            return False
    
    async def step(self) -> bool:
        """Execute one physics simulation step"""
        try:
            dt = self.time_step  # Time step in seconds
            
            # Update each train's position and velocity
            for train_id, train_state in self.train_states.items():
                await self._update_train_physics(train_state, dt)
                await self._check_train_events(train_state)
            
            # Update simulation time
            self.current_state.simulation_time += timedelta(seconds=dt)
            self.current_state.real_time = datetime.utcnow()
            
            # Update state with train positions
            for train_id, train_state in self.train_states.items():
                if train_id in self.current_state.trains:
                    self.current_state.trains[train_id].update({
                        "current_speed": train_state.velocity_kmh,
                        "position_km": train_state.position_km,
                        "current_section": train_state.section_id,
                        "delay_minutes": train_state.delay_minutes,
                        "status": train_state.status
                    })
            
            # Update metrics
            self._update_metrics()
            
            return True
            
        except Exception as e:
            logger.error(f"Error in train movement simulation step: {e}")
            return False
    
    async def finalize(self) -> SimulationResult:
        """Finalize the simulation"""
        end_time = datetime.utcnow()
        
        # Calculate final metrics
        final_metrics = self._calculate_final_metrics()
        
        return SimulationResult(
            simulation_id=self.simulation_id,
            status=SimulationStatus.COMPLETED if not self.is_cancelled else SimulationStatus.CANCELLED,
            start_time=self.start_time,
            end_time=end_time,
            final_state=self.current_state,
            metrics=final_metrics,
            events_processed=len(self.current_state.events) if self.current_state else 0
        )
    
    async def _initialize_trains(self, trains: List[Dict[str, Any]]):
        """Initialize train states and physics"""
        
        for train in trains:
            train_id = train["id"]
            
            # Initialize train state
            initial_section = train.get("current_section", 1)
            initial_position = train.get("position_km", 0.0)
            initial_speed = train.get("current_speed", 0.0)
            
            train_state = TrainState(
                train_id=train_id,
                position_km=initial_position,
                velocity_kmh=initial_speed,
                acceleration=0.0,
                section_id=initial_section,
                distance_in_section=0.0,
                status=train.get("status", "STOPPED"),
                target_speed=train.get("max_speed_kmh", 100.0),
                delay_minutes=train.get("delay_minutes", 0.0),
                fuel_consumed=0.0,
                energy_consumed=0.0
            )
            
            self.train_states[train_id] = train_state
            
            # Initialize train physics
            train_physics = TrainPhysics(
                mass_tons=train.get("mass_tons", 500.0),
                max_acceleration=train.get("max_acceleration", 1.0),
                max_deceleration=train.get("max_deceleration", 2.0)
            )
            
            self.train_physics[train_id] = train_physics
    
    async def _build_section_network(self, sections: List[Dict[str, Any]]):
        """Build network of sections for navigation"""
        
        for section in sections:
            section_id = section["id"]
            self.section_network[section_id] = {
                "length_km": section.get("length_km", 10.0),
                "max_speed_kmh": section.get("max_speed_kmh", 80.0),
                "gradient": section.get("gradient", 0.0),  # % grade
                "curve_radius": section.get("curve_radius", float('inf')),  # meters
                "signal_speed_limit": section.get("signal_speed_limit", 80.0),
                "status": section.get("status", "AVAILABLE"),
                "connections": section.get("connections", [])
            }
    
    async def _update_train_physics(self, train_state: TrainState, dt: float):
        """Update train physics for one time step"""
        
        train_physics = self.train_physics.get(train_state.train_id)
        if not train_physics:
            return
        
        section_info = self.section_network.get(train_state.section_id, {})
        
        # Determine target speed based on section limits and train capability
        section_speed_limit = section_info.get("max_speed_kmh", 80.0)
        signal_speed_limit = section_info.get("signal_speed_limit", 80.0)
        train_max_speed = train_state.target_speed
        
        effective_speed_limit = min(section_speed_limit, signal_speed_limit, train_max_speed)
        
        # Calculate forces
        forces = self._calculate_forces(train_state, train_physics, section_info)
        
        # Calculate acceleration
        net_force = sum(forces.values())
        acceleration = net_force / (train_physics.mass_tons * 1000)  # Convert to m/s²
        
        # Apply acceleration limits
        if acceleration > train_physics.max_acceleration:
            acceleration = train_physics.max_acceleration
        elif acceleration < -train_physics.max_deceleration:
            acceleration = -train_physics.max_deceleration
        
        # Update velocity (convert between km/h and m/s)
        velocity_ms = train_state.velocity_kmh / 3.6
        velocity_ms += acceleration * dt
        
        # Apply speed limits
        max_velocity_ms = effective_speed_limit / 3.6
        velocity_ms = max(0, min(velocity_ms, max_velocity_ms))
        
        train_state.velocity_kmh = velocity_ms * 3.6
        train_state.acceleration = acceleration
        
        # Update position
        distance_traveled = velocity_ms * dt / 1000  # Convert to km
        train_state.position_km += distance_traveled
        train_state.distance_in_section += distance_traveled
        
        # Calculate energy consumption
        power_required = self._calculate_power_consumption(train_state, train_physics, forces)
        energy_consumed = power_required * dt / 3600  # kWh
        train_state.energy_consumed += energy_consumed
        
        # Calculate fuel consumption (for diesel trains)
        fuel_consumed = energy_consumed * 0.3  # Simplified conversion
        train_state.fuel_consumed += fuel_consumed
    
    def _calculate_forces(
        self,
        train_state: TrainState,
        train_physics: TrainPhysics,
        section_info: Dict[str, Any]
    ) -> Dict[str, float]:
        """Calculate forces acting on the train"""
        
        velocity_ms = train_state.velocity_kmh / 3.6
        mass_kg = train_physics.mass_tons * 1000
        
        forces = {}
        
        # Traction force (driving force)
        if train_state.status == "RUNNING":
            # Simplified traction force calculation
            max_traction = train_physics.traction_coefficient * mass_kg * 9.81
            # Reduce traction at higher speeds
            speed_factor = max(0.1, 1.0 - velocity_ms / 50.0)
            forces["traction"] = max_traction * speed_factor
        else:
            forces["traction"] = 0.0
        
        # Rolling resistance
        forces["rolling_resistance"] = -(train_physics.rolling_resistance * mass_kg * 9.81)
        
        # Air resistance
        forces["air_resistance"] = -(train_physics.air_resistance_coefficient * velocity_ms ** 2)
        
        # Gradient resistance
        gradient = section_info.get("gradient", 0.0) / 100.0  # Convert % to decimal
        forces["gradient_resistance"] = -(mass_kg * 9.81 * gradient)
        
        # Curve resistance (simplified)
        curve_radius = section_info.get("curve_radius", float('inf'))
        if curve_radius < float('inf'):
            curve_resistance = -(500 / curve_radius) * mass_kg * 9.81 / 1000
            forces["curve_resistance"] = curve_resistance
        else:
            forces["curve_resistance"] = 0.0
        
        # Braking force (if needed)
        target_speed = min(
            section_info.get("max_speed_kmh", 80.0),
            section_info.get("signal_speed_limit", 80.0),
            train_state.target_speed
        )
        
        if train_state.velocity_kmh > target_speed:
            max_brake_force = train_physics.max_deceleration * mass_kg
            forces["braking"] = -max_brake_force * train_physics.brake_efficiency
        else:
            forces["braking"] = 0.0
        
        return forces
    
    def _calculate_power_consumption(
        self,
        train_state: TrainState,
        train_physics: TrainPhysics,
        forces: Dict[str, float]
    ) -> float:
        """Calculate power consumption in kW"""
        
        velocity_ms = train_state.velocity_kmh / 3.6
        
        # Power = Force × Velocity
        traction_power = max(0, forces.get("traction", 0) * velocity_ms) / 1000  # kW
        
        # Add auxiliary power consumption
        auxiliary_power = 50  # kW for lights, HVAC, etc.
        
        total_power = traction_power + auxiliary_power
        
        return total_power
    
    async def _check_train_events(self, train_state: TrainState):
        """Check for train events (section changes, arrivals, etc.)"""
        
        section_info = self.section_network.get(train_state.section_id, {})
        section_length = section_info.get("length_km", 10.0)
        
        # Check if train has completed current section
        if train_state.distance_in_section >= section_length:
            await self._handle_section_completion(train_state)
        
        # Check for delays due to section status
        if section_info.get("status") == "MAINTENANCE":
            train_state.status = "STOPPED"
            train_state.delay_minutes += self.time_step / 60.0  # Add delay
        
        # Check for speed limit violations
        section_speed_limit = section_info.get("max_speed_kmh", 80.0)
        if train_state.velocity_kmh > section_speed_limit * 1.1:  # 10% tolerance
            # Generate speed violation event
            event = SimulationEvent(
                event_id=f"speed_violation_{train_state.train_id}",
                event_type="speed_violation",
                timestamp=self.current_state.simulation_time,
                entity_id=train_state.train_id,
                data={
                    "train_id": train_state.train_id,
                    "actual_speed": train_state.velocity_kmh,
                    "speed_limit": section_speed_limit,
                    "section_id": train_state.section_id
                }
            )
            self.current_state.events.append(event)
            await self.emit_event(event)
    
    async def _handle_section_completion(self, train_state: TrainState):
        """Handle train completing a section"""
        
        # Generate section completion event
        event = SimulationEvent(
            event_id=f"section_complete_{train_state.train_id}_{train_state.section_id}",
            event_type="section_completion",
            timestamp=self.current_state.simulation_time,
            entity_id=train_state.train_id,
            data={
                "train_id": train_state.train_id,
                "completed_section": train_state.section_id,
                "time_in_section": train_state.distance_in_section / max(train_state.velocity_kmh, 1) * 60  # minutes
            }
        )
        self.current_state.events.append(event)
        await self.emit_event(event)
        
        # Move to next section (simplified)
        current_section_info = self.section_network.get(train_state.section_id, {})
        connections = current_section_info.get("connections", [])
        
        if connections:
            # Move to first connected section
            next_section_id = connections[0]
            train_state.section_id = next_section_id
            train_state.distance_in_section = 0.0
            
            # Generate section entry event
            entry_event = SimulationEvent(
                event_id=f"section_entry_{train_state.train_id}_{next_section_id}",
                event_type="section_entry",
                timestamp=self.current_state.simulation_time,
                entity_id=train_state.train_id,
                data={
                    "train_id": train_state.train_id,
                    "entered_section": next_section_id
                }
            )
            self.current_state.events.append(entry_event)
            await self.emit_event(entry_event)
        else:
            # No more sections - train has reached destination
            train_state.status = "COMPLETED"
            
            completion_event = SimulationEvent(
                event_id=f"journey_complete_{train_state.train_id}",
                event_type="journey_completion",
                timestamp=self.current_state.simulation_time,
                entity_id=train_state.train_id,
                data={
                    "train_id": train_state.train_id,
                    "total_distance": train_state.position_km,
                    "total_energy": train_state.energy_consumed,
                    "total_delay": train_state.delay_minutes
                }
            )
            self.current_state.events.append(completion_event)
            await self.emit_event(completion_event)
    
    def _calculate_final_metrics(self) -> Dict[str, Any]:
        """Calculate final simulation metrics"""
        
        if not self.train_states:
            return {}
        
        # Aggregate train metrics
        total_distance = sum(state.position_km for state in self.train_states.values())
        total_energy = sum(state.energy_consumed for state in self.train_states.values())
        total_fuel = sum(state.fuel_consumed for state in self.train_states.values())
        total_delay = sum(state.delay_minutes for state in self.train_states.values())
        
        completed_trains = sum(1 for state in self.train_states.values() if state.status == "COMPLETED")
        average_speed = np.mean([state.velocity_kmh for state in self.train_states.values()])
        
        # Calculate efficiency metrics
        efficiency_metrics = {
            "energy_per_km": total_energy / max(total_distance, 1),
            "fuel_per_km": total_fuel / max(total_distance, 1),
            "average_delay": total_delay / len(self.train_states),
            "completion_rate": completed_trains / len(self.train_states),
            "average_speed": average_speed
        }
        
        return {
            "total_trains": len(self.train_states),
            "completed_trains": completed_trains,
            "total_distance_km": total_distance,
            "total_energy_kwh": total_energy,
            "total_fuel_consumed": total_fuel,
            "total_delay_minutes": total_delay,
            "efficiency_metrics": efficiency_metrics,
            "train_states": {
                train_id: state.to_dict()
                for train_id, state in self.train_states.items()
            }
        }


class TrainSimulator(BaseSimulator):
    """High-level train simulator with multiple simulation modes"""
    
    def __init__(self, simulation_mode: str = "physics"):
        super().__init__(SimulationType.TRAIN_MOVEMENT)
        self.simulation_mode = simulation_mode  # "physics", "discrete", "hybrid"
        self.movement_simulator = TrainMovementSimulator()
    
    async def initialize(self, config: SimulationConfig, initial_data: Dict[str, Any]) -> bool:
        """Initialize the train simulator"""
        
        # Initialize based on simulation mode
        if self.simulation_mode == "physics":
            return await self.movement_simulator.initialize(config, initial_data)
        else:
            # Simple discrete mode
            self.current_state = self._create_initial_state(initial_data)
            return True
    
    async def step(self) -> bool:
        """Execute simulation step based on mode"""
        
        if self.simulation_mode == "physics":
            return await self.movement_simulator.step()
        else:
            # Simple discrete step
            return await self._discrete_step()
    
    async def finalize(self) -> SimulationResult:
        """Finalize simulation"""
        
        if self.simulation_mode == "physics":
            return await self.movement_simulator.finalize()
        else:
            return await self._finalize_discrete()
    
    async def _discrete_step(self) -> bool:
        """Simple discrete simulation step"""
        try:
            # Update simulation time
            self.current_state.simulation_time += timedelta(minutes=1)
            
            # Simple train updates
            for train_id, train in self.current_state.trains.items():
                if train.get("status") == "RUNNING":
                    # Simple position update
                    current_speed = train.get("current_speed", 60)
                    distance_increment = current_speed / 60  # km per minute
                    
                    current_position = train.get("position_km", 0)
                    train["position_km"] = current_position + distance_increment
                    
                    # Simple delay accumulation
                    if np.random.random() < 0.01:  # 1% chance of delay per minute
                        additional_delay = np.random.uniform(1, 5)
                        train["delay_minutes"] = train.get("delay_minutes", 0) + additional_delay
            
            self._update_metrics()
            return True
            
        except Exception as e:
            logger.error(f"Error in discrete simulation step: {e}")
            return False
    
    async def _finalize_discrete(self) -> SimulationResult:
        """Finalize discrete simulation"""
        
        return SimulationResult(
            simulation_id=self.simulation_id,
            status=SimulationStatus.COMPLETED,
            start_time=self.start_time,
            end_time=datetime.utcnow(),
            final_state=self.current_state,
            metrics=self.current_state.metrics if self.current_state else {}
        )


# Export classes
__all__ = [
    "TrainSimulator",
    "TrainMovementSimulator",
    "TrainPhysics",
    "TrainState"
]