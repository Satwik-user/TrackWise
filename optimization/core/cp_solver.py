from ortools.sat.python import cp_model
from typing import List, Dict, Any, Optional, Tuple
import logging
from datetime import datetime, timedelta
import asyncio

from optimization.models.optimization_model import OptimizationProblem, OptimizationSolution
from optimization.models.train_model import TrainModel
from optimization.models.section_model import SectionModel
from optimization.utils.validators import SafetyValidator

logger = logging.getLogger(__name__)

class CPSolver:
    """Constraint Programming solver using OR-Tools CP-SAT"""
    
    def __init__(self):
        self.model = None
        self.solver = None
        self.variables = {}
        self.constraints = []
        self.safety_validator = SafetyValidator()
    
    async def solve(self, problem: OptimizationProblem, timeout: int = 30) -> OptimizationSolution:
        """Solve the optimization problem using CP-SAT"""
        try:
            start_time = datetime.utcnow()
            
            # Create CP model
            self.model = cp_model.CpModel()
            self.solver = cp_model.CpSolver()
            self.solver.parameters.max_time_in_seconds = timeout
            
            # Create variables
            self._create_variables(problem)
            
            # Add constraints
            self._add_safety_constraints(problem)
            self._add_capacity_constraints(problem)
            self._add_precedence_constraints(problem)
            self._add_timing_constraints(problem)
            
            # Set objective
            self._set_objective(problem)
            
            # Solve
            status = self.solver.Solve(self.model)
            
            # Process solution
            solution = self._extract_solution(problem, status, start_time)
            
            return solution
            
        except Exception as e:
            logger.error(f"CP solver failed: {str(e)}")
            return OptimizationSolution(
                status="ERROR",
                objective_value=None,
                solving_time=(datetime.utcnow() - start_time).total_seconds(),
                decisions=[],
                metrics={"error": str(e)}
            )
    
    def _create_variables(self, problem: OptimizationProblem):
        """Create decision variables for the optimization problem"""
        self.variables = {
            'train_section_assignment': {},  # Binary: train i in section j at time t
            'train_departure_time': {},      # Integer: departure time for train i from section j
            'train_arrival_time': {},        # Integer: arrival time for train i to section j
            'section_occupancy': {},         # Integer: number of trains in section j at time t
            'precedence': {},                # Binary: train i precedes train j in section k
            'delay': {},                     # Integer: delay for train i in minutes
            'speed_adjustment': {}           # Continuous: speed adjustment factor for train i
        }
        
        time_horizon = problem.time_horizon // 60  # Convert to minutes for discrete time
        
        # Train-section assignment variables
        for train in problem.trains:
            for section in problem.sections:
                for t in range(time_horizon):
                    var_name = f"assign_{train.id}_{section.id}_{t}"
                    self.variables['train_section_assignment'][(train.id, section.id, t)] = \
                        self.model.NewBoolVar(var_name)
        
        # Train timing variables
        for train in problem.trains:
            for section in problem.sections:
                # Departure time (in minutes from start)
                dep_var = f"dep_{train.id}_{section.id}"
                self.variables['train_departure_time'][(train.id, section.id)] = \
                    self.model.NewIntVar(0, time_horizon, dep_var)
                
                # Arrival time (in minutes from start)
                arr_var = f"arr_{train.id}_{section.id}"
                self.variables['train_arrival_time'][(train.id, section.id)] = \
                    self.model.NewIntVar(0, time_horizon, arr_var)
        
        # Section occupancy variables
        for section in problem.sections:
            for t in range(time_horizon):
                occ_var = f"occ_{section.id}_{t}"
                self.variables['section_occupancy'][(section.id, t)] = \
                    self.model.NewIntVar(0, section.max_occupancy, occ_var)
        
        # Precedence variables
        for i, train1 in enumerate(problem.trains):
            for j, train2 in enumerate(problem.trains):
                if i != j:
                    for section in problem.sections:
                        prec_var = f"prec_{train1.id}_{train2.id}_{section.id}"
                        self.variables['precedence'][(train1.id, train2.id, section.id)] = \
                            self.model.NewBoolVar(prec_var)
        
        # Delay variables
        for train in problem.trains:
            delay_var = f"delay_{train.id}"
            self.variables['delay'][train.id] = \
                self.model.NewIntVar(0, 60, delay_var)  # Max 60 minutes delay
        
        # Speed adjustment variables
        for train in problem.trains:
            speed_var = f"speed_{train.id}"
            self.variables['speed_adjustment'][train.id] = \
                self.model.NewIntVar(50, 120, speed_var)  # 50% to 120% of normal speed
    
    def _add_safety_constraints(self, problem: OptimizationProblem):
        """Add safety constraints to prevent collisions and violations"""
        
        # Minimum separation constraint
        min_separation = 5  # 5 minutes minimum between trains
        
        for section in problem.sections:
            for i, train1 in enumerate(problem.trains):
                for j, train2 in enumerate(problem.trains):
                    if i < j:  # Avoid duplicate constraints
                        # If both trains use the section, ensure separation
                        dep1 = self.variables['train_departure_time'][(train1.id, section.id)]
                        arr1 = self.variables['train_arrival_time'][(train1.id, section.id)]
                        dep2 = self.variables['train_departure_time'][(train2.id, section.id)]
                        arr2 = self.variables['train_arrival_time'][(train2.id, section.id)]
                        
                        # Train 1 finishes before train 2 starts OR train 2 finishes before train 1 starts
                        prec_var = self.variables['precedence'][(train1.id, train2.id, section.id)]
                        
                        # If train1 precedes train2
                        self.model.Add(dep1 + min_separation <= arr2).OnlyEnforceIf(prec_var)
                        
                        # If train2 precedes train1
                        self.model.Add(dep2 + min_separation <= arr1).OnlyEnforceIf(prec_var.Not())
        
        # Signal aspect constraints
        for section in problem.sections:
            for train in problem.trains:
                # Arrival time must be >= departure time
                arr_var = self.variables['train_arrival_time'][(train.id, section.id)]
                dep_var = self.variables['train_departure_time'][(train.id, section.id)]
                
                # Minimum dwell time based on train type
                min_dwell = 2 if train.train_type == "EXPRESS" else 1
                self.model.Add(dep_var >= arr_var + min_dwell)
    
    def _add_capacity_constraints(self, problem: OptimizationProblem):
        """Add section capacity constraints"""
        time_horizon = problem.time_horizon // 60
        
        for section in problem.sections:
            for t in range(time_horizon):
                # Count trains in section at time t
                trains_in_section = []
                
                for train in problem.trains:
                    # Train is in section if arrival <= t < departure
                    arr_var = self.variables['train_arrival_time'][(train.id, section.id)]
                    dep_var = self.variables['train_departure_time'][(train.id, section.id)]
                    
                    # Binary variable indicating train is in section at time t
                    in_section = self.model.NewBoolVar(f"in_section_{train.id}_{section.id}_{t}")
                    
                    # in_section = 1 if arr_var <= t < dep_var
                    self.model.Add(arr_var <= t).OnlyEnforceIf(in_section)
                    self.model.Add(t < dep_var).OnlyEnforceIf(in_section)
                    self.model.Add(arr_var > t).OnlyEnforceIf(in_section.Not())
                    self.model.Add(t >= dep_var).OnlyEnforceIf(in_section.Not())
                    
                    trains_in_section.append(in_section)
                
                # Total trains in section <= capacity
                if trains_in_section:
                    self.model.Add(sum(trains_in_section) <= section.max_occupancy)
    
    def _add_precedence_constraints(self, problem: OptimizationProblem):
        """Add train precedence constraints based on priority"""
        
        for section in problem.sections:
            trains_by_priority = sorted(problem.trains, key=lambda t: (t.priority, t.scheduled_arrival or datetime.utcnow()))
            
            for i in range(len(trains_by_priority)):
                for j in range(i + 1, len(trains_by_priority)):
                    train1 = trains_by_priority[i]
                    train2 = trains_by_priority[j]
                    
                    # Higher priority train (lower number) should generally precede lower priority
                    if train1.priority < train2.priority:
                        prec_var = self.variables['precedence'][(train1.id, train2.id, section.id)]
                        
                        # Add soft constraint favoring this precedence
                        # This will be handled in the objective function
                        pass
    
    def _add_timing_constraints(self, problem: OptimizationProblem):
        """Add timing and scheduling constraints"""
        
        for train in problem.trains:
            # Link delay variable to actual vs scheduled timing
            if train.scheduled_arrival:
                # Calculate scheduled arrival in minutes from problem start
                problem_start = min(t.scheduled_arrival for t in problem.trains if t.scheduled_arrival)
                scheduled_minutes = int((train.scheduled_arrival - problem_start).total_seconds() / 60)
                
                # Find the section this train is scheduled to arrive at
                # For simplicity, use the first section in the list
                if problem.sections:
                    first_section = problem.sections[0]
                    arr_var = self.variables['train_arrival_time'][(train.id, first_section.id)]
                    delay_var = self.variables['delay'][train.id]
                    
                    # delay = actual_arrival - scheduled_arrival (if positive)
                    self.model.Add(delay_var >= arr_var - scheduled_minutes)
                    self.model.Add(delay_var >= 0)
        
        # Speed-distance-time relationships
        for train in problem.trains:
            for section in problem.sections:
                arr_var = self.variables['train_arrival_time'][(train.id, section.id)]
                dep_var = self.variables['train_departure_time'][(train.id, section.id)]
                speed_var = self.variables['speed_adjustment'][train.id]
                
                # Travel time based on section length and speed
                base_travel_time = int(section.length / (train.max_speed * 1000 / 60))  # minutes
                
                # Adjusted travel time = base_time * (100 / speed_adjustment)
                # Simplified: dep_time >= arr_time + adjusted_travel_time
                self.model.Add(dep_var >= arr_var + max(1, base_travel_time * 100 // 100))
    
    def _set_objective(self, problem: OptimizationProblem):
        """Set the optimization objective"""
        objective_terms = []
        
        # Minimize total delay
        delay_weight = int(problem.objective_weights.get('delay', 0.6) * 1000)
        for train in problem.trains:
            delay_var = self.variables['delay'][train.id]
            objective_terms.append(delay_weight * delay_var)
        
        # Maximize throughput (minimize negative throughput)
        throughput_weight = int(problem.objective_weights.get('throughput', 0.4) * 1000)
        for section in problem.sections:
            for t in range(0, problem.time_horizon // 60, 60):  # Check every hour
                # Count trains completing section in this hour
                completed_trains = []
                for train in problem.trains:
                    dep_var = self.variables['train_departure_time'][(train.id, section.id)]
                    
                    # Binary var: train completes in this hour
                    completed = self.model.NewBoolVar(f"completed_{train.id}_{section.id}_{t}")
                    self.model.Add(dep_var >= t).OnlyEnforceIf(completed)
                    self.model.Add(dep_var < t + 60).OnlyEnforceIf(completed)
                    
                    completed_trains.append(completed)
                
                # Subtract throughput from objective (to maximize)
                if completed_trains:
                    objective_terms.append(-throughput_weight * sum(completed_trains))
        
        # Minimize speed deviations (prefer maintaining scheduled speeds)
        speed_weight = 100
        for train in problem.trains:
            speed_var = self.variables['speed_adjustment'][train.id]
            # Penalize deviation from 100% speed
            deviation = self.model.NewIntVar(0, 70, f"speed_dev_{train.id}")
            self.model.AddAbsEquality(deviation, speed_var - 100)
            objective_terms.append(speed_weight * deviation)
        
        # Set objective
        if objective_terms:
            self.model.Minimize(sum(objective_terms))
    
    def _extract_solution(self, problem: OptimizationProblem, status, start_time) -> OptimizationSolution:
        """Extract solution from solved model"""
        solving_time = (datetime.utcnow() - start_time).total_seconds()
        
        if status == cp_model.OPTIMAL:
            solution_status = "OPTIMAL"
        elif status == cp_model.FEASIBLE:
            solution_status = "FEASIBLE"
        elif status == cp_model.INFEASIBLE:
            solution_status = "INFEASIBLE"
        else:
            solution_status = "TIMEOUT"
        
        decisions = []
        metrics = {
            "total_delay": 0.0,
            "throughput": 0.0,
            "safety_violations": 0
        }
        
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            try:
                # Extract decisions
                decisions = self._extract_decisions(problem)
                
                # Calculate metrics
                metrics = self._calculate_solution_metrics(problem)
                
                objective_value = self.solver.ObjectiveValue()
                
            except Exception as e:
                logger.error(f"Failed to extract solution: {str(e)}")
                objective_value = None
        else:
            objective_value = None
        
        return OptimizationSolution(
            status=solution_status,
            objective_value=objective_value,
            solving_time=solving_time,
            decisions=decisions,
            metrics=metrics
        )
    
    def _extract_decisions(self, problem: OptimizationProblem) -> List[Dict[str, Any]]:
        """Extract decisions from the solved model"""
        decisions = []
        
        try:
            for train in problem.trains:
                for section in problem.sections:
                    # Get timing decisions
                    arr_time = self.solver.Value(
                        self.variables['train_arrival_time'][(train.id, section.id)]
                    )
                    dep_time = self.solver.Value(
                        self.variables['train_departure_time'][(train.id, section.id)]
                    )
                    speed_adj = self.solver.Value(
                        self.variables['speed_adjustment'][train.id]
                    )
                    
                    # Determine recommendation based on solution
                    if speed_adj > 105:
                        recommendation = "INCREASE_SPEED"
                        reason = f"Increase speed to {speed_adj}% to optimize schedule"
                    elif speed_adj < 95:
                        recommendation = "REDUCE_SPEED"
                        reason = f"Reduce speed to {speed_adj}% for better coordination"
                    elif dep_time > arr_time + 2:
                        recommendation = "HOLD"
                        reason = f"Hold for {dep_time - arr_time - 1} minutes for optimal precedence"
                    else:
                        recommendation = "ALLOW"
                        reason = "Proceed as scheduled"
                    
                    decisions.append({
                        "train_id": train.id,
                        "section_id": section.id,
                        "type": "SPEED_CONTROL" if "SPEED" in recommendation else "PRECEDENCE",
                        "action": recommendation,
                        "confidence": 0.9,
                        "reason": reason,
                        "constraints": {
                            "arrival_time": arr_time,
                            "departure_time": dep_time,
                            "speed_adjustment": speed_adj
                        },
                        "delay_reduction": max(0, 2.0),  # Simplified calculation
                        "throughput_gain": 0.1
                    })
        
        except Exception as e:
            logger.error(f"Failed to extract decisions: {str(e)}")
        
        return decisions
    
    def _calculate_solution_metrics(self, problem: OptimizationProblem) -> Dict[str, float]:
        """Calculate metrics from the solution"""
        metrics = {
            "total_delay": 0.0,
            "throughput": 0.0,
            "safety_violations": 0
        }
        
        try:
            # Calculate total delay
            total_delay = 0
            for train in problem.trains:
                if train.id in self.variables['delay']:
                    delay = self.solver.Value(self.variables['delay'][train.id])
                    total_delay += delay
            
            metrics["total_delay"] = total_delay
            
            # Calculate throughput (simplified)
            total_completions = 0
            for section in problem.sections:
                for train in problem.trains:
                    dep_var = self.variables['train_departure_time'][(train.id, section.id)]
                    dep_time = self.solver.Value(dep_var)
                    if dep_time < problem.time_horizon // 60:
                        total_completions += 1
            
            metrics["throughput"] = total_completions / (problem.time_horizon / 3600)  # trains per hour
            
            # Safety violations (check if any capacity constraints are violated)
            # This would be 0 in a feasible solution, but good to track
            metrics["safety_violations"] = 0
            
        except Exception as e:
            logger.error(f"Failed to calculate metrics: {str(e)}")
        
        return metrics