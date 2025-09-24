from typing import Dict, Any, Optional, List, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import logging
import math

logger = logging.getLogger(__name__)

@dataclass
class SimulatedSection:
    """Simulated section entity with enhanced physics and realistic constraints"""
    
    # Basic identification
    id: int
    section_code: str
    section_name: str
    section_type: str = "MAIN_LINE"
    
    # Physical characteristics
    length: float = 1000.0        # meters
    max_speed: float = 100.0      # km/h
    gradient: float = 0.0         # percentage
    curvature: float = 0.0        # radius in meters (0 = straight)
    elevation: float = 0.0        # meters above sea level
    track_quality: float = 1.0    # 0.5 to 1.0 (affects speed limits)
    
    # Advanced physical parameters
    minimum_curve_speed: float = 0.0    # km/h for curves
    cant_deficiency: float = 0.0        # mm (track banking)
    super_elevation: float = 0.0        # mm
    rail_temperature: float = 20.0      # Celsius
    ballast_condition: float = 1.0      # 0.5 to 1.0
    
    # Capacity and infrastructure
    track_count: int = 2
    platform_count: int = 0
    max_occupancy: int = 1
    current_occupancy: int = 0
    has_loop_line: bool = False
    electrified: bool = True
    power_supply_capacity: float = 5000.0  # kW
    
    # Signal and control systems
    entry_signal: str = "GREEN"   # GREEN, YELLOW, RED
    exit_signal: str = "GREEN"
    signal_type: str = "AUTOMATIC"  # AUTOMATIC, MANUAL, ATP
    has_track_circuits: bool = True
    has_axle_counters: bool = False
    automatic_train_protection: bool = True
    european_train_control_system: bool = False
    
    # Operational status
    is_active: bool = True
    maintenance_mode: bool = False
    weather_restricted: bool = False
    emergency_restricted: bool = False
    power_restricted: bool = False
    
    # Dynamic state
    trains_in_section: Set[int] = field(default_factory=set)
    blocked_by_train: Optional[int] = None
    last_train_exit: Optional[datetime] = None
    signal_last_changed: Optional[datetime] = None
    
    # Performance tracking
    total_trains_processed: int = 0
    average_transit_time: float = 300.0  # seconds
    congestion_events: int = 0
    delay_incidents: int = 0
    energy_consumed: float = 0.0  # kWh
    
    # Environmental factors
    weather_factor: float = 1.0    # Speed multiplier due to weather
    visibility: str = "CLEAR"      # CLEAR, FOG, RAIN, STORM
    temperature: float = 20.0      # Celsius
    wind_speed: float = 0.0        # km/h
    precipitation: float = 0.0     # mm/h
    
    # Restrictions and limitations
    speed_restrictions: List[Dict[str, Any]] = field(default_factory=list)
    temporary_closures: List[Dict[str, Any]] = field(default_factory=list)
    work_zones: List[Dict[str, Any]] = field(default_factory=list)
    
    def __post_init__(self):
        """Initialize section state with enhanced calculations"""
        if not isinstance(self.trains_in_section, set):
            self.trains_in_section = set(self.trains_in_section) if self.trains_in_section else set()
        
        # Update current occupancy based on trains in section
        self.current_occupancy = len(self.trains_in_section)
        
        # Calculate curve speed limit if curved section
        if self.curvature > 0:
            self.minimum_curve_speed = self._calculate_curve_speed_limit()
        
        # Set initial signal states
        self._update_signal_states()
    
    def _calculate_curve_speed_limit(self) -> float:
        """Calculate speed limit for curved sections based on physics"""
        if self.curvature <= 0:
            return self.max_speed
        
        # Formula: V = sqrt(R * (g * tan(θ) + a_lat))
        # Where R = radius, g = gravity, θ = cant angle, a_lat = lateral acceleration limit
        
        radius_m = self.curvature
        cant_angle_rad = math.atan(self.super_elevation / 1500)  # Standard gauge
        max_lateral_acceleration = 0.8  # m/s² (passenger comfort)
        gravity = 9.81  # m/s²
        
        # Calculate maximum speed for curve
        max_speed_ms = math.sqrt(radius_m * (gravity * math.tan(cant_angle_rad) + max_lateral_acceleration))
        max_speed_kmh = max_speed_ms * 3.6
        
        # Apply safety factor and track quality
        safety_factor = 0.85
        return min(self.max_speed, max_speed_kmh * safety_factor * self.track_quality)
    
    def get_effective_speed_limit(self, weather_conditions: str = None) -> float:
        """Get effective speed limit considering all factors"""
        base_limit = self.max_speed
        
        # Apply curve restrictions
        if self.curvature > 0:
            base_limit = min(base_limit, self.minimum_curve_speed)
        
        # Apply weather restrictions
        weather_factor = self._get_weather_speed_factor(weather_conditions or self.visibility)
        base_limit *= weather_factor
        
        # Apply track quality factor
        base_limit *= self.track_quality
        
        # Apply temporary restrictions
        for restriction in self.speed_restrictions:
            if self._is_restriction_active(restriction):
                base_limit = min(base_limit, restriction.get('speed_limit', base_limit))
        
        # Apply temperature restrictions (rail expansion)
        if self.rail_temperature > 45:  # High temperature
            temp_factor = max(0.7, 1.0 - (self.rail_temperature - 45) / 100)
            base_limit *= temp_factor
        
        return max(10.0, base_limit)  # Minimum 10 km/h
    
    def _get_weather_speed_factor(self, weather: str) -> float:
        """Get speed reduction factor based on weather"""
        weather_factors = {
            "CLEAR": 1.0,
            "CLOUDY": 1.0,
            "FOG": 0.6,
            "RAIN": 0.8,
            "STORM": 0.5,
            "SNOW": 0.4,
            "ICE": 0.3
        }
        return weather_factors.get(weather, 0.8)
    
    def _is_restriction_active(self, restriction: Dict[str, Any]) -> bool:
        """Check if a speed restriction is currently active"""
        current_time = datetime.now()
        start_time = restriction.get('start_time')
        end_time = restriction.get('end_time')
        
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time)
        if isinstance(end_time, str):
            end_time = datetime.fromisoformat(end_time)
        
        if start_time and current_time < start_time:
            return False
        if end_time and current_time > end_time:
            return False
        
        return True
    
    def can_accept_train(self, train) -> bool:
        """Enhanced train acceptance check with realistic constraints"""
        # Basic capacity check
        if not self.is_active or self.maintenance_mode or self.emergency_restricted:
            return False
        
        if self.current_occupancy >= self.max_occupancy:
            return False
        
        # Check signal states
        if self.entry_signal == "RED":
            return False
        
        # Check train compatibility
        if hasattr(train, 'length') and train.length > self.length:
            return False  # Train too long for section
        
        # Check electrification compatibility
        if not self.electrified and getattr(train, 'train_type', '') == "ELECTRIC":
            return False
        
        # Check power supply capacity
        if hasattr(train, 'power'):
            total_power_demand = train.power
            for train_id in self.trains_in_section:
                # In real implementation, would look up actual train power
                total_power_demand += 2000  # Assumed average power
            
            if total_power_demand > self.power_supply_capacity:
                return False
        
        # Check minimum headway (safety distance)
        if self.last_train_exit:
            time_since_last_exit = (datetime.now() - self.last_train_exit).total_seconds()
            minimum_headway = 120  # seconds
            if time_since_last_exit < minimum_headway:
                return False
        
        return True
    
    def calculate_transit_time(self, train, include_stopping: bool = False) -> float:
        """Calculate realistic transit time for a train through this section"""
        if not hasattr(train, 'max_speed'):
            return self.average_transit_time
        
        # Get effective speed limit
        effective_speed_limit = self.get_effective_speed_limit()
        
        # Train's maximum speed in this section
        train_max_speed = min(train.max_speed, effective_speed_limit)
        
        # Account for acceleration and deceleration
        accel_time = train_max_speed / (train.acceleration * 3.6)  # Time to reach max speed
        accel_distance = 0.5 * train.acceleration * (accel_time ** 2)  # Distance during acceleration
        
        decel_time = train_max_speed / (train.deceleration * 3.6)  # Time to stop
        decel_distance = 0.5 * train.deceleration * (decel_time ** 2)  # Distance during deceleration
        
        # Check if train can reach maximum speed
        if (accel_distance + decel_distance) >= self.length:
            # Short section - train accelerates then immediately decelerates
            max_achievable_speed = math.sqrt(2 * train.acceleration * train.deceleration * self.length / 
                                           (train.acceleration + train.deceleration))
            transit_time = 2 * math.sqrt(self.length * 2 / (train.acceleration + train.deceleration))
        else:
            # Normal case - accelerate, cruise, decelerate
            cruise_distance = self.length - accel_distance - decel_distance
            cruise_time = cruise_distance / (train_max_speed / 3.6)  # Convert km/h to m/s
            transit_time = accel_time + cruise_time + decel_time
        
        # Add dwell time if this is a station
        if include_stopping and self.platform_count > 0:
            dwell_time = getattr(train, 'min_dwell_time', 120)
            transit_time += dwell_time
        
        # Add delays due to congestion
        congestion_factor = 1.0 + (self.current_occupancy / self.max_occupancy) * 0.3
        
        return transit_time * congestion_factor
    
    def add_train(self, train) -> bool:
        """Add train to section with enhanced tracking"""
        if not self.can_accept_train(train):
            logger.warning(f"Cannot add train {train.id} to section {self.id}")
            return False
        
        self.trains_in_section.add(train.id)
        self.current_occupancy = len(self.trains_in_section)
        
        # Update train's current section
        if hasattr(train, 'current_section_id'):
            train.current_section_id = self.id
            train.current_position = 0.0
        
        # Update signals
        self._update_signal_states()
        
        # Log entry
        logger.info(f"Train {train.id} entered section {self.id}")
        
        return True
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
    def remove_train(self, train_id: int) -> bool:
        """Remove train from section with enhanced tracking"""
        if train_id in self.trains_in_section:
            self.trains_in_section.remove(train_id)
            self.current_occupancy = len(self.trains_in_section)
            self.last_train_exit = datetime.now()
            self.total_trains_processed += 1
            
            # Update signals
            self._update_signal_states()
            
            # Clear blocking if this was the blocking train
            if self.blocked_by_train == train_id:
                self.blocked_by_train = None
            
            logger.info(f"Train {train_id} exited section {self.id}")
            return True
        
        return False
    
    def _update_signal_states(self):
        """Update signal aspects based on occupancy and conditions"""
        current_time = datetime.now()
        self.signal_last_changed = current_time
        
        # Basic occupancy-based signals
        if self.current_occupancy >= self.max_occupancy:
            self.entry_signal = "RED"
            self.exit_signal = "RED"
        elif self.current_occupancy > 0:
            self.entry_signal = "YELLOW"  # Caution - section occupied
            self.exit_signal = "GREEN"
        else:
            self.entry_signal = "GREEN"
            self.exit_signal = "GREEN"
        
        # Override for maintenance or restrictions
        if self.maintenance_mode or self.emergency_restricted or self.power_restricted:
            self.entry_signal = "RED"
            self.exit_signal = "RED"
        
        # Weather-based restrictions
        if self.weather_restricted and self.visibility in ["FOG", "STORM"]:
            if self.entry_signal == "GREEN":
                self.entry_signal = "YELLOW"  # Proceed with caution
    
    def update_environmental_conditions(self, temperature: float = None, 
                                      visibility: str = None, 
                                      wind_speed: float = None,
                                      precipitation: float = None):
        """Update environmental conditions affecting the section"""
        if temperature is not None:
            self.temperature = temperature
            # Update rail temperature (lags behind air temperature)
            self.rail_temperature = temperature + (self.rail_temperature - temperature) * 0.7
        
        if visibility is not None:
            self.visibility = visibility
            # Update weather factor
            self.weather_factor = self._get_weather_speed_factor(visibility)
            self.weather_restricted = visibility in ["FOG", "STORM", "SNOW"]
        
        if wind_speed is not None:
            self.wind_speed = wind_speed
            # High winds can affect operations
            if wind_speed > 60:  # km/h
                self.weather_restricted = True
                self.weather_factor = min(self.weather_factor, 0.7)
        
        if precipitation is not None:
            self.precipitation = precipitation
            # Heavy rain affects operations
            if precipitation > 10:  # mm/h
                self.weather_restricted = True
                self.weather_factor = min(self.weather_factor, 0.8)
        
        # Update signals based on new conditions
        self._update_signal_states()
    
    def add_speed_restriction(self, max_speed: float, reason: str, 
                            start_time: datetime = None, end_time: datetime = None,
                            start_position: float = 0.0, end_position: float = None):
        """Add a temporary speed restriction"""
        if end_position is None:
            end_position = self.length
        
        restriction = {
            'id': f"RESTRICT_{len(self.speed_restrictions) + 1}",
            'max_speed': max_speed,
            'reason': reason,
            'start_time': start_time or datetime.now(),
            'end_time': end_time,
            'start_position': start_position,
            'end_position': end_position,
            'active': True
        }
        
        self.speed_restrictions.append(restriction)
        logger.info(f"Speed restriction added to section {self.id}: {max_speed} km/h ({reason})")
    
    def remove_speed_restriction(self, restriction_id: str):
        """Remove a speed restriction"""
        self.speed_restrictions = [r for r in self.speed_restrictions if r.get('id') != restriction_id]
    
    def get_section_utilization(self) -> float:
        """Calculate current section utilization as percentage"""
        return (self.current_occupancy / self.max_occupancy) * 100 if self.max_occupancy > 0 else 0
    
    def predict_congestion_risk(self) -> str:
        """Predict congestion risk level"""
        utilization = self.get_section_utilization()
        
        if utilization >= 90:
            return "CRITICAL"
        elif utilization >= 70:
            return "HIGH"
        elif utilization >= 50:
            return "MEDIUM"
        else:
            return "LOW"
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics"""
        return {
            'section_id': self.id,
            'utilization_percent': self.get_section_utilization(),
            'congestion_risk': self.predict_congestion_risk(),
            'current_occupancy': self.current_occupancy,
            'max_occupancy': self.max_occupancy,
            'total_trains_processed': self.total_trains_processed,
            'average_transit_time': self.average_transit_time,
            'effective_speed_limit': self.get_effective_speed_limit(),
            'signal_states': {
                'entry': self.entry_signal,
                'exit': self.exit_signal
            },
            'environmental_conditions': {
                'temperature': self.temperature,
                'visibility': self.visibility,
                'weather_factor': self.weather_factor,
                'wind_speed': self.wind_speed,
                'precipitation': self.precipitation
            },
            'restrictions': {
                'maintenance_mode': self.maintenance_mode,
                'weather_restricted': self.weather_restricted,
                'emergency_restricted': self.emergency_restricted,
                'active_speed_restrictions': len([r for r in self.speed_restrictions if self._is_restriction_active(r)])
            },
            'energy_consumed': self.energy_consumed
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "id": self.id,
            "section_code": self.section_code,
            "section_name": self.section_name,
            "section_type": self.section_type,
            "length": self.length,
            "max_speed": self.max_speed,
            "gradient": self.gradient,
            "curvature": self.curvature,
            "elevation": self.elevation,
            "track_count": self.track_count,
            "platform_count": self.platform_count,
            "max_occupancy": self.max_occupancy,
            "current_occupancy": self.current_occupancy,
            "has_loop_line": self.has_loop_line,
            "electrified": self.electrified,
            "entry_signal": self.entry_signal,
            "exit_signal": self.exit_signal,
            "signal_type": self.signal_type,
            "has_track_circuits": self.has_track_circuits,
            "is_active": self.is_active,
            "maintenance_mode": self.maintenance_mode,
            "weather_restricted": self.weather_restricted,
            "emergency_restricted": self.emergency_restricted,
            "trains_in_section": list(self.trains_in_section),
            "blocked_by_train": self.blocked_by_train,
            "last_train_exit": self.last_train_exit.isoformat() if self.last_train_exit else None,
            "total_trains_processed": self.total_trains_processed,
            "average_transit_time": self.average_transit_time,
            "congestion_events": self.congestion_events,
            "delay_incidents": self.delay_incidents,
            "weather_factor": self.weather_factor,
            "visibility": self.visibility,
            "temperature": self.temperature,
            "speed_restrictions": self.speed_restrictions,
            "temporary_closures": self.temporary_closures
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SimulatedSection':
        """Create instance from dictionary"""
        # Convert datetime strings back to datetime objects
        if 'last_train_exit' in data and data['last_train_exit']:
            data['last_train_exit'] = datetime.fromisoformat(data['last_train_exit'])
        
        # Ensure trains_in_section is a set
        if 'trains_in_section' in data:
            data['trains_in_section'] = set(data['trains_in_section'])
        
        return cls(**data)
        
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