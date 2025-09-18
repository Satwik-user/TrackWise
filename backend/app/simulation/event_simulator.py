"""
Event-driven simulation for TrackWise Railway Optimization System
"""

import asyncio
import logging
import heapq
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
import uuid

from .base import BaseSimulator, SimulationEvent, SimulationConfig, SimulationResult, SimulationStatus, SimulationType

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """Types of simulation events"""
    TRAIN_DEPARTURE = "train_departure"
    TRAIN_ARRIVAL = "train_arrival"
    SECTION_ENTRY = "section_entry"
    SECTION_EXIT = "section_exit"
    DELAY_INCIDENT = "delay_incident"
    MAINTENANCE_START = "maintenance_start"
    MAINTENANCE_END = "maintenance_end"
    SIGNAL_CHANGE = "signal_change"
    WEATHER_EVENT = "weather_event"
    EMERGENCY_STOP = "emergency_stop"
    ROUTE_CHANGE = "route_change"
    SPEED_CHANGE = "speed_change"
    CAPACITY_CHANGE = "capacity_change"
    SYSTEM_ALERT = "system_alert"


@dataclass
class EventDefinition:
    """Definition of an event type"""
    event_type: EventType
    probability: float  # Probability per time unit
    duration_range: Tuple[float, float]  # Min/max duration in minutes
    severity_range: Tuple[float, float]  # Min/max severity (0-1)
    affected_entities: List[str]  # Types of entities affected
    triggers: List[str]  # Conditions that trigger this event
    consequences: List[str]  # What happens when this event occurs


@dataclass(order=True)
class PrioritizedEvent:
    """Event with priority for heap queue"""
    priority: float
    event: SimulationEvent = field(compare=False)
    
    def __post_init__(self):
        # Use timestamp as priority (earlier events have higher priority)
        self.priority = self.event.timestamp.timestamp()


class EventGenerator:
    """Generates simulation events based on probability distributions"""
    
    def __init__(self):
        self.event_definitions: Dict[EventType, EventDefinition] = {}
        self.random_seed = None
        self._initialize_event_definitions()
    
    def _initialize_event_definitions(self):
        """Initialize standard event definitions"""
        
        self.event_definitions = {
            EventType.DELAY_INCIDENT: EventDefinition(
                event_type=EventType.DELAY_INCIDENT,
                probability=0.05,  # 5% chance per hour
                duration_range=(5.0, 60.0),
                severity_range=(0.2, 0.8),
                affected_entities=["train"],
                triggers=["weather", "equipment_failure", "congestion"],
                consequences=["increased_delay", "route_change"]
            ),
            
            EventType.MAINTENANCE_START: EventDefinition(
                event_type=EventType.MAINTENANCE_START,
                probability=0.02,  # 2% chance per hour
                duration_range=(60.0, 240.0),
                severity_range=(0.5, 1.0),
                affected_entities=["section"],
                triggers=["scheduled_maintenance", "equipment_failure"],
                consequences=["section_closure", "capacity_reduction"]
            ),
            
            EventType.WEATHER_EVENT: EventDefinition(
                event_type=EventType.WEATHER_EVENT,
                probability=0.1,  # 10% chance per hour
                duration_range=(30.0, 180.0),
                severity_range=(0.1, 0.9),
                affected_entities=["section", "train"],
                triggers=["weather_conditions"],
                consequences=["speed_reduction", "delays"]
            ),
            
            EventType.SIGNAL_CHANGE: EventDefinition(
                event_type=EventType.SIGNAL_CHANGE,
                probability=0.3,  # 30% chance per hour
                duration_range=(1.0, 10.0),
                severity_range=(0.1, 0.5),
                affected_entities=["section"],
                triggers=["train_approach", "schedule_change"],
                consequences=["speed_change", "wait_time"]
            ),
            
            EventType.EMERGENCY_STOP: EventDefinition(
                event_type=EventType.EMERGENCY_STOP,
                probability=0.001,  # 0.1% chance per hour
                duration_range=(10.0, 30.0),
                severity_range=(0.8, 1.0),
                affected_entities=["train", "section"],
                triggers=["safety_violation", "emergency"],
                consequences=["system_halt", "investigation"]
            )
        }
    
    def generate_events(
        self,
        start_time: datetime,
        end_time: datetime,
        entities: Dict[str, List[Dict[str, Any]]]
    ) -> List[SimulationEvent]:
        """Generate events for a time period"""
        
        events = []
        current_time = start_time
        time_step = timedelta(minutes=60)  # Generate events hourly
        
        while current_time < end_time:
            for event_type, definition in self.event_definitions.items():
                
                # Check probability
                if np.random.random() < definition.probability:
                    
                    # Select random entity to affect
                    affected_entity_type = np.random.choice(definition.affected_entities)
                    if affected_entity_type not in entities or not entities[affected_entity_type]:
                        continue
                    
                    affected_entity = np.random.choice(entities[affected_entity_type])
                    
                    # Generate event time (random within next hour)
                    event_time = current_time + timedelta(minutes=np.random.uniform(0, 60))
                    
                    # Generate event properties
                    duration = np.random.uniform(*definition.duration_range)
                    severity = np.random.uniform(*definition.severity_range)
                    
                    # Create event
                    event = SimulationEvent(
                        event_id=f"{event_type.value}_{affected_entity['id']}_{int(event_time.timestamp())}",
                        event_type=event_type.value,
                        timestamp=event_time,
                        entity_id=affected_entity["id"],
                        data={
                            "duration_minutes": duration,
                            "severity": severity,
                            "cause": np.random.choice(definition.triggers),
                            "entity_type": affected_entity_type,
                            "consequences": definition.consequences
                        },
                        priority=int(severity * 10)
                    )
                    
                    events.append(event)
            
            current_time += time_step
        
        return sorted(events, key=lambda e: e.timestamp)


