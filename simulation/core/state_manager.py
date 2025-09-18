from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timedelta
import logging
import json
from collections import defaultdict

from simulation.entities.train import SimulatedTrain
from simulation.entities.section import SimulatedSection

logger = logging.getLogger(__name__)

class StateManager:
    """Manages the overall state of the simulation"""
    
    def __init__(self):
        self.trains: Dict[int, SimulatedTrain] = {}
        self.sections: Dict[int, SimulatedSection] = {}
        self.global_time = datetime.now()
        self.state_history = []
        self.state_snapshots = {}
        
        # Performance tracking
        self.metrics = {
            'total_distance_traveled': 0.0,
            'total_energy_consumed': 0.0,
            'total_delays': 0.0,
            'completed_journeys': 0,
            'active_journeys': 0,
            'conflicts_resolved': 0,
            'average_speed': 0.0,
            'system_throughput': 0.0
        }
        
        # Conflict detection
        self.conflicts = []
        self.conflict_resolution_strategies = {}
        
        # State change tracking
        self.state_changes = []
        self.last_state_save = datetime.now()
        
    def add_train(self, train: SimulatedTrain):
        """Add a train to the simulation state"""
        self.trains[train.id] = train
        self.metrics['active_journeys'] += 1
        logger.debug(f"Added train {train.id} to state manager")
    
    def remove_train(self, train_id: int):
        """Remove a train from the simulation state"""
        if train_id in self.trains:
            train = self.trains[train_id]
            del self.trains[train_id]
            
            if train.status == "COMPLETED":
                self.metrics['completed_journeys'] += 1
            
            self.metrics['active_journeys'] = max(0, self.metrics['active_journeys'] - 1)
            logger.debug(f"Removed train {train_id} from state manager")
    
    def add_section(self, section: SimulatedSection):
        """Add a section to the simulation state"""
        self.sections[section.id] = section
        logger.debug(f"Added section {section.id} to state manager")
    
    def update_global_time(self, new_time: datetime):
        """Update the global simulation time"""
        old_time = self.global_time
        self.global_time = new_time
        
        # Log significant time jumps
        time_diff = (new_time - old_time).total_seconds()
        if time_diff > 60:  # More than 1 minute jump
            logger.debug(f"Time advanced by {time_diff:.1f} seconds to {new_time}")
    
    def get_train(self, train_id: int) -> Optional[SimulatedTrain]:
        """Get a train by ID"""
        return self.trains.get(train_id)
    
    def get_section(self, section_id: int) -> Optional[SimulatedSection]:
        """Get a section by ID"""
        return self.sections.get(section_id)
    
    def get_trains_in_section(self, section_id: int) -> List[SimulatedTrain]:
        """Get all trains currently in a specific section"""
        return [train for train in self.trains.values() if train.current_section_id == section_id]
    
    def detect_conflicts(self) -> List[Dict[str, Any]]:
        """Detect potential conflicts between trains"""
        conflicts = []
        
        # Check each section for potential conflicts
        for section in self.sections.values():
            section_trains = self.get_trains_in_section(section.id)
            
            if len(section_trains) > 1:
                # Multiple trains in same section - potential conflict
                for i, train1 in enumerate(section_trains):
                    for train2 in section_trains[i+1:]:
                        conflict = self._analyze_train_conflict(train1, train2, section)
                        if conflict:
                            conflicts.append(conflict)
        
        # Check for upcoming conflicts (trains approaching same section)
        self._detect_approaching_conflicts(conflicts)
        
        self.conflicts = conflicts
        return conflicts
    
    def _analyze_train_conflict(
        self, 
        train1: SimulatedTrain, 
        train2: SimulatedTrain, 
        section: SimulatedSection
    ) -> Optional[Dict[str, Any]]:
        """Analyze potential conflict between two trains"""
        
        # Calculate distance between trains
        distance = abs(train1.current_position - train2.current_position)
        
        # Calculate combined braking distance
        braking_distance1 = train1.get_braking_distance()
        braking_distance2 = train2.get_braking_distance()
        safe_distance = max(braking_distance1, braking_distance2) + 100  # 100m buffer
        
        if distance < safe_distance:
            # Determine conflict severity
            if distance < safe_distance * 0.5:
                severity = "HIGH"
            elif distance < safe_distance * 0.75:
                severity = "MEDIUM"
            else:
                severity = "LOW"
            
            return {
                'conflict_id': f"CONFLICT_{train1.id}_{train2.id}_{section.id}",
                'type': 'SAME_SECTION',
                'severity': severity,
                'train1_id': train1.id,
                'train2_id': train2.id,
                'section_id': section.id,
                'distance_apart': distance,
                'safe_distance_required': safe_distance,
                'time_to_conflict': self._estimate_time_to_conflict(train1, train2),
                'detected_at': self.global_time.isoformat()
            }
        
        return None
    
    def _detect_approaching_conflicts(self, conflicts: List[Dict[str, Any]]):
        """Detect conflicts between trains approaching the same section"""
        
        # Group trains by their next section
        trains_by_next_section = defaultdict(list)
        
        for train in self.trains.values():
            if train.status == "RUNNING" and hasattr(train, 'route') and train.route:
                if train.current_route_index + 1 < len(train.route):
                    next_section_id = train.route[train.current_route_index + 1]
                    trains_by_next_section[next_section_id].append(train)
        
        # Check for conflicts in each section
        for section_id, approaching_trains in trains_by_next_section.items():
            if len(approaching_trains) > 1:
                section = self.sections.get(section_id)
                if section and section.max_occupancy == 1:  # Single track section
                    
                    # Sort by estimated arrival time
                    approaching_trains.sort(
                        key=lambda t: self._estimate_arrival_time(t, section_id)
                    )
                    
                    for i, train in enumerate(approaching_trains[1:], 1):
                        prev_train = approaching_trains[i-1]
                        
                        # Estimate arrival times
                        prev_arrival = self._estimate_arrival_time(prev_train, section_id)
                        curr_arrival = self._estimate_arrival_time(train, section_id)
                        
                        # Check if arrivals are too close
                        time_gap = (curr_arrival - prev_arrival).total_seconds()
                        min_gap = 300  # 5 minutes minimum
                        
                        if time_gap < min_gap:
                            conflicts.append({
                                'conflict_id': f"APPROACH_{prev_train.id}_{train.id}_{section_id}",
                                'type': 'APPROACHING_CONFLICT',
                                'severity': 'MEDIUM' if time_gap < min_gap * 0.5 else 'LOW',
                                'train1_id': prev_train.id,
                                'train2_id': train.id,
                                'section_id': section_id,
                                'time_gap': time_gap,
                                'min_gap_required': min_gap,
                                'estimated_conflict_time': curr_arrival.isoformat(),
                                'detected_at': self.global_time.isoformat()
                            })
    
    def _estimate_arrival_time(self, train: SimulatedTrain, section_id: int) -> datetime:
        """Estimate when a train will arrive at a section"""
        section = self.sections.get(section_id)
        if not section:
            return self.global_time + timedelta(hours=1)  # Default fallback
        
        # Simple estimation based on current position and speed
        if train.current_section_id:
            current_section = self.sections.get(train.current_section_id)
            if current_section:
                remaining_distance = current_section.length - train.current_position
                
                if train.current_speed > 0:
                    time_to_exit = remaining_distance / (train.current_speed * 1000 / 3600)  # Convert km/h to m/s
                    return self.global_time + timedelta(seconds=time_to_exit)
        
        # Fallback estimation
        return self.global_time + timedelta(minutes=10)
    
    def _estimate_time_to_conflict(self, train1: SimulatedTrain, train2: SimulatedTrain) -> float:
        """Estimate time until trains would conflict (in seconds)"""
        # Simple estimation based on current speeds and positions
        relative_speed = abs(train1.current_speed - train2.current_speed)
        distance_gap = abs(train1.current_position - train2.current_position)
        
        if relative_speed > 0:
            return distance_gap / (relative_speed * 1000 / 3600)  # Convert km/h to m/s
        else:
            return float('inf')  # No relative movement
    
    def resolve_conflict(self, conflict_id: str, strategy: str, details: Dict[str, Any] = None):
        """Record conflict resolution"""
        resolution = {
            'conflict_id': conflict_id,
            'strategy': strategy,
            'details': details or {},
            'resolved_at': self.global_time.isoformat(),
            'resolution_time': datetime.now().isoformat()
        }
        
        self.conflict_resolution_strategies[conflict_id] = resolution
        self.metrics['conflicts_resolved'] += 1
        
        logger.info(f"Resolved conflict {conflict_id} using strategy: {strategy}")
    
    def update_metrics(self):
        """Update system performance metrics"""
        if not self.trains:
            return
        
        # Calculate current metrics
        running_trains = [t for t in self.trains.values() if t.status == "RUNNING"]
        completed_trains = [t for t in self.trains.values() if t.status == "COMPLETED"]
        
        # Average speed of running trains
        if running_trains:
            self.metrics['average_speed'] = sum(t.current_speed for t in running_trains) / len(running_trains)
        
        # Total delays
        total_delays = sum(t.total_delay for t in self.trains.values() if t.total_delay)
        self.metrics['total_delays'] = total_delays
        
        # Throughput (trains completed per hour)
        if completed_trains:
            # Calculate based on simulation time span
            time_span_hours = max(1, (self.global_time - min(t.actual_departure or self.global_time 
                                                           for t in completed_trains)).total_seconds() / 3600)
            self.metrics['system_throughput'] = len(completed_trains) / time_span_hours
        
        # Section utilization
        total_capacity = sum(s.max_occupancy for s in self.sections.values())
        current_occupancy = sum(s.current_occupancy for s in self.sections.values())
        
        if total_capacity > 0:
            self.metrics['capacity_utilization'] = current_occupancy / total_capacity
    
    def save_state_snapshot(self, label: str = None):
        """Save current state as a snapshot"""
        if label is None:
            label = f"snapshot_{self.global_time.strftime('%Y%m%d_%H%M%S')}"
        
        snapshot = {
            'timestamp': self.global_time.isoformat(),
            'label': label,
            'trains': {tid: train.to_dict() for tid, train in self.trains.items()},
            'sections': {sid: section.to_dict() for sid, section in self.sections.items()},
            'metrics': self.metrics.copy(),
            'conflicts': self.conflicts.copy(),
            'active_resolutions': len(self.conflict_resolution_strategies)
        }
        
        self.state_snapshots[label] = snapshot
        self.last_state_save = datetime.now()
        
        logger.info(f"Saved state snapshot: {label}")
        return label
    
    def restore_state_snapshot(self, label: str) -> bool:
        """Restore state from a saved snapshot"""
        if label not in self.state_snapshots:
            logger.error(f"Snapshot {label} not found")
            return False
        
        try:
            snapshot = self.state_snapshots[label]
            
            # Restore trains
            self.trains.clear()
            for train_data in snapshot['trains'].values():
                train = SimulatedTrain.from_dict(train_data)
                self.trains[train.id] = train
            
            # Restore sections
            self.sections.clear()
            for section_data in snapshot['sections'].values():
                section = SimulatedSection.from_dict(section_data)
                self.sections[section.id] = section
            
            # Restore metrics and other state
            self.metrics = snapshot['metrics'].copy()
            self.conflicts = snapshot['conflicts'].copy()
            self.global_time = datetime.fromisoformat(snapshot['timestamp'])
            
            logger.info(f"Restored state from snapshot: {label}")
            return True
            
        except Exception as e:
            logger.error(f"Error restoring snapshot {label}: {str(e)}")
            return False
    
    def get_state_summary(self) -> Dict[str, Any]:
        """Get a summary of the current simulation state"""
        return {
            'global_time': self.global_time.isoformat(),
            'total_trains': len(self.trains),
            'total_sections': len(self.sections),
            'trains_by_status': {
                status: len([t for t in self.trains.values() if t.status == status])
                for status in ['SCHEDULED', 'RUNNING', 'DELAYED', 'STOPPED', 'COMPLETED']
            },
            'section_utilization': {
                sid: {
                    'occupancy': section.current_occupancy,
                    'capacity': section.max_occupancy,
                    'utilization': section.get_capacity_utilization()
                }
                for sid, section in self.sections.items()
            },
            'active_conflicts': len(self.conflicts),
            'performance_metrics': self.metrics,
            'snapshots_available': list(self.state_snapshots.keys()),
            'last_update': datetime.now().isoformat()
        }
    
    def export_state(self, filepath: str):
        """Export current state to file"""
        try:
            state_data = {
                'export_timestamp': datetime.now().isoformat(),
                'simulation_time': self.global_time.isoformat(),
                'state_summary': self.get_state_summary(),
                'detailed_state': {
                    'trains': {tid: train.to_dict() for tid, train in self.trains.items()},
                    'sections': {sid: section.to_dict() for sid, section in self.sections.items()},
                    'metrics': self.metrics,
                    'conflicts': self.conflicts,
                    'conflict_resolutions': self.conflict_resolution_strategies
                }
            }
            
            with open(filepath, 'w') as f:
                json.dump(state_data, f, indent=2)
            
            logger.info(f"Exported state to {filepath}")
            
        except Exception as e:
            logger.error(f"Error exporting state: {str(e)}")
            raise