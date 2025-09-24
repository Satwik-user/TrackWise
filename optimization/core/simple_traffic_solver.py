"""
Simplified Real-time Railway Traffic Decision Support Solver
Fixed version with proper CP-SAT constraints
"""

from ortools.sat.python import cp_model
from typing import List, Dict, Any, Optional, Tuple
import logging
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)


class SimpleTrafficDecisionSolver:
    """
    Simplified real-time traffic decision solver for railway sections
    Focuses on train precedence decisions with basic constraints
    """
    
    def __init__(self, time_horizon_minutes: int = 60):
        self.time_horizon = time_horizon_minutes
        self.model = None
        self.solver = None
        self.variables = {}
        
        # Priority weights for optimization
        self.priority_weights = {
            'EXPRESS': 10,
            'PASSENGER': 5, 
            'SUBURBAN': 3,
            'FREIGHT': 1
        }
    
    def solve_traffic_decisions(
        self, 
        events_data: List[Dict], 
        timeout_seconds: int = 5
    ) -> Dict[str, Any]:
        """
        Main solver for real-time traffic decisions
        """
        start_time = datetime.now()
        
        try:
            # Create CP model
            self.model = cp_model.CpModel()
            self.solver = cp_model.CpSolver()
            self.solver.parameters.max_time_in_seconds = timeout_seconds
            
            # Process events
            events = []
            for event_data in events_data:
                events.append({
                    'train_id': event_data.get('train_id', 'UNKNOWN'),
                    'section_id': event_data.get('section_id', 'SEC001'),
                    'scheduled_time': event_data.get('scheduled_time', 0),
                    'train_type': event_data.get('train_type', 'PASSENGER'),
                    'priority': event_data.get('priority', 3)
                })
            
            # Create variables
            self._create_simple_variables(events)
            
            # Add basic constraints
            self._add_basic_constraints(events)
            
            # Set objective
            self._set_simple_objective(events)
            
            # Solve
            status = self.solver.Solve(self.model)
            
            # Extract results
            decisions = self._extract_simple_decisions(events, status)
            
            solving_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "status": self._get_status_string(status),
                "solving_time_seconds": solving_time,
                "decisions": decisions,
                "recommendations": self._generate_simple_recommendations(decisions),
                "kpis": self._calculate_simple_kpis(decisions),
                "audit_info": {
                    "solver": "CP-SAT-Simple",
                    "variables_count": len(self.variables),
                    "timestamp": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Traffic decision solver failed: {e}")
            import traceback
            traceback.print_exc()
            return {
                "status": "ERROR", 
                "error": str(e),
                "solving_time_seconds": (datetime.now() - start_time).total_seconds(),
                "decisions": [],
                "recommendations": [],
                "kpis": {},
                "fallback_used": True
            }
    
    def _create_simple_variables(self, events):
        """Create simple decision variables"""
        self.variables = {
            'actual_time': {},
            'delay': {},
            'precedence': {}
        }
        
        # Actual timing variables for each event
        for i, event in enumerate(events):
            # Actual time when event occurs (in minutes from now)
            self.variables['actual_time'][i] = self.model.NewIntVar(
                0, self.time_horizon, f"time_{event['train_id']}_{i}"
            )
            
            # Delay variable (non-negative)
            self.variables['delay'][i] = self.model.NewIntVar(
                0, self.time_horizon, f"delay_{event['train_id']}_{i}"
            )
            
            # Link actual time to scheduled time + delay
            self.model.Add(
                self.variables['actual_time'][i] == 
                event['scheduled_time'] + self.variables['delay'][i]
            )
        
        # Precedence variables for events in same section
        for i, event1 in enumerate(events):
            for j, event2 in enumerate(events):
                if i < j and event1['section_id'] == event2['section_id']:
                    # Binary variable: does event i precede event j?
                    self.variables['precedence'][i, j] = self.model.NewBoolVar(
                        f"prec_{i}_{j}"
                    )
    
    def _add_basic_constraints(self, events):
        """Add basic safety and ordering constraints"""
        
        # Minimum separation between trains in same section
        min_separation = 3  # 3 minutes minimum
        
        for i, event1 in enumerate(events):
            for j, event2 in enumerate(events):
                if i < j and event1['section_id'] == event2['section_id']:
                    prec_var = self.variables['precedence'][i, j]
                    time1 = self.variables['actual_time'][i]
                    time2 = self.variables['actual_time'][j]
                    
                    # If event i precedes event j
                    self.model.Add(time2 >= time1 + min_separation).OnlyEnforceIf(prec_var)
                    # If event j precedes event i
                    self.model.Add(time1 >= time2 + min_separation).OnlyEnforceIf(prec_var.Not())
        
        # Priority hints - higher priority trains should go first
        for i, event1 in enumerate(events):
            for j, event2 in enumerate(events):
                if i < j and event1['section_id'] == event2['section_id']:
                    priority1 = self.priority_weights.get(event1['train_type'], 1)
                    priority2 = self.priority_weights.get(event2['train_type'], 1)
                    
                    prec_var = self.variables['precedence'][i, j]
                    
                    if priority1 > priority2:
                        # Hint that higher priority event should go first
                        self.model.AddHint(prec_var, 1)
                    elif priority2 > priority1:
                        self.model.AddHint(prec_var, 0)
    
    def _set_simple_objective(self, events):
        """Set objective to minimize weighted delays"""
        objective_terms = []
        
        for i, event in enumerate(events):
            delay_var = self.variables['delay'][i]
            weight = self.priority_weights.get(event['train_type'], 1)
            objective_terms.append(weight * delay_var)
        
        if objective_terms:
            self.model.Minimize(sum(objective_terms))
    
    def _extract_simple_decisions(self, events, status):
        """Extract decisions from solved model"""
        decisions = []
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            for i, event in enumerate(events):
                actual_time = self.solver.Value(self.variables['actual_time'][i])
                delay = self.solver.Value(self.variables['delay'][i])
                
                decisions.append({
                    "train_id": event['train_id'],
                    "section_id": event['section_id'],
                    "scheduled_time": event['scheduled_time'],
                    "recommended_time": actual_time,
                    "delay_minutes": delay,
                    "train_type": event['train_type'],
                    "priority": event['priority']
                })
        
        return sorted(decisions, key=lambda x: x['recommended_time'])
    
    def _generate_simple_recommendations(self, decisions):
        """Generate controller recommendations"""
        recommendations = []
        
        for decision in decisions:
            if decision['delay_minutes'] == 0:
                action = "PROCEED_AS_SCHEDULED"
                reason = "No conflicts detected, proceed as planned"
                confidence = "HIGH"
            elif decision['delay_minutes'] <= 5:
                action = "MINOR_DELAY"
                reason = f"Delay {decision['delay_minutes']} min to optimize traffic flow"
                confidence = "HIGH"
            else:
                action = "MAJOR_DELAY" 
                reason = f"Delay {decision['delay_minutes']} min for safety/capacity"
                confidence = "MEDIUM"
            
            recommendations.append({
                "train_id": decision['train_id'],
                "section_id": decision['section_id'],
                "action": action,
                "reason": reason,
                "recommended_time": decision['recommended_time'],
                "delay_minutes": decision['delay_minutes'],
                "confidence": confidence,
                "explanation": f"Train {decision['train_id']} ({decision['train_type']}) should {action.lower().replace('_', ' ')} - {reason}"
            })
        
        return recommendations
    
    def _calculate_simple_kpis(self, decisions):
        """Calculate KPIs"""
        if not decisions:
            return {
                "total_delay_minutes": 0,
                "average_delay_minutes": 0,
                "on_time_performance": 100,
                "decisions_count": 0
            }
        
        total_delay = sum(d['delay_minutes'] for d in decisions)
        avg_delay = total_delay / len(decisions)
        on_time = len([d for d in decisions if d['delay_minutes'] <= 2]) / len(decisions)
        
        return {
            "total_delay_minutes": total_delay,
            "average_delay_minutes": round(avg_delay, 2),
            "on_time_performance": round(on_time * 100, 1),
            "decisions_count": len(decisions),
            "max_delay_minutes": max(d['delay_minutes'] for d in decisions) if decisions else 0
        }
    
    def _get_status_string(self, status):
        """Convert CP solver status to string"""
        if status == cp_model.OPTIMAL:
            return "OPTIMAL"
        elif status == cp_model.FEASIBLE:
            return "FEASIBLE"
        elif status == cp_model.INFEASIBLE:
            return "INFEASIBLE"
        else:
            return "UNKNOWN"


def create_test_scenario():
    """Create test scenario for the simplified solver"""
    events = [
        {
            'train_id': 'TRN001',
            'section_id': 'SEC001',
            'scheduled_time': 5,
            'train_type': 'EXPRESS',
            'priority': 1
        },
        {
            'train_id': 'TRN002', 
            'section_id': 'SEC001',
            'scheduled_time': 7,
            'train_type': 'PASSENGER',
            'priority': 2
        },
        {
            'train_id': 'TRN003',
            'section_id': 'SEC001', 
            'scheduled_time': 10,
            'train_type': 'FREIGHT',
            'priority': 4
        },
        {
            'train_id': 'TRN004',
            'section_id': 'SEC002',
            'scheduled_time': 8,
            'train_type': 'SUBURBAN',
            'priority': 3
        }
    ]
    
    return events


if __name__ == "__main__":
    # Test the simplified solver
    solver = SimpleTrafficDecisionSolver(time_horizon_minutes=60)
    events = create_test_scenario()
    
    result = solver.solve_traffic_decisions(events, timeout_seconds=10)
    
    print("=== TRAFFIC DECISION RESULTS ===")
    print(f"Status: {result['status']}")
    print(f"Solving time: {result['solving_time_seconds']:.2f}s")
    print(f"KPIs: {result['kpis']}")
    print("\nDecisions:")
    for decision in result['decisions']:
        print(f"  {decision['train_id']}: Schedule {decision['scheduled_time']}min → Recommended {decision['recommended_time']}min (Delay: {decision['delay_minutes']}min)")
    print("\nRecommendations:")
    for rec in result['recommendations']:
        print(f"  {rec['explanation']}")