class EventProcessor:
    """Processes simulation events and applies their effects"""
    
    def __init__(self, simulator_state):
        self.simulator_state = simulator_state
        self.active_events: Dict[str, SimulationEvent] = {}
        self.event_effects: Dict[str, Dict[str, Any]] = {}
    
    async def process_event(self, event: SimulationEvent) -> List[SimulationEvent]:
        """Process an event and return any triggered events"""
        
        triggered_events = []
        
        if event.event_type == EventType.DELAY_INCIDENT.value:
            triggered_events.extend(await self._process_delay_incident(event))
        elif event.event_type == EventType.MAINTENANCE_START.value:
            triggered_events.extend(await self._process_maintenance_start(event))
        elif event.event_type == EventType.MAINTENANCE_END.value:
            triggered_events.extend(await self._process_maintenance_end(event))
        elif event.event_type == EventType.WEATHER_EVENT.value:
            triggered_events.extend(await self._process_weather_event(event))
        elif event.event_type == EventType.SIGNAL_CHANGE.value:
            triggered_events.extend(await self._process_signal_change(event))
        elif event.event_type == EventType.EMERGENCY_STOP.value:
            triggered_events.extend(await self._process_emergency_stop(event))
        
        # Store active event
        self.active_events[event.event_id] = event
        
        return triggered_events
    
    async def _process_delay_incident(self, event: SimulationEvent) -> List[SimulationEvent]:
        """Process delay incident event"""
        
        train_id = event.entity_id
        duration = event.data.get("duration_minutes", 10)
        severity = event.data.get("severity", 0.5)
        
        # Apply delay to train
        if train_id in self.simulator_state.trains:
            train = self.simulator_state.trains[train_id]
            additional_delay = duration * severity
            current_delay = train.get("delay_minutes", 0)
            train["delay_minutes"] = current_delay + additional_delay
            train["delay_updated_at"] = event.timestamp.isoformat()
            train["delay_cause"] = event.data.get("cause", "incident")
        
        # Schedule recovery event
        recovery_time = event.timestamp + timedelta(minutes=duration)
        recovery_event = SimulationEvent(
            event_id=f"delay_recovery_{train_id}_{int(recovery_time.timestamp())}",
            event_type="delay_recovery",
            timestamp=recovery_time,
            entity_id=train_id,
            data={
                "original_event": event.event_id,
                "recovery_amount": additional_delay * 0.5  # Partial recovery
            }
        )
        
        return [recovery_event]
    
    async def _process_maintenance_start(self, event: SimulationEvent) -> List[SimulationEvent]:
        """Process maintenance start event"""
        
        section_id = event.entity_id
        duration = event.data.get("duration_minutes", 120)
        
        # Apply maintenance to section
        if section_id in self.simulator_state.sections:
            section = self.simulator_state.sections[section_id]
            section["status"] = "MAINTENANCE"
            section["maintenance_until"] = (event.timestamp + timedelta(minutes=duration)).isoformat()
            section["maintenance_type"] = event.data.get("cause", "scheduled")
        
        # Schedule maintenance end event
        end_time = event.timestamp + timedelta(minutes=duration)
        end_event = SimulationEvent(
            event_id=f"maintenance_end_{section_id}_{int(end_time.timestamp())}",
            event_type=EventType.MAINTENANCE_END.value,
            timestamp=end_time,
            entity_id=section_id,
            data={
                "original_event": event.event_id
            }
        )
        
        return [end_event]
    
    async def _process_maintenance_end(self, event: SimulationEvent) -> List[SimulationEvent]:
        """Process maintenance end event"""
        
        section_id = event.entity_id
        
        # Restore section to available
        if section_id in self.simulator_state.sections:
            section = self.simulator_state.sections[section_id]
            section["status"] = "AVAILABLE"
            section["last_maintenance"] = event.timestamp.isoformat()
            if "maintenance_until" in section:
                del section["maintenance_until"]
        
        return []
    
    async def _process_weather_event(self, event: SimulationEvent) -> List[SimulationEvent]:
        """Process weather event"""
        
        severity = event.data.get("severity", 0.5)
        duration = event.data.get("duration_minutes", 60)
        
        # Apply weather effects to affected sections/trains
        # This is simplified - in reality would affect multiple entities
        
        triggered_events = []
        
        # Reduce speed limits for affected sections
        for section_id, section in self.simulator_state.sections.items():
            if np.random.random() < 0.3:  # 30% of sections affected
                original_speed = section.get("max_speed_kmh", 80)
                reduced_speed = original_speed * (1 - severity * 0.5)
                section["weather_speed_limit"] = reduced_speed
                
                # Schedule weather end event for this section
                end_time = event.timestamp + timedelta(minutes=duration)
                end_event = SimulationEvent(
                    event_id=f"weather_end_{section_id}_{int(end_time.timestamp())}",
                    event_type="weather_end",
                    timestamp=end_time,
                    entity_id=section_id,
                    data={
                        "original_speed": original_speed,
                        "weather_event": event.event_id
                    }
                )
                triggered_events.append(end_event)
        
        return triggered_events
    
    async def _process_signal_change(self, event: SimulationEvent) -> List[SimulationEvent]:
        """Process signal change event"""
        
        section_id = event.entity_id
        
        # Change signal status
        if section_id in self.simulator_state.sections:
            section = self.simulator_state.sections[section_id]
            
            # Random signal state
            signal_states = ["GREEN", "YELLOW", "RED"]
            new_state = np.random.choice(signal_states)
            section["signal_state"] = new_state
            
            # Set speed limit based on signal
            if new_state == "RED":
                section["signal_speed_limit"] = 0
            elif new_state == "YELLOW":
                section["signal_speed_limit"] = section.get("max_speed_kmh", 80) * 0.5
            else:  # GREEN
                section["signal_speed_limit"] = section.get("max_speed_kmh", 80)
        
        return []
    
    async def _process_emergency_stop(self, event: SimulationEvent) -> List[SimulationEvent]:
        """Process emergency stop event"""
        
        # Stop all trains in affected area
        affected_trains = []
        
        for train_id, train in self.simulator_state.trains.items():
            if train.get("current_section") == event.entity_id:
                train["status"] = "EMERGENCY_STOP"
                train["emergency_stop_time"] = event.timestamp.isoformat()
                affected_trains.append(train_id)
        
        # Schedule investigation completion
        investigation_duration = event.data.get("duration_minutes", 20)
        completion_time = event.timestamp + timedelta(minutes=investigation_duration)
        
        completion_event = SimulationEvent(
            event_id=f"emergency_resolved_{event.entity_id}_{int(completion_time.timestamp())}",
            event_type="emergency_resolved",
            timestamp=completion_time,
            entity_id=event.entity_id,
            data={
                "affected_trains": affected_trains,
                "original_event": event.event_id
            }
        )
        
        return [completion_event]


