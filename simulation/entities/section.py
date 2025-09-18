from typing import Dict, Any, Optional, List, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)

@dataclass
class SimulatedSection:
    """Simulated section entity for traffic simulation"""
    
    # Basic identification
    id: int
    section_code: str
    section_name: str
    section_type: str = "MAIN_LINE"
    
    # Physical characteristics
    length: float = 1000.0        # meters
    max_speed: float = 100.0      # km/h
    gradient: float = 0.0         # percentage
    curvature: float = 0.0        # radius in meters
    elevation: float = 0.0        # meters above sea level
    
    # Capacity and infrastructure
    track_count: int = 2
    platform_count: int = 0
    max_occupancy: int = 1
    current_occupancy: int = 0
    has_loop_line: bool = False
    electrified: bool = True
    
    # Signal and control
    entry_signal: str = "GREEN"   # GREEN, YELLOW, RED
    exit_signal: str = "GREEN"
    signal_type: str = "AUTOMATIC"
    has_track_circuits: bool = True
    
    # Operational status
    is_active: bool = True
    maintenance_mode: bool = False
    weather_restricted: bool = False
    emergency_restricted: bool = False
    
    # Dynamic state
    trains_in_section: Set[int] = field(default_factory=set)
    blocked_by_train: Optional[int] = None
    last_train_exit: Optional[datetime] = None
    
    # Performance tracking
    total_trains_processed: int = 0
    average_transit_time: float = 300.0  # seconds
    congestion_events: int = 0
    delay_incidents: int = 0
    
    # Environmental factors
    weather_factor: float = 1.0    # Speed multiplier due to weather
    visibility: str = "CLEAR"      # CLEAR, FOG, RAIN, STORM
    temperature: float = 20.0      # Celsius
    
    # Restrictions and limitations
    speed_restrictions: List[Dict[str, Any]] = field(default_factory=list)
    temporary_closures: List[Dict[str, Any]] = field(default_factory=list)
    
    def __post_init__(self):
        """Initialize section state"""
        if not isinstance(self.trains_in_section, set):
            self.trains_in_section = set(self.trains_in_section) if self.trains_in_section else set()
        
        # Update current occupancy based on trains in section
        self.current_occupancy = len(self.trains_in_section)
        
        # Set initial signal states
        self._update_signal_states()
    
    def can_accept_train(self, train) -> bool:
        """Check if section can accept a new train"""
        if not self.is_active or self.maintenance_mode or self.emergency_restricted:
            return False
        
        if self.current_occupancy >= self.max_occupancy:
            return False
        
        # Check if train meets section requirements
        if hasattr(train, 'length') and train.length > self.length:
            return False  # Train too long for section
        
        if hasattr(train, 'max_speed') and not self.electrified and train.train_type == "ELECTRIC":
            return False  # Electric train on non-electrified section
        
        return True
    
    def add_train(self, train) -> bool:
        """Add train to section"""
        if not self.can_accept_train(train):
            logger.warning(f"Cannot add train {train.id} to section {self.id}")
            return False
        
        self.trains_in_section.add(train.id)
        self.current_occupancy = len(self.trains_in_section)
        self.total_trains_processed += 1
        
        # Update signals
        self._update_signal_states()
        
        # Log entry
        logger.debug(f"Train {train.id} entered section {self.id}")
        
        return True
    
    def remove_train(self, train) -> bool:
        """Remove train from section"""
        if hasattr(train, 'id'):
            train_id = train.id
        else:
            train_id = train
        
        if train_id in self.trains_in_section:
            self.trains_in_section.remove(train_id)
            self.current_occupancy = len(self.trains_in_section)
            self.last_train_exit = datetime.now()
            
            # Update signals
            self._update_signal_states()
            
            # Clear blocking if this was the blocking train
            if self.blocked_by_train == train_id:
                self.blocked_by_train = None
            
            logger.debug(f"Train {train_id} exited section {self.id}")
            return True
        
        return False
    
    def _update_signal_states(self):
        """Update signal aspects based on occupancy"""
        if self.current_occupancy >= self.max_occupancy:
            self.entry_signal = "RED"
            self.exit_signal = "RED"
        elif self.current_occupancy > 0:
            self.entry_signal = "YELLOW"
            self.exit_signal = "GREEN"
        else:
            self.entry_signal = "GREEN"
            self.exit_signal = "GREEN"
        
        # Override for maintenance or restrictions
        if self.maintenance_mode or self.emergency_restricted:
            self.entry_signal = "RED"
            self.exit_signal = "RED"
    
    def get_effective_speed_limit(self) -> float:
        """Get current effective speed limit considering all restrictions"""
        effective_speed = self.max_speed
        
        # Apply weather restrictions
        if self.weather_restricted:
            effective_speed *= self.weather_factor
        
        # Apply temporary speed restrictions
        for restriction in self.speed_restrictions:
            if restriction.get('active', True):
                restriction_speed = restriction.get('max_speed', self.max_speed)
                effective_speed = min(effective_speed, restriction_speed)
        
        return max(10.0, effective_speed)  # Minimum 10 km/h
    
    def calculate_transit_time(self, train_speed: float) -> float:
        """Calculate expected transit time for given train speed"""
        effective_speed = min(train_speed, self.get_effective_speed_limit())
        
        # Convert to m/s
        speed_ms = effective_speed * 1000 / 3600
        
        if speed_ms <= 0:
            return float('inf')
        
        # Base transit time
        base_time = self.length / speed_ms
        
        # Add factors for gradient, curvature, etc.
        gradient_factor = 1.0 + abs(self.gradient) * 0.1  # 10% increase per 1% gradient
        curvature_factor = 1.0 + (1000 / max(self.curvature, 1000)) * 0.2 if self.curvature > 0 else 1.0
        
        # Weather impact
        weather_factors = {
            "CLEAR": 1.0,
            "FOG": 1.3,
            "RAIN": 1.2,
            "STORM": 1.5
        }
        weather_factor = weather_factors.get(self.visibility, 1.0)
        
        adjusted_time = base_time * gradient_factor * curvature_factor * weather_factor
        
        return max(30.0, adjusted_time)  # Minimum 30 seconds
    
    def add_speed_restriction(self, max_speed: float, reason: str, duration: int = 3600):
        """Add temporary speed restriction"""
        restriction = {
            'max_speed': max_speed,
            'reason': reason,
            'start_time': datetime.now(),
            'end_time': datetime.now() + timedelta(seconds=duration),
            'active': True
        }
        self.speed_restrictions.append(restriction)
        logger.info(f"Speed restriction added to section {self.id}: {max_speed} km/h for {reason}")
    
    def remove_expired_restrictions(self):
        """Remove expired speed restrictions"""
        current_time = datetime.now()
        active_restrictions = []
        
        for restriction in self.speed_restrictions:
            if restriction['end_time'] > current_time:
                active_restrictions.append(restriction)
        
        removed_count = len(self.speed_restrictions) - len(active_restrictions)
        self.speed_restrictions = active_restrictions
        
        if removed_count > 0:
            logger.info(f"Removed {removed_count} expired restrictions from section {self.id}")
    
    def set_weather_conditions(self, visibility: str, temperature: float = None):
        """Update weather conditions affecting the section"""
        self.visibility = visibility
        if temperature is not None:
            self.temperature = temperature
        
        # Update weather factor based on conditions
        weather_factors = {
            "CLEAR": 1.0,
            "CLOUDY": 0.95,
            "FOG": 0.7,
            "RAIN": 0.8,
            "STORM": 0.6,
            "SNOW": 0.5
        }
        
        self.weather_factor = weather_factors.get(visibility, 1.0)
        self.weather_restricted = self.weather_factor < 1.0
        
        logger.info(f"Weather updated for section {self.id}: {visibility}, factor: {self.weather_factor}")
    
    def enter_maintenance_mode(self, reason: str = "Scheduled maintenance"):
        """Enter maintenance mode - block all traffic"""
        self.maintenance_mode = True
        self._update_signal_states()
        logger.info(f"Section {self.id} entered maintenance mode: {reason}")
    
    def exit_maintenance_mode(self):
        """Exit maintenance mode - allow traffic"""
        self.maintenance_mode = False
        self._update_signal_states()
        logger.info(f"Section {self.id} exited maintenance mode")
    
    def get_capacity_utilization(self) -> float:
        """Get current capacity utilization ratio"""
        return self.current_occupancy / self.max_occupancy if self.max_occupancy > 0 else 1.0
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get section performance metrics"""
        return {
            'section_id': self.id,
            'section_code': self.section_code,
            'current_occupancy': self.current_occupancy,
            'max_occupancy': self.max_occupancy,
            'capacity_utilization': self.get_capacity_utilization(),
            'total_trains_processed': self.total_trains_processed,
            'average_transit_time': self.average_transit_time,
            'congestion_events': self.congestion_events,
            'delay_incidents': self.delay_incidents,
            'effective_speed_limit': self.get_effective_speed_limit(),
            'signal_status': {
                'entry': self.entry_signal,
                'exit': self.exit_signal
            },
            'restrictions_active': len(self.speed_restrictions),
            'weather_factor': self.weather_factor,
            'is_operational': self.is_active and not self.maintenance_mode,
            'last_update': datetime.now().isoformat()
        }
    
    def detect_congestion(self) -> bool:
        """Detect if section is experiencing congestion"""
        utilization = self.get_capacity_utilization()
        
        # Consider congested if utilization > 80% or blocked for extended time
        if utilization > 0.8:
            self.congestion_events += 1
            return True
        
        # Check if blocked for too long
        if (self.blocked_by_train and self.last_train_exit and 
            (datetime.now() - self.last_train_exit).total_seconds() > 600):  # 10 minutes
            self.congestion_events += 1
            return True
        
        return False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            'id': self.id,
            'section_code': self.section_code,
            'section_name': self.section_name,
            'section_type': self.section_type,
            'length': self.length,
            'max_speed': self.max_speed,
            'gradient': self.gradient,
            'curvature': self.curvature,
            'elevation': self.elevation,
            'track_count': self.track_count,
            'platform_count': self.platform_count,
            'max_occupancy': self.max_occupancy,
            'current_occupancy': self.current_occupancy,
            'has_loop_line': self.has_loop_line,
            'electrified': self.electrified,
            'entry_signal': self.entry_signal,
            'exit_signal': self.exit_signal,
            'signal_type': self.signal_type,
            'has_track_circuits': self.has_track_circuits,
            'is_active': self.is_active,
            'maintenance_mode': self.maintenance_mode,
            'weather_restricted': self.weather_restricted,
            'emergency_restricted': self.emergency_restricted,
            'trains_in_section': list(self.trains_in_section),
            'blocked_by_train': self.blocked_by_train,
            'last_train_exit': self.last_train_exit.isoformat() if self.last_train_exit else None,
            'total_trains_processed': self.total_trains_processed,
            'average_transit_time': self.average_transit_time,
            'congestion_events': self.congestion_events,
            'delay_incidents': self.delay_incidents,
            'weather_factor': self.weather_factor,
            'visibility': self.visibility,
            'temperature': self.temperature,
            'speed_restrictions': self.speed_restrictions,
            'temporary_closures': self.temporary_closures
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SimulatedSection':
        """Create instance from dictionary"""
        # Convert datetime strings back to datetime objects
        if 'last_train_exit' in data and data['last_train_exit']:
            data['last_train_exit'] = datetime.fromisoformat(data['last_train_exit'])
        
        return cls(**data)