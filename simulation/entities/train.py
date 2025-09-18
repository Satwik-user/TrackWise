from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass, field

@dataclass
class SimulatedTrain:
    """Simulated train entity for traffic simulation"""
    
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
    
    # Current state
    current_section_id: Optional[int] = None
    current_position: float = 0.0     # meters within section
    current_speed: float = 0.0        # km/h
    status: str = "SCHEDULED"         # SCHEDULED, RUNNING, DELAYED, STOPPED, COMPLETED
    
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
    
    # Operational parameters
    min_dwell_time: int = 120         # seconds
    crew_change_required: bool = False
    maintenance_due: bool = False
    
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