class EventSimulator(BaseSimulator):
    """Event-driven simulator with advanced event handling"""
    
    def __init__(self):
        super().__init__(SimulationType.EVENT_DRIVEN)
        self.event_queue: List[PrioritizedEvent] = []
        self.event_generator = EventGenerator()
        self.event_processor = None
        self.processed_events: List[SimulationEvent] = []
        self.simulation_duration = 0
    
    async def initialize(self, config: SimulationConfig, initial_data: Dict[str, Any]) -> bool:
        """Initialize the event simulator"""
        try:
            self.current_state = self._create_initial_state(initial_data)
            self.event_processor = EventProcessor(self.current_state)
            self.simulation_duration = config.duration_minutes
            
            # Generate initial events
            await self._generate_simulation_events(initial_data)
            
            logger.info(f"Event simulator initialized with {len(self.event_queue)} events")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize event simulator: {e}")
            return False
    
    async def step(self) -> bool:
        """Process next event in the queue"""
        try:
            if not self.event_queue:
                return False
            
            # Get next event
            prioritized_event = heapq.heappop(self.event_queue)
            event = prioritized_event.event
            
            # Check if event time has passed
            if event.timestamp > self.current_state.simulation_time:
                self.current_state.simulation_time = event.timestamp
            
            # Process event
            triggered_events = await self.event_processor.process_event(event)
            
            # Add triggered events to queue
            for triggered_event in triggered_events:
                heapq.heappush(self.event_queue, PrioritizedEvent(0, triggered_event))
            
            # Store processed event
            self.processed_events.append(event)
            self.current_state.events.append(event)
            
            # Update metrics
            self._update_metrics()
            
            # Emit event
            await self.emit_event(event)
            
            return True
            
        except Exception as e:
            logger.error(f"Error processing event: {e}")
            return False
    
    async def finalize(self) -> SimulationResult:
        """Finalize the event simulation"""
        end_time = datetime.utcnow()
        
        # Calculate event metrics
        event_metrics = self._calculate_event_metrics()
        
        return SimulationResult(
            simulation_id=self.simulation_id,
            status=SimulationStatus.COMPLETED if not self.is_cancelled else SimulationStatus.CANCELLED,
            start_time=self.start_time,
            end_time=end_time,
            final_state=self.current_state,
            metrics=event_metrics,
            events_processed=len(self.processed_events)
        )
    
    async def _generate_simulation_events(self, initial_data: Dict[str, Any]):
        """Generate events for the simulation period"""
        
        start_time = self.current_state.simulation_time
        end_time = start_time + timedelta(minutes=self.simulation_duration)
        
        # Prepare entities for event generation
        entities = {
            "train": initial_data.get("trains", []),
            "section": initial_data.get("sections", [])
        }
        
        # Generate random events
        random_events = self.event_generator.generate_events(start_time, end_time, entities)
        
        # Generate scheduled events (departures, arrivals, etc.)
        scheduled_events = await self._generate_scheduled_events(initial_data)
        
        # Combine all events
        all_events = random_events + scheduled_events
        
        # Add to priority queue
        for event in all_events:
            heapq.heappush(self.event_queue, PrioritizedEvent(0, event))
    
    async def _generate_scheduled_events(self, initial_data: Dict[str, Any]) -> List[SimulationEvent]:
        """Generate scheduled events like departures and arrivals"""
        
        scheduled_events = []
        
        # Generate train departure events
        for train in initial_data.get("trains", []):
            scheduled_departure = train.get("scheduled_departure")
            if scheduled_departure:
                if isinstance(scheduled_departure, str):
                    departure_time = datetime.fromisoformat(scheduled_departure.replace('Z', '+00:00'))
                else:
                    departure_time = scheduled_departure
                
                departure_event = SimulationEvent(
                    event_id=f"scheduled_departure_{train['id']}",
                    event_type=EventType.TRAIN_DEPARTURE.value,
                    timestamp=departure_time,
                    entity_id=train["id"],
                    data={
                        "train_id": train["id"],
                        "route": train.get("route", []),
                        "scheduled": True
                    },
                    priority=1
                )
                scheduled_events.append(departure_event)
                
                # Generate corresponding arrival event
                route = train.get("route", [])
                if route:
                    # Estimate arrival time (simplified)
                    travel_time_minutes = len(route) * 20  # 20 minutes per section
                    arrival_time = departure_time + timedelta(minutes=travel_time_minutes)
                    
                    arrival_event = SimulationEvent(
                        event_id=f"scheduled_arrival_{train['id']}",
                        event_type=EventType.TRAIN_ARRIVAL.value,
                        timestamp=arrival_time,
                        entity_id=train["id"],
                        data={
                            "train_id": train["id"],
                            "destination": route[-1] if route else None,
                            "scheduled": True
                        },
                        priority=1
                    )
                    scheduled_events.append(arrival_event)
        
        return scheduled_events
    
    def _calculate_event_metrics(self) -> Dict[str, Any]:
        """Calculate metrics about processed events"""
        
        if not self.processed_events:
            return {}
        
        # Count events by type
        event_counts = {}
        for event in self.processed_events:
            event_type = event.event_type
            event_counts[event_type] = event_counts.get(event_type, 0) + 1
        
        # Calculate event timing metrics
        event_times = [event.timestamp for event in self.processed_events]
        simulation_start = min(event_times)
        simulation_end = max(event_times)
        simulation_duration = (simulation_end - simulation_start).total_seconds() / 60
        
        # Average events per hour
        events_per_hour = len(self.processed_events) / max(simulation_duration / 60, 1)
        
        # Calculate severity distribution
        severities = []
        for event in self.processed_events:
            severity = event.data.get("severity", 0)
            if severity > 0:
                severities.append(severity)
        
        avg_severity = np.mean(severities) if severities else 0
        
        return {
            "total_events_processed": len(self.processed_events),
            "events_by_type": event_counts,
            "simulation_duration_minutes": simulation_duration,
            "events_per_hour": events_per_hour,
            "average_event_severity": avg_severity,
            "unique_event_types": len(event_counts),
            "remaining_events": len(self.event_queue)
        }


# Export classes
__all__ = [
    "EventSimulator",
    "EventType",
    "EventDefinition",
    "EventGenerator",
    "EventProcessor",
    "PrioritizedEvent"
]