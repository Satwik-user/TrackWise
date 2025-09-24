"""
Real-time Railway Traffic Decision Support Solver
Optimized for section-level train precedence and crossing decisions
"""

from ortools.sat.python import cp_model
from typing import List, Dict, Any, Optional, Tuple
import logging
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)


class TrainEvent:
    """Represents a train event (arrival, departure, crossing)"""
    def __init__(self, train_id: str, event_type: str, section_id: str, 
                 scheduled_time: int, priority: int = 1, train_type: str = "PASSENGER"):
        self.train_id = train_id
        self.event_type = event_type  # 'ARRIVAL', 'DEPARTURE', 'CROSSING'
        self.section_id = section_id
        self.scheduled_time = scheduled_time  # minutes from now
        self.priority = priority  # 1=highest, 5=lowest
        self.train_type = train_type  # 'EXPRESS', 'PASSENGER', 'FREIGHT', 'SUBURBAN'
        self.actual_time = None
        self.delay = 0


class SectionConstraint:
    """Represents section-level constraints"""
    def __init__(self, section_id: str, max_capacity: int = 1, 
                 min_separation_minutes: int = 3, max_speed_kmh: int = 100):
        self.section_id = section_id
        self.max_capacity = max_capacity
        self.min_separation_minutes = min_separation_minutes
        self.max_speed_kmh = max_speed_kmh
        self.is_signal_clear = True
        self.maintenance_window = None


class TrafficDecisionSolver:
    """
    Real-time traffic decision solver for railway sections
    Optimizes train precedence and crossing decisions
    """
    
    def __init__(self, time_horizon_minutes: int = 60):
        self.time_horizon = time_horizon_minutes
        self.model = None
        self.solver = None
        self.variables = {}
        self.constraints = []
        
        # Priority weights for optimization
        self.priority_weights = {
            'EXPRESS': 10,
            'PASSENGER': 5, 
            'SUBURBAN': 3,
            'FREIGHT': 1
        }
        
        # Safety constraints
        self.min_headway_seconds = {
            'EXPRESS': 180,    # 3 minutes
            'PASSENGER': 120,  # 2 minutes  
            'SUBURBAN': 90,    # 1.5 minutes
            'FREIGHT': 300     # 5 minutes
        }
    
    def solve_traffic_decisions(
        self, 
        events: List[TrainEvent], 
        sections: List[SectionConstraint],
        disruptions: List[Dict] = None,
        timeout_seconds: int = 5
    ) -> Dict[str, Any]:
        """
        Main solver for real-time traffic decisions
        Returns precedence recommendations within timeout
        """
        start_time = datetime.utcnow()
        
        try:
            # Create CP model
            self.model = cp_model.CpModel()
            self.solver = cp_model.CpSolver()
            self.solver.parameters.max_time_in_seconds = timeout_seconds
            
            # Create decision variables
            print("Creating decision variables...")
            self._create_decision_variables(events, sections)
            
            # Add safety constraints
            print("Adding safety constraints...")
            self._add_safety_constraints(events, sections)
            
            # Add capacity constraints
            print("Adding capacity constraints...")
            self._add_capacity_constraints(events, sections)
            
            # Add precedence constraints
            print("Adding precedence constraints...")
            self._add_precedence_constraints(events)
            
            # Handle disruptions
            if disruptions:
                print("Adding disruption constraints...")
                self._add_disruption_constraints(events, disruptions)
            
            # Set objective (minimize total weighted delay)
            print("Setting objective...")
            self._set_optimization_objective(events)
            
            # Solve
            print("Solving...")
            status = self.solver.Solve(self.model)
            
            # Extract decisions
            print("Extracting decisions...")
            decisions = self._extract_decisions(events, sections, status)
            
            solving_time = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                "status": self._get_status_string(status),
                "solving_time_seconds": solving_time,
                "decisions": decisions,
                "recommendations": self._generate_recommendations(decisions, events),
                "kpis": self._calculate_kpis(decisions, events),
                "audit_info": {
                    "solver": "CP-SAT",
                    "constraints_count": len(self.constraints),
                    "variables_count": len(self.variables),
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Traffic decision solver failed: {e}")
            return {
                "status": "ERROR", 
                "error": str(e),
                "solving_time_seconds": (datetime.utcnow() - start_time).total_seconds(),
                "decisions": [],
                "recommendations": [],
                "kpis": {},
                "fallback_used": True
            }
    
    def _create_decision_variables(self, events: List[TrainEvent], sections: List[SectionConstraint]):
        """Create decision variables for train scheduling"""
        self.variables = {
            'event_time': {},      # When each event actually occurs
            'precedence': {},      # Which train goes first at conflicts
            'delay': {},           # Delay for each event
            'section_occupancy': {} # Section occupancy at each time
        }
        
        # Event timing variables
        for event in events:
            var_name = f"time_{event.train_id}_{event.event_type}_{event.section_id}"
            # Allow events to be scheduled from now to time_horizon
            self.variables['event_time'][event.train_id, event.section_id, event.event_type] = \
                self.model.NewIntVar(0, self.time_horizon, var_name)
            
            # Delay variables
            delay_var = f"delay_{event.train_id}_{event.section_id}"
            self.variables['delay'][event.train_id, event.section_id] = \
                self.model.NewIntVar(0, self.time_horizon, delay_var)
        
        # Precedence variables for conflicting events
        train_pairs = [(e1.train_id, e2.train_id) for e1 in events for e2 in events 
                      if e1.train_id != e2.train_id and e1.section_id == e2.section_id]
        
        for train1, train2 in train_pairs:
            for section in sections:
                prec_var = f"prec_{train1}_{train2}_{section.section_id}"
                self.variables['precedence'][train1, train2, section.section_id] = \
                    self.model.NewBoolVar(prec_var)
        
        # Section occupancy variables
        for section in sections:
            for t in range(0, self.time_horizon, 5):  # Check every 5 minutes
                occ_var = f"occ_{section.section_id}_{t}"
                self.variables['section_occupancy'][section.section_id, t] = \
                    self.model.NewIntVar(0, section.max_capacity, occ_var)
    
    def _add_safety_constraints(self, events: List[TrainEvent], sections: List[SectionConstraint]):
        """Add safety constraints (minimum separation, signal conflicts)"""
        
        # Minimum headway constraints
        for section in sections:
            section_events = [e for e in events if e.section_id == section.section_id]
            
            for i, event1 in enumerate(section_events):
                for event2 in section_events[i+1:]:
                    if event1.train_id != event2.train_id:
                        
                        # Minimum separation time based on train types
                        min_sep = max(
                            self.min_headway_seconds.get(event1.train_type, 120),
                            self.min_headway_seconds.get(event2.train_type, 120)
                        ) // 60  # Convert to minutes
                        
                        # Get timing variables
                        time1 = self.variables['event_time'].get((event1.train_id, event1.section_id, event1.event_type))
                        time2 = self.variables['event_time'].get((event2.train_id, event2.section_id, event2.event_type))
                        
                        if time1 and time2:
                            # Either train1 precedes train2 by min_sep OR train2 precedes train1 by min_sep
                            prec_var = self.variables['precedence'].get((event1.train_id, event2.train_id, section.section_id))
                            
                            if prec_var:
                                # If train1 precedes train2
                                self.model.Add(time2 >= time1 + min_sep).OnlyEnforceIf(prec_var)
                                # If train2 precedes train1
                                self.model.Add(time1 >= time2 + min_sep).OnlyEnforceIf(prec_var.Not())
                                
                                self.constraints.append(f"Safety separation: {event1.train_id} vs {event2.train_id}")
        
        # Signal constraints (only one train per section for single-track sections)
        for section in sections:
            if section.max_capacity == 1:  # Single track
                section_events = [e for e in events if e.section_id == section.section_id]
                
                # At most one train in section at any time
                for t in range(0, self.time_horizon, 5):
                    trains_in_section = []
                    for event in section_events:
                        time_var = self.variables['event_time'].get((event.train_id, event.section_id, event.event_type))
                        if time_var and event.event_type in ['ARRIVAL', 'CROSSING']:
                            # Create a boolean variable for whether train is in section at time t
                            in_section = self.model.NewBoolVar(f"in_section_{event.train_id}_{section.section_id}_{t}")
                            
                            # Train is in section if arrival/crossing time <= t < arrival_time + duration
                            self.model.Add(time_var <= t + 1).OnlyEnforceIf(in_section)
                            self.model.Add(time_var + 10 > t).OnlyEnforceIf(in_section)  # Assume 10 min transit time
                            
                            # If not in section, the constraints don't apply
                            self.model.Add(time_var > t + 1).OnlyEnforceIf(in_section.Not())
                            self.model.Add(time_var + 10 <= t).OnlyEnforceIf(in_section.Not())
                            
                            trains_in_section.append(in_section)
                    
                    if trains_in_section:
                        self.model.Add(sum(trains_in_section) <= 1)
                        self.constraints.append(f"Single track constraint: {section.section_id} at time {t}")
    
    def _add_capacity_constraints(self, events: List[TrainEvent], sections: List[SectionConstraint]):
        """Add section capacity constraints"""
        for section in sections:
            section_events = [e for e in events if e.section_id == section.section_id]
            
            # Track section occupancy over time
            for t in range(0, self.time_horizon, 5):
                occupancy_contributors = []
                
                for event in section_events:
                    time_var = self.variables['event_time'].get((event.train_id, event.section_id, event.event_type))
                    if time_var:
                        # Train contributes to occupancy if it's currently in the section
                        contributing = self.model.NewBoolVar(f"contrib_{event.train_id}_{section.section_id}_{t}")
                        
                        if event.event_type == 'ARRIVAL':
                            # In section from arrival time
                            self.model.Add(time_var <= t + 1).OnlyEnforceIf(contributing)
                            self.model.Add(time_var + 15 > t).OnlyEnforceIf(contributing)  # Assume avg 15 min in section
                            
                            # Not contributing if outside time window
                            self.model.Add(time_var > t + 1).OnlyEnforceIf(contributing.Not())
                            self.model.Add(time_var + 15 <= t).OnlyEnforceIf(contributing.Not())
                            
                        elif event.event_type == 'CROSSING':
                            # In section briefly during crossing
                            self.model.Add(time_var <= t + 1).OnlyEnforceIf(contributing)
                            self.model.Add(time_var + 5 > t).OnlyEnforceIf(contributing)
                            
                            # Not contributing if outside time window  
                            self.model.Add(time_var > t + 1).OnlyEnforceIf(contributing.Not())
                            self.model.Add(time_var + 5 <= t).OnlyEnforceIf(contributing.Not())
                        
                        occupancy_contributors.append(contributing)
                
                # Capacity constraint
                if occupancy_contributors:
                    occupancy_var = self.variables['section_occupancy'].get((section.section_id, t))
                    if occupancy_var:
                        self.model.Add(occupancy_var == sum(occupancy_contributors))
                        self.model.Add(occupancy_var <= section.max_capacity)
                        self.constraints.append(f"Capacity constraint: {section.section_id} at time {t}")
    
    def _add_precedence_constraints(self, events: List[TrainEvent]):
        """Add precedence constraints based on priorities"""
        
        # Group events by section
        section_events = {}
        for event in events:
            if event.section_id not in section_events:
                section_events[event.section_id] = []
            section_events[event.section_id].append(event)
        
        # Add priority-based precedence constraints
        for section_id, sec_events in section_events.items():
            for i, event1 in enumerate(sec_events):
                for event2 in sec_events[i+1:]:
                    if event1.train_id != event2.train_id:
                        
                        # Higher priority trains should be scheduled first
                        priority1 = self.priority_weights.get(event1.train_type, 1)
                        priority2 = self.priority_weights.get(event2.train_type, 1)
                        
                        if priority1 > priority2:
                            # event1 should precede event2
                            prec_var = self.variables['precedence'].get((event1.train_id, event2.train_id, section_id))
                            if prec_var:
                                self.model.AddHint(prec_var, 1)  # Hint that event1 should precede
                        elif priority2 > priority1:
                            # event2 should precede event1
                            prec_var = self.variables['precedence'].get((event1.train_id, event2.train_id, section_id))
                            if prec_var:
                                self.model.AddHint(prec_var, 0)  # Hint that event2 should precede
    
    def _add_disruption_constraints(self, events: List[TrainEvent], disruptions: List[Dict]):
        """Add constraints for handling disruptions"""
        for disruption in disruptions:
            disruption_type = disruption.get('type', 'DELAY')
            affected_section = disruption.get('section_id')
            start_time = disruption.get('start_time', 0)
            duration = disruption.get('duration_minutes', 10)
            
            if disruption_type == 'SIGNAL_FAILURE':
                # No trains can enter affected section during disruption
                affected_events = [e for e in events if e.section_id == affected_section]
                for event in affected_events:
                    time_var = self.variables['event_time'].get((event.train_id, event.section_id, event.event_type))
                    if time_var:
                        # Event cannot occur during disruption window
                        # Create boolean variables for before and after disruption
                        before_disruption = self.model.NewBoolVar(f"before_{event.train_id}_{event.section_id}")
                        after_disruption = self.model.NewBoolVar(f"after_{event.train_id}_{event.section_id}")
                        
                        # Exactly one must be true
                        self.model.AddExactlyOne([before_disruption, after_disruption])
                        
                        # If before disruption
                        self.model.Add(time_var < start_time).OnlyEnforceIf(before_disruption)
                        # If after disruption
                        self.model.Add(time_var >= start_time + duration).OnlyEnforceIf(after_disruption)
                        self.constraints.append(f"Disruption constraint: {disruption_type} on {affected_section}")
            
            elif disruption_type == 'TRAIN_DELAY':
                # Specific train has additional delay
                affected_train = disruption.get('train_id')
                additional_delay = disruption.get('additional_delay_minutes', 0)
                
                for event in events:
                    if event.train_id == affected_train:
                        time_var = self.variables['event_time'].get((event.train_id, event.section_id, event.event_type))
                        if time_var:
                            # Add minimum delay to scheduled time
                            self.model.Add(time_var >= event.scheduled_time + additional_delay)
                            self.constraints.append(f"Train delay: {affected_train} +{additional_delay}min")
    
    def _set_optimization_objective(self, events: List[TrainEvent]):
        """Set optimization objective to minimize weighted total delay"""
        objective_terms = []
        
        for event in events:
            delay_var = self.variables['delay'].get((event.train_id, event.section_id))
            time_var = self.variables['event_time'].get((event.train_id, event.section_id, event.event_type))
            
            if delay_var and time_var:
                # Calculate delay as difference between actual and scheduled time
                self.model.Add(delay_var == time_var - event.scheduled_time)
                
                # Weight delay by train priority
                weight = self.priority_weights.get(event.train_type, 1)
                objective_terms.append(weight * delay_var)
        
        if objective_terms:
            self.model.Minimize(sum(objective_terms))
    
    def _extract_decisions(self, events: List[TrainEvent], sections: List[SectionConstraint], status) -> List[Dict]:
        """Extract decisions from solved model"""
        decisions = []
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            for event in events:
                time_var = self.variables['event_time'].get((event.train_id, event.section_id, event.event_type))
                delay_var = self.variables['delay'].get((event.train_id, event.section_id))
                
                if time_var and delay_var:
                    actual_time = self.solver.Value(time_var)
                    delay = self.solver.Value(delay_var)
                    
                    decisions.append({
                        "train_id": event.train_id,
                        "event_type": event.event_type,
                        "section_id": event.section_id,
                        "scheduled_time": event.scheduled_time,
                        "recommended_time": actual_time,
                        "delay_minutes": delay,
                        "priority": event.priority,
                        "train_type": event.train_type
                    })
        
        return sorted(decisions, key=lambda x: x['recommended_time'])
    
    def _generate_recommendations(self, decisions: List[Dict], events: List[TrainEvent]) -> List[Dict]:
        """Generate human-readable recommendations for controllers"""
        recommendations = []
        
        for decision in decisions:
            if decision['delay_minutes'] == 0:
                action = "PROCEED_AS_SCHEDULED"
                reason = "No conflicts detected, proceed as planned"
            elif decision['delay_minutes'] <= 5:
                action = "MINOR_DELAY"
                reason = f"Delay {decision['delay_minutes']} minutes to optimize traffic flow"
            else:
                action = "MAJOR_DELAY" 
                reason = f"Delay {decision['delay_minutes']} minutes due to capacity/safety constraints"
            
            recommendations.append({
                "train_id": decision['train_id'],
                "section_id": decision['section_id'],
                "action": action,
                "reason": reason,
                "recommended_time": decision['recommended_time'],
                "delay_minutes": decision['delay_minutes'],
                "confidence": "HIGH" if decision['delay_minutes'] <= 5 else "MEDIUM"
            })
        
        return recommendations
    
    def _calculate_kpis(self, decisions: List[Dict], events: List[TrainEvent]) -> Dict[str, float]:
        """Calculate key performance indicators"""
        if not decisions:
            return {}
        
        total_delay = sum(d['delay_minutes'] for d in decisions)
        avg_delay = total_delay / len(decisions) if decisions else 0
        on_time_performance = len([d for d in decisions if d['delay_minutes'] <= 2]) / len(decisions)
        
        # Calculate throughput (trains per hour)
        time_span = max(d['recommended_time'] for d in decisions) - min(d['recommended_time'] for d in decisions)
        throughput = len(decisions) / (time_span / 60) if time_span > 0 else 0
        
        return {
            "total_delay_minutes": total_delay,
            "average_delay_minutes": round(avg_delay, 2),
            "on_time_performance": round(on_time_performance * 100, 1),
            "throughput_trains_per_hour": round(throughput, 1),
            "decisions_count": len(decisions)
        }
    
    def _get_status_string(self, status) -> str:
        """Convert CP solver status to string"""
        if status == cp_model.OPTIMAL:
            return "OPTIMAL"
        elif status == cp_model.FEASIBLE:
            return "FEASIBLE"
        elif status == cp_model.INFEASIBLE:
            return "INFEASIBLE"
        elif status == cp_model.MODEL_INVALID:
            return "INVALID"
        else:
            return "UNKNOWN"


# Example usage for testing
def create_sample_scenario():
    """Create a sample traffic scenario for testing"""
    
    # Sample events
    events = [
        TrainEvent("TRN001", "ARRIVAL", "SEC001", 5, 1, "EXPRESS"),
        TrainEvent("TRN002", "CROSSING", "SEC001", 7, 2, "PASSENGER"),
        TrainEvent("TRN003", "DEPARTURE", "SEC001", 12, 3, "FREIGHT"),
        TrainEvent("TRN001", "DEPARTURE", "SEC001", 20, 1, "EXPRESS"),
        TrainEvent("TRN004", "ARRIVAL", "SEC002", 15, 2, "SUBURBAN"),
    ]
    
    # Sample sections
    sections = [
        SectionConstraint("SEC001", max_capacity=1, min_separation_minutes=3),
        SectionConstraint("SEC002", max_capacity=2, min_separation_minutes=2),
    ]
    
    # Sample disruption
    disruptions = [
        {
            "type": "SIGNAL_FAILURE",
            "section_id": "SEC001", 
            "start_time": 10,
            "duration_minutes": 5
        }
    ]
    
    return events, sections, disruptions


if __name__ == "__main__":
    # Test the solver
    solver = TrafficDecisionSolver(time_horizon_minutes=60)
    events, sections, disruptions = create_sample_scenario()
    
    result = solver.solve_traffic_decisions(events, sections, disruptions, timeout_seconds=10)
    
    print("=== TRAFFIC DECISION RESULTS ===")
    print(f"Status: {result['status']}")
    print(f"Solving time: {result['solving_time_seconds']:.2f}s")
    print(f"KPIs: {result['kpis']}")
    print("\nRecommendations:")
    for rec in result['recommendations']:
        print(f"  {rec['train_id']} in {rec['section_id']}: {rec['action']} - {rec['reason']}")