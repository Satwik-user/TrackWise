import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import uuid
import json
import random
import numpy as np

from simulation.entities.train import SimulatedTrain
from simulation.entities.section import SimulatedSection
from simulation.core.event_manager import EventManager
from simulation.core.state_manager import StateManager

logger = logging.getLogger(__name__)

class TrafficSimulator:
    """Enhanced traffic simulation engine with realistic physics"""
    
    def __init__(self):
        self.event_manager = EventManager()
        self.state_manager = StateManager()
        self.trains = {}
        self.sections = {}
        self.simulation_time = datetime.now()
        self.time_step = 0.1  # seconds - smaller time step for better physics
        self.is_running = False
        self.events_log = []
        self.metrics_log = []
        self.physics_enabled = True
        self.safety_systems_enabled = True
        
        # Simulation parameters
        self.max_simulation_speed = 10.0  # Real time multiplier
        self.collision_detection_enabled = True
        self.automatic_train_protection = True
        self.energy_calculation_enabled = True
        
    async def run_scenario(
        self,
        trains_data: List[Dict[str, Any]],
        sections_data: List[Dict[str, Any]],
        disruptions: List[Dict[str, Any]] = None,
        duration: int = 3600,  # seconds
        scenario_name: str = None
    ) -> Dict[str, Any]:
        """Run a complete simulation scenario"""
        
        scenario_id = f"SIM_{uuid.uuid4().hex[:8]}"
        start_time = datetime.now()
        
        try:
            logger.info(f"Starting simulation scenario {scenario_id}")
            
            # Initialize scenario
            await self._initialize_scenario(trains_data, sections_data, disruptions)
            
            # Run simulation
            simulation_result = await self._run_simulation(duration)
            
            # Calculate metrics
            metrics = self._calculate_scenario_metrics()
            
            # Generate summary
            summary = self._generate_scenario_summary(metrics)
            
            end_time = datetime.now()
            
            return {
                'scenario_id': scenario_id,
                'scenario_name': scenario_name or f"Scenario_{scenario_id}",
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'duration': duration,
                'simulation_time': (end_time - start_time).total_seconds(),
                'trains_count': len(self.trains),
                'sections_count': len(self.sections),
                'events': self.events_log,
                'metrics': metrics,
                'summary': summary,
                'disruptions_applied': len(disruptions) if disruptions else 0
            }
            
        except Exception as e:
            logger.error(f"Simulation failed: {str(e)}")
            return {
                'scenario_id': scenario_id,
                'error': str(e),
                'events': self.events_log,
                'metrics': {},
                'summary': {'status': 'FAILED'}
            }
    
    async def _initialize_scenario(
        self,
        trains_data: List[Dict[str, Any]],
        sections_data: List[Dict[str, Any]],
        disruptions: List[Dict[str, Any]] = None
    ):
        """Initialize simulation scenario"""
        
        # Clear previous state
        self.trains.clear()
        self.sections.clear()
        self.events_log.clear()
        self.metrics_log.clear()
        self.simulation_time = datetime.now()
        
        # Initialize sections
        for section_data in sections_data:
            section = SimulatedSection(section_data)
            self.sections[section.id] = section
            self.state_manager.add_section(section)
        
        # Initialize trains
        for train_data in trains_data:
            train = SimulatedTrain(train_data)
            self.trains[train.id] = train
            self.state_manager.add_train(train)
            
            # Schedule initial events
            if train.scheduled_departure:
                self.event_manager.schedule_event(
                    time=train.scheduled_departure,
                    event_type="TRAIN_DEPARTURE",
                    data={
                        'train_id': train.id,
                        'section_id': train.current_section_id
                    }
                )
        
        # Schedule disruptions
        if disruptions:
            for disruption in disruptions:
                self._schedule_disruption(disruption)
        
        logger.info(f"Initialized scenario with {len(self.trains)} trains and {len(self.sections)} sections")
    
    async def _run_simulation(self, duration: int) -> Dict[str, Any]:
        """Run the main simulation loop"""
        
        self.is_running = True
        end_time = self.simulation_time + timedelta(seconds=duration)
        step_count = 0
        
        logger.info(f"Running simulation for {duration} seconds")
        
        while self.simulation_time < end_time and self.is_running:
            step_count += 1
            
            # Process events for current time
            events = self.event_manager.get_events_at_time(self.simulation_time)
            for event in events:
                await self._process_event(event)
            
            # Update train positions and states
            await self._update_train_states()
            
            # Update section states
            await self._update_section_states()
            
            # Log metrics periodically (every 60 seconds)
            if step_count % 60 == 0:
                self._log_current_metrics()
            
            # Advance simulation time
            self.simulation_time += timedelta(seconds=self.time_step)
            
            # Yield control to allow other tasks
            if step_count % 100 == 0:
                await asyncio.sleep(0)
        
        self.is_running = False
        logger.info(f"Simulation completed after {step_count} steps")
        
        return {
            'steps_completed': step_count,
            'final_time': self.simulation_time.isoformat(),
            'events_processed': len(self.events_log)
        }
    
    async def _process_event(self, event: Dict[str, Any]):
        """Process a simulation event"""
        
        event_type = event['type']
        event_data = event['data']
        
        try:
            if event_type == "TRAIN_DEPARTURE":
                await self._handle_train_departure(event_data)
            elif event_type == "TRAIN_ARRIVAL":
                await self._handle_train_arrival(event_data)
            elif event_type == "TRAIN_ENTER_SECTION":
                await self._handle_train_enter_section(event_data)
            elif event_type == "TRAIN_EXIT_SECTION":
                await self._handle_train_exit_section(event_data)
            elif event_type == "DISRUPTION":
                await self._handle_disruption(event_data)
            elif event_type == "SIGNAL_CHANGE":
                await self._handle_signal_change(event_data)
            else:
                logger.warning(f"Unknown event type: {event_type}")
            
            # Log event
            self.events_log.append({
                'time': self.simulation_time.isoformat(),
                'type': event_type,
                'data': event_data
            })
            
        except Exception as e:
            logger.error(f"Error processing event {event_type}: {str(e)}")
    
    async def _handle_train_departure(self, event_data: Dict[str, Any]):
        """Handle train departure event"""
        train_id = event_data['train_id']
        train = self.trains.get(train_id)
        
        if train:
            train.status = "RUNNING"
            train.actual_departure = self.simulation_time
            
            # Calculate delay
            if train.scheduled_departure:
                delay = (self.simulation_time - train.scheduled_departure).total_seconds()
                train.departure_delay = max(0, delay / 60)  # minutes
            
            # Schedule arrival at next section
            if train.route and train.current_route_index < len(train.route) - 1:
                next_section_id = train.route[train.current_route_index + 1]
                travel_time = self._calculate_travel_time(train, self.sections[next_section_id])
                arrival_time = self.simulation_time + timedelta(seconds=travel_time)
                
                self.event_manager.schedule_event(
                    time=arrival_time,
                    event_type="TRAIN_ARRIVAL",
                    data={
                        'train_id': train_id,
                        'section_id': next_section_id
                    }
                )
            
            logger.debug(f"Train {train_id} departed with {train.departure_delay:.1f}min delay")
    
    async def _handle_train_arrival(self, event_data: Dict[str, Any]):
        """Handle train arrival event"""
        train_id = event_data['train_id']
        section_id = event_data['section_id']
        
        train = self.trains.get(train_id)
        section = self.sections.get(section_id)
        
        if train and section:
            # Check if section can accept train
            if section.can_accept_train(train):
                # Enter section
                train.current_section_id = section_id
                train.current_route_index += 1
                train.actual_arrival = self.simulation_time
                section.add_train(train)
                
                # Calculate arrival delay
                if train.scheduled_arrival:
                    delay = (self.simulation_time - train.scheduled_arrival).total_seconds()
                    train.arrival_delay = max(0, delay / 60)  # minutes
                
                # Schedule departure
                dwell_time = self._calculate_dwell_time(train, section)
                departure_time = self.simulation_time + timedelta(seconds=dwell_time)
                
                self.event_manager.schedule_event(
                    time=departure_time,
                    event_type="TRAIN_DEPARTURE",
                    data={
                        'train_id': train_id,
                        'section_id': section_id
                    }
                )
                
                logger.debug(f"Train {train_id} arrived at section {section_id}")
            else:
                # Section full, delay arrival
                delay_time = 60  # 1 minute delay
                new_arrival_time = self.simulation_time + timedelta(seconds=delay_time)
                
                self.event_manager.schedule_event(
                    time=new_arrival_time,
                    event_type="TRAIN_ARRIVAL",
                    data=event_data
                )
                
                logger.debug(f"Train {train_id} delayed at section {section_id} - capacity full")
    
    async def _handle_disruption(self, event_data: Dict[str, Any]):
        """Handle disruption event"""
        disruption_type = event_data.get('type')
        severity = event_data.get('severity', 'MEDIUM')
        affected_sections = event_data.get('affected_sections', [])
        affected_trains = event_data.get('affected_trains', [])
        duration = event_data.get('duration', 300)  # 5 minutes default
        
        logger.info(f"Applying disruption: {disruption_type} (severity: {severity})")
        
        # Apply speed restrictions to sections
        for section_id in affected_sections:
            section = self.sections.get(section_id)
            if section:
                if severity == 'HIGH':
                    section.max_speed *= 0.5  # 50% speed reduction
                elif severity == 'MEDIUM':
                    section.max_speed *= 0.7  # 30% speed reduction
                else:
                    section.max_speed *= 0.9  # 10% speed reduction
        
        # Add delays to affected trains
        delay_multipliers = {'LOW': 1.0, 'MEDIUM': 2.0, 'HIGH': 4.0, 'CRITICAL': 8.0}
        base_delay = 120  # 2 minutes
        
        for train_id in affected_trains:
            train = self.trains.get(train_id)
            if train:
                additional_delay = base_delay * delay_multipliers.get(severity, 2.0)
                train.total_delay = train.total_delay + additional_delay / 60  # convert to minutes
        
        # Schedule disruption end
        end_time = self.simulation_time + timedelta(seconds=duration)
        self.event_manager.schedule_event(
            time=end_time,
            event_type="DISRUPTION_END",
            data={
                'original_disruption': event_data,
                'affected_sections': affected_sections
            }
        )
    
    async def _update_train_states(self):
        """Update all train states using enhanced physics"""
        for train_id, train in self.trains.items():
            if train.status in ["RUNNING", "BRAKING"]:
                # Get current section
                current_section = self.sections.get(train.current_section_id)
                if not current_section:
                    continue
                
                # Calculate physics parameters
                gradient = current_section.gradient
                speed_limit = current_section.get_effective_speed_limit()
                
                # Set target speed based on conditions
                if self.safety_systems_enabled:
                    # Check for conflicts ahead
                    safe_speed = self._calculate_safe_speed(train, current_section)
                    train.target_speed = min(speed_limit, safe_speed)
                else:
                    train.target_speed = min(train.max_speed, speed_limit)
                
                # Update physics state
                if self.physics_enabled:
                    train.update_physics_state(self.time_step, gradient, speed_limit)
                else:
                    # Simple update for performance
                    self._simple_train_update(train, current_section)
                
                # Check if train has completed the section
                if train.current_position >= current_section.length:
                    await self._handle_train_section_completion(train, current_section)
                
                # Update energy consumption for section
                if self.energy_calculation_enabled:
                    current_section.energy_consumed += train.energy_consumed * self.time_step / 3600
                
                # Log significant events
                if abs(train.current_acceleration) > 1.0:  # High acceleration/deceleration
                    self._log_event("TRAIN_DYNAMICS", {
                        'train_id': train_id,
                        'acceleration': train.current_acceleration,
                        'speed': train.current_speed,
                        'position': train.current_position,
                        'section_id': current_section.id
                    })
    
    def _calculate_safe_speed(self, train, section) -> float:
        """Calculate safe speed considering trains ahead"""
        # Check for trains ahead in same section
        min_safe_distance = 200.0  # meters
        
        for other_train_id in section.trains_in_section:
            if other_train_id == train.id:
                continue
            
            other_train = self.trains.get(other_train_id)
            if not other_train:
                continue
            
            # Calculate distance to other train
            distance_ahead = other_train.current_position - train.current_position
            
            if 0 < distance_ahead < min_safe_distance:
                # Train ahead - calculate safe following speed
                relative_speed = train.current_speed - other_train.current_speed
                
                if relative_speed > 0:  # Approaching
                    # Calculate braking distance needed
                    braking_distance = train.get_braking_distance()
                    
                    if distance_ahead < braking_distance + 50:  # 50m safety margin
                        # Need to slow down
                        safe_speed = max(0, other_train.current_speed - 10)  # 10 km/h slower
                        return safe_speed
        
        # Check next section capacity
        next_section_id = self._get_next_section_id(train)
        if next_section_id:
            next_section = self.sections.get(next_section_id)
            if next_section and not next_section.can_accept_train(train):
                # Next section blocked - prepare to stop
                distance_to_end = section.length - train.current_position
                braking_distance = train.get_braking_distance()
                
                if distance_to_end < braking_distance + 100:  # 100m safety margin
                    return 0.0  # Stop before section end
        
        return train.max_speed  # No restrictions
    
    def _simple_train_update(self, train, section):
        """Simple train update for performance mode"""
        target_speed = min(train.target_speed, section.get_effective_speed_limit())
        
        # Simple acceleration/deceleration
        if train.current_speed < target_speed:
            train.current_speed = min(target_speed, train.current_speed + train.acceleration * self.time_step * 3.6)
        elif train.current_speed > target_speed:
            train.current_speed = max(target_speed, train.current_speed - train.deceleration * self.time_step * 3.6)
        
        # Update position
        speed_ms = train.current_speed / 3.6
        train.current_position += speed_ms * self.time_step
    
    async def _handle_train_section_completion(self, train, current_section):
        """Handle train completing a section"""
        # Remove from current section
        current_section.remove_train(train.id)
        
        # Get next section
        next_section_id = self._get_next_section_id(train)
        
        if next_section_id:
            next_section = self.sections.get(next_section_id)
            if next_section and next_section.can_accept_train(train):
                # Move to next section
                next_section.add_train(train)
                train.current_position = 0.0
                train.current_route_index += 1
                
                self._log_event("TRAIN_SECTION_CHANGE", {
                    'train_id': train.id,
                    'from_section': current_section.id,
                    'to_section': next_section.id,
                    'route_progress': f"{train.current_route_index}/{len(train.route)}"
                })
            else:
                # Cannot enter next section - stop at current position
                train.status = "STOPPED"
                train.current_position = current_section.length  # At section boundary
                train.target_speed = 0.0
                
                self._log_event("TRAIN_BLOCKED", {
                    'train_id': train.id,
                    'blocked_at_section': current_section.id,
                    'next_section': next_section_id,
                    'reason': 'section_occupied' if next_section else 'invalid_route'
                })
        else:
            # End of route
            train.status = "COMPLETED"
            train.actual_arrival = self.simulation_time
            
            # Calculate final delays
            if train.scheduled_arrival:
                train.arrival_delay = (train.actual_arrival - train.scheduled_arrival).total_seconds() / 60
                train.total_delay = train.departure_delay + train.arrival_delay
            
            self._log_event("TRAIN_COMPLETED", {
                'train_id': train.id,
                'arrival_delay': train.arrival_delay,
                'total_delay': train.total_delay,
                'energy_consumed': train.energy_consumed,
                'distance_traveled': train.distance_traveled
            })
    
    def _get_next_section_id(self, train) -> Optional[int]:
        """Get the next section ID in train's route"""
        if train.current_route_index + 1 < len(train.route):
            return train.route[train.current_route_index + 1]
        return None
    
    async def _update_section_states(self):
        """Update all section states"""
        for section in self.sections.values():
            # Update occupancy
            section.current_occupancy = len(section.trains_in_section)
            
            # Update signal states based on occupancy
            if section.current_occupancy >= section.max_occupancy:
                section.entry_signal = "RED"
            elif section.current_occupancy > 0:
                section.entry_signal = "YELLOW"
            else:
                section.entry_signal = "GREEN"
    
    async def _handle_section_completion(self, train: SimulatedTrain, section: SimulatedSection):
        """Handle when a train completes a section"""
        # Remove train from current section
        section.remove_train(train)
        
        # Update train status
        if train.current_route_index >= len(train.route) - 1:
            # Train has completed its journey
            train.status = "COMPLETED"
            train.actual_arrival = self.simulation_time
        else:
            # Move to next section
            train.current_position = 0
            # Next section handling will be done by arrival event
    
    def _calculate_travel_time(self, train: SimulatedTrain, section: SimulatedSection) -> int:
        """Calculate travel time for train through section"""
        # Effective speed considering train and section limits
        effective_speed = min(train.max_speed, section.max_speed)
        
        # Apply weather and other factors
        if hasattr(section, 'weather_factor'):
            effective_speed *= section.weather_factor
        
        # Convert to m/s
        speed_ms = effective_speed * 1000 / 3600
        
        # Calculate time including acceleration/deceleration
        accel_time = (effective_speed * 1000 / 3600) / train.acceleration
        decel_time = (effective_speed * 1000 / 3600) / train.deceleration
        
        # Distance for acceleration and deceleration
        accel_distance = 0.5 * train.acceleration * (accel_time ** 2)
        decel_distance = 0.5 * train.deceleration * (decel_time ** 2)
        
        # Remaining distance at constant speed
        constant_distance = section.length - accel_distance - decel_distance
        
        if constant_distance > 0:
            constant_time = constant_distance / speed_ms
            total_time = accel_time + constant_time + decel_time
        else:
            # Short section, simplified calculation
            total_time = section.length / (speed_ms * 0.7)  # Reduced average speed
        
        return int(max(30, total_time))  # Minimum 30 seconds
    
    def _calculate_dwell_time(self, train: SimulatedTrain, section: SimulatedSection) -> int:
        """Calculate dwell time for train in section"""
        base_dwell = train.min_dwell_time
        
        # Adjust based on train type
        if train.train_type == "EXPRESS":
            return int(base_dwell * 0.7)
        elif train.train_type == "FREIGHT":
            return int(base_dwell * 1.5)
        elif train.train_type == "SUBURBAN":
            return int(base_dwell * 0.8)
        
        return base_dwell
    
    def _schedule_disruption(self, disruption: Dict[str, Any]):
        """Schedule a disruption event"""
        start_time = disruption.get('start_time')
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time)
        elif start_time is None:
            # Random time within simulation
            start_time = self.simulation_time + timedelta(seconds=random.randint(300, 1800))
        
        self.event_manager.schedule_event(
            time=start_time,
            event_type="DISRUPTION",
            data=disruption
        )
    
    def _log_current_metrics(self):
        """Log current simulation metrics"""
        metrics = {
            'time': self.simulation_time.isoformat(),
            'trains_running': len([t for t in self.trains.values() if t.status == "RUNNING"]),
            'trains_completed': len([t for t in self.trains.values() if t.status == "COMPLETED"]),
            'trains_delayed': len([t for t in self.trains.values() if t.total_delay > 5]),
            'average_delay': np.mean([t.total_delay for t in self.trains.values()]),
            'section_utilization': {
                s.id: s.current_occupancy / s.max_occupancy 
                for s in self.sections.values()
            }
        }
        self.metrics_log.append(metrics)
    
    def _calculate_scenario_metrics(self) -> Dict[str, Any]:
        """Calculate final scenario metrics"""
        trains = list(self.trains.values())
        
        if not trains:
            return {}
        
        # Delay metrics
        delays = [t.total_delay for t in trains if t.total_delay is not None]
        
        # Punctuality metrics
        on_time_trains = len([t for t in trains if t.total_delay <= 5])  # 5 minutes tolerance
        
        # Throughput metrics
        completed_trains = len([t for t in trains if t.status == "COMPLETED"])
        
        # Section utilization
        max_utilization = max([
            s.current_occupancy / s.max_occupancy 
            for s in self.sections.values()
        ]) if self.sections else 0
        
        avg_utilization = np.mean([
            s.current_occupancy / s.max_occupancy 
            for s in self.sections.values()
        ]) if self.sections else 0
        
        return {
            'total_trains': len(trains),
            'completed_trains': completed_trains,
            'completion_rate': completed_trains / len(trains) if trains else 0,
            'on_time_trains': on_time_trains,
            'punctuality_rate': on_time_trains / len(trains) if trains else 0,
            'average_delay': np.mean(delays) if delays else 0,
            'max_delay': max(delays) if delays else 0,
            'total_delay': sum(delays) if delays else 0,
            'delayed_trains': len([d for d in delays if d > 5]),
            'max_section_utilization': max_utilization,
            'average_section_utilization': avg_utilization,
            'events_count': len(self.events_log),
            'simulation_duration': (self.simulation_time - datetime.now()).total_seconds()
        }
    
    def _generate_scenario_summary(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Generate human-readable scenario summary"""
        completion_rate = metrics.get('completion_rate', 0)
        punctuality_rate = metrics.get('punctuality_rate', 0)
        avg_delay = metrics.get('average_delay', 0)
        
        # Determine overall performance
        if completion_rate > 0.95 and punctuality_rate > 0.9 and avg_delay < 3:
            performance = "EXCELLENT"
        elif completion_rate > 0.9 and punctuality_rate > 0.8 and avg_delay < 5:
            performance = "GOOD"
        elif completion_rate > 0.8 and punctuality_rate > 0.7 and avg_delay < 8:
            performance = "FAIR"
        else:
            performance = "POOR"
        
        return {
            'overall_performance': performance,
            'completion_rate_pct': round(completion_rate * 100, 1),
            'punctuality_rate_pct': round(punctuality_rate * 100, 1),
            'average_delay_min': round(avg_delay, 1),
            'trains_processed': metrics.get('total_trains', 0),
            'successful_completions': metrics.get('completed_trains', 0),
            'on_time_arrivals': metrics.get('on_time_trains', 0),
            'status': 'COMPLETED',
            'recommendations': self._generate_recommendations(metrics)
        }
    
    def _generate_recommendations(self, metrics: Dict[str, Any]) -> List[str]:
        """Generate improvement recommendations based on metrics"""
        recommendations = []
        
        completion_rate = metrics.get('completion_rate', 0)
        punctuality_rate = metrics.get('punctuality_rate', 0)
        avg_delay = metrics.get('average_delay', 0)
        max_utilization = metrics.get('max_section_utilization', 0)
        
        if completion_rate < 0.9:
            recommendations.append("Improve scheduling to increase train completion rate")
        
        if punctuality_rate < 0.8:
            recommendations.append("Review timetables to improve on-time performance")
        
        if avg_delay > 5:
            recommendations.append("Implement delay reduction strategies")
        
        if max_utilization > 0.9:
            recommendations.append("Consider capacity expansion for high-utilization sections")
        
        if not recommendations:
            recommendations.append("Performance is satisfactory - continue current operations")
        
        return recommendations

    def stop_simulation(self):
        """Stop the running simulation"""
        self.is_running = False
        logger.info("Simulation stopped by user request")