from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import math

@dataclass
class SimulatedTrain:
    """Simulated train entity with enhanced physics and realistic constraints"""
    
    # Basic identification
    id: int
    train_number: str
    train_name: str
    train_type: str = "SUBURBAN"
    priority: int = 3
    
    # Physical characteristics
    length: float = 200.0        # meters
    max_speed: float = 120.0     # km/h
    acceleration: float = 0.5    # m/s²
    deceleration: float = 0.8    # m/s²
    weight: float = 400.0        # tons
    power: float = 2000.0        # kW
    
    # Advanced physics parameters
    rolling_resistance: float = 0.003  # coefficient
    air_resistance: float = 0.0025     # coefficient  
    adhesion_coefficient: float = 0.3  # wheel-rail adhesion
    brake_efficiency: float = 0.85     # braking system efficiency
    traction_efficiency: float = 0.9   # traction motor efficiency
    
    # Current state
    current_section_id: Optional[int] = None
    current_position: float = 0.0     # meters within section
    current_speed: float = 0.0        # km/h
    current_acceleration: float = 0.0  # m/s²
    target_speed: float = 0.0         # km/h
    status: str = "SCHEDULED"         # SCHEDULED, RUNNING, DELAYED, STOPPED, COMPLETED, BRAKING
    
    # Enhanced operational state
    doors_open: bool = False
    passenger_load: float = 0.5       # 0.0 to 1.0
    cargo_load: float = 0.0           # tons
    energy_state: float = 100.0       # percentage of max energy
    brake_temperature: float = 20.0   # Celsius
    
    # Schedule
    scheduled_departure: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    scheduled_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    
    # Route information
    route: List[int] = field(default_factory=list)  # List of section IDs
    current_route_index: int = 0
    
    # Performance tracking
    departure_delay: float = 0.0      # minutes
    arrival_delay: float = 0.0        # minutes
    total_delay: float = 0.0          # minutes
    energy_consumed: float = 0.0      # kWh
    distance_traveled: float = 0.0    # meters
    
    # Operational parameters
    min_dwell_time: int = 120         # seconds
    crew_change_required: bool = False
    maintenance_due: bool = False
    automatic_train_control: bool = True
    emergency_brake_active: bool = False
    
    def __post_init__(self):
        """Initialize derived attributes"""
        if isinstance(self.scheduled_departure, str):
            self.scheduled_departure = datetime.fromisoformat(self.scheduled_departure)
        if isinstance(self.scheduled_arrival, str):
            self.scheduled_arrival = datetime.fromisoformat(self.scheduled_arrival)
        if isinstance(self.actual_departure, str):
            self.actual_departure = datetime.fromisoformat(self.actual_departure)
        if isinstance(self.actual_arrival, str):
            self.actual_arrival = datetime.fromisoformat(self.actual_arrival)
    
    def calculate_traction_force(self, gradient: float = 0.0) -> float:
        """Calculate maximum traction force based on physics"""
        # Convert speed to m/s
        speed_ms = self.current_speed * 1000 / 3600
        
        # Power-limited traction force
        if speed_ms > 0:
            power_limited_force = (self.power * 1000 * self.traction_efficiency) / speed_ms
        else:
            power_limited_force = float('inf')
        
        # Adhesion-limited traction force
        total_weight = (self.weight + self.cargo_load) * 1000 * 9.81  # N
        adhesion_limited_force = self.adhesion_coefficient * total_weight
        
        # Take minimum of power and adhesion limits
        max_traction_force = min(power_limited_force, adhesion_limited_force)
        
        # Account for gradient resistance
        gradient_resistance = total_weight * math.sin(math.radians(gradient))
        
        return max(0, max_traction_force - gradient_resistance)
    
    def calculate_resistance_forces(self, gradient: float = 0.0) -> float:
        """Calculate total resistance forces"""
        # Convert speed to m/s
        speed_ms = self.current_speed * 1000 / 3600
        total_weight = (self.weight + self.cargo_load) * 1000  # kg
        
        # Rolling resistance
        rolling_force = self.rolling_resistance * total_weight * 9.81
        
        # Air resistance (quadratic with speed)
        air_force = 0.5 * 1.225 * self.air_resistance * (speed_ms ** 2) * 10  # Simplified frontal area
        
        # Gradient resistance
        gradient_force = total_weight * 9.81 * math.sin(math.radians(gradient))
        
        return rolling_force + air_force + gradient_force
    
    def calculate_realistic_acceleration(self, target_speed: float, gradient: float = 0.0, 
                                       speed_limit: float = None) -> float:
        """Calculate realistic acceleration based on physics"""
        if speed_limit:
            target_speed = min(target_speed, speed_limit)
        
        current_speed_ms = self.current_speed * 1000 / 3600
        target_speed_ms = target_speed * 1000 / 3600
        
        # If we're at or above target speed, coast or brake
        if current_speed_ms >= target_speed_ms:
            if current_speed_ms > target_speed_ms:
                return -self.calculate_braking_deceleration()
            return 0.0
        
        # Calculate available traction force
        traction_force = self.calculate_traction_force(gradient)
        resistance_force = self.calculate_resistance_forces(gradient)
        
        # Net force available for acceleration
        net_force = traction_force - resistance_force
        total_mass = (self.weight + self.cargo_load) * 1000  # kg
        
        # Calculate acceleration (F = ma)
        if net_force > 0:
            calculated_acceleration = net_force / total_mass
            # Limit to train's maximum acceleration capability
            return min(calculated_acceleration, self.acceleration)
        else:
            # Not enough traction force - apply slight braking
            return -0.1
    
    def calculate_braking_deceleration(self) -> float:
        """Calculate realistic braking deceleration"""
        # Base deceleration limited by adhesion
        total_weight = (self.weight + self.cargo_load) * 1000 * 9.81  # N
        max_brake_force = self.adhesion_coefficient * total_weight * self.brake_efficiency
        
        # Account for brake temperature (reduced efficiency when hot)
        temperature_factor = max(0.5, 1.0 - (self.brake_temperature - 20) / 200)
        effective_brake_force = max_brake_force * temperature_factor
        
        total_mass = (self.weight + self.cargo_load) * 1000  # kg
        return min(self.deceleration, effective_brake_force / total_mass)
    
    def update_physics_state(self, time_step: float, gradient: float = 0.0, 
                           speed_limit: float = None):
        """Update train state using realistic physics"""
        # Calculate target acceleration
        if self.emergency_brake_active:
            target_acceleration = -self.calculate_braking_deceleration() * 2  # Emergency braking
        elif self.status == "BRAKING":
            target_acceleration = -self.calculate_braking_deceleration()
        else:
            target_acceleration = self.calculate_realistic_acceleration(
                self.target_speed, gradient, speed_limit
            )
        
        # Smooth acceleration changes (can't change instantly)
        max_acceleration_change = 2.0  # m/s² per second
        acceleration_diff = target_acceleration - self.current_acceleration
        
        if abs(acceleration_diff) > max_acceleration_change * time_step:
            if acceleration_diff > 0:
                self.current_acceleration += max_acceleration_change * time_step
            else:
                self.current_acceleration -= max_acceleration_change * time_step
        else:
            self.current_acceleration = target_acceleration
        
        # Update speed
        speed_ms = self.current_speed * 1000 / 3600
        new_speed_ms = max(0, speed_ms + self.current_acceleration * time_step)
        self.current_speed = new_speed_ms * 3600 / 1000  # Convert back to km/h
        
        # Update position
        average_speed_ms = (speed_ms + new_speed_ms) / 2
        distance_delta = average_speed_ms * time_step
        self.current_position += distance_delta
        self.distance_traveled += distance_delta
        
        # Update energy consumption
        if self.current_acceleration > 0:
            # Traction energy
            traction_force = self.calculate_traction_force(gradient)
            energy_delta = (traction_force * distance_delta) / (3.6e6 * self.traction_efficiency)  # kWh
            self.energy_consumed += energy_delta
        elif self.current_acceleration < -0.5:
            # Regenerative braking (recover some energy)
            regen_efficiency = 0.3  # 30% energy recovery
            kinetic_energy_lost = 0.5 * (self.weight + self.cargo_load) * 1000 * (
                (speed_ms ** 2) - (new_speed_ms ** 2)
            ) / 3.6e6  # kWh
            self.energy_consumed -= kinetic_energy_lost * regen_efficiency
        
        # Update brake temperature
        if self.current_acceleration < -0.2:
            # Braking generates heat
            brake_energy = abs(self.current_acceleration) * time_step * 10  # Simplified
            self.brake_temperature += brake_energy
        else:
            # Cooling when not braking
            cooling_rate = 2.0  # degrees per second
            self.brake_temperature = max(20.0, self.brake_temperature - cooling_rate * time_step)
    
    def update_position(self, new_position: float, new_speed: float):
        """Update train position and speed"""
        self.current_position = new_position
        self.current_speed = new_speed
    
    def calculate_current_delay(self) -> float:
        """Calculate current delay in minutes"""
        if self.status == "RUNNING" and self.scheduled_departure:
            if self.actual_departure:
                return max(0, (self.actual_departure - self.scheduled_departure).total_seconds() / 60)
            else:
                # Still waiting to depart
                current_time = datetime.now()
                return max(0, (current_time - self.scheduled_departure).total_seconds() / 60)
        return self.total_delay
    
    def get_estimated_arrival(self, section_length: float, section_max_speed: float) -> datetime:
        """Estimate arrival time at next section"""
        effective_speed = min(self.max_speed, section_max_speed)
        travel_time_hours = section_length / (effective_speed * 1000)  # Convert km to m
        
        current_time = datetime.now()
        return current_time + timedelta(hours=travel_time_hours)
    
    def can_enter_section(self, section_capacity: int, current_occupancy: int) -> bool:
        """Check if train can enter a section"""
        return current_occupancy < section_capacity and self.status in ["RUNNING", "SCHEDULED"]
    
    def get_braking_distance(self) -> float:
        """Calculate required braking distance"""
        if self.current_speed <= 0:
            return 0.0
        
        # Convert speed from km/h to m/s
        speed_ms = self.current_speed * 1000 / 3600
        
        # Braking distance formula: d = v² / (2 * a)
        braking_distance = (speed_ms ** 2) / (2 * self.deceleration)
        
        # Add safety margin
        return braking_distance + 50.0  # 50m safety margin
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "id": self.id,
            "train_number": self.train_number,
            "train_name": self.train_name,
            "train_type": self.train_type,
            "priority": self.priority,
            "length": self.length,
            "max_speed": self.max_speed,
            "acceleration": self.acceleration,
            "deceleration": self.deceleration,
            "weight": self.weight,
            "current_section_id": self.current_section_id,
            "current_position": self.current_position,
            "current_speed": self.current_speed,
            "status": self.status,
            "scheduled_departure": self.scheduled_departure.isoformat() if self.scheduled_departure else None,
            "actual_departure": self.actual_departure.isoformat() if self.actual_departure else None,
            "scheduled_arrival": self.scheduled_arrival.isoformat() if self.scheduled_arrival else None,
            "actual_arrival": self.actual_arrival.isoformat() if self.actual_arrival else None,
            "route": self.route,
            "current_route_index": self.current_route_index,
            "departure_delay": self.departure_delay,
            "arrival_delay": self.arrival_delay,
            "total_delay": self.total_delay,
            "energy_consumed": self.energy_consumed,
            "min_dwell_time": self.min_dwell_time,
            "crew_change_required": self.crew_change_required,
            "maintenance_due": self.maintenance_due
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SimulatedTrain':
        """Create instance from dictionary"""
        return cls(**data)