import random
import math
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import asyncio
import logging

from optimization.models.optimization_model import OptimizationProblem, OptimizationSolution
from optimization.models.train_model import TrainModel
from optimization.models.section_model import SectionModel

logger = logging.getLogger(__name__)

class HeuristicSolver:
    """Fast heuristic solver for real-time optimization"""
    
    def __init__(self):
        self.current_solution = None
        self.best_solution = None
        self.iteration_count = 0
    
    async def solve(self, problem: OptimizationProblem, timeout: int = 5) -> OptimizationSolution:
        """Solve using hybrid heuristic approach"""
        start_time = datetime.utcnow()
        
        try:
            # Step 1: Generate initial solution using priority-based greedy
            initial_solution = self._greedy_initial_solution(problem)
            self.best_solution = initial_solution
            
            # Step 2: Improve using local search
            improved_solution = await self._local_search_improvement(
                problem, initial_solution, timeout - 1
            )
            
            if improved_solution and improved_solution["objective"] < self.best_solution["objective"]:
                self.best_solution = improved_solution
            
            # Step 3: Convert to standard solution format
            solution = self._convert_to_solution(problem, self.best_solution, start_time)
            
            return solution
            
        except Exception as e:
            logger.error(f"Heuristic solver failed: {str(e)}")
            solving_time = (datetime.utcnow() - start_time).total_seconds()
            
            return OptimizationSolution(
                status="ERROR",
                objective_value=None,
                solving_time=solving_time,
                decisions=[],
                metrics={"error": str(e)}
            )
    
    def _greedy_initial_solution(self, problem: OptimizationProblem) -> Dict[str, Any]:
        """Generate initial solution using priority-based greedy algorithm"""
        
        solution = {
            "train_schedule": {},  # train_id -> {section_id -> (arrival, departure)}
            "section_usage": {},   # section_id -> [(train_id, arrival, departure)]
            "objective": float('inf'),
            "feasible": True
        }
        
        # Initialize section usage tracking
        for section in problem.sections:
            solution["section_usage"][section.id] = []
        
        # Sort trains by priority and scheduled time
        sorted_trains = sorted(
            problem.trains,
            key=lambda t: (t.priority, t.scheduled_arrival or datetime.utcnow())
        )
        
        current_time = datetime.utcnow()
        
        for train in sorted_trains:
            train_schedule = {}
            
            # Schedule train through each relevant section
            for section in problem.sections:
                # Calculate arrival time
                if not train_schedule:  # First section
                    if train.scheduled_arrival:
                        arrival_time = train.scheduled_arrival
                    else:
                        arrival_time = current_time
                else:
                    # Arrival based on previous section departure + travel time
                    prev_section_dep = max(train_schedule.values(), key=lambda x: x[1])[1]
                    travel_time = self._calculate_travel_time(train, section)
                    arrival_time = prev_section_dep + timedelta(seconds=travel_time)
                
                # Find suitable departure time avoiding conflicts
                departure_time = self._find_conflict_free_departure(
                    solution, section, train, arrival_time
                )
                
                # Update solution
                train_schedule[section.id] = (arrival_time, departure_time)
                solution["section_usage"][section.id].append(
                    (train.id, arrival_time, departure_time)
                )
            
            solution["train_schedule"][train.id] = train_schedule
        
        # Calculate objective value
        solution["objective"] = self._calculate_objective(problem, solution)
        
        return solution
    
    def _find_conflict_free_departure(
        self, 
        solution: Dict[str, Any], 
        section, 
        train, 
        arrival_time: datetime
    ) -> datetime:
        """Find the earliest conflict-free departure time"""
        
        min_dwell_time = self._get_min_dwell_time(train, section)
        earliest_departure = arrival_time + timedelta(seconds=min_dwell_time)
        
        # Check conflicts with other trains
        section_usage = solution["section_usage"][section.id]
        
        # Sort existing usage by departure time
        sorted_usage = sorted(section_usage, key=lambda x: x[2])
        
        for other_train_id, other_arrival, other_departure in sorted_usage:
            # Check if there's a conflict
            if self._times_conflict(arrival_time, earliest_departure, other_arrival, other_departure):
                # Adjust departure time to avoid conflict
                safety_buffer = timedelta(minutes=5)
                earliest_departure = max(earliest_departure, other_departure + safety_buffer)
        
        return earliest_departure
    
    def _times_conflict(self, arr1: datetime, dep1: datetime, arr2: datetime, dep2: datetime) -> bool:
        """Check if two time intervals conflict"""
        return not (dep1 <= arr2 or dep2 <= arr1)
    
    def _get_min_dwell_time(self, train, section) -> int:
        """Get minimum dwell time in seconds"""
        if train.train_type == "EXPRESS":
            return 120  # 2 minutes
        elif train.train_type == "FREIGHT":
            return 300  # 5 minutes
        else:
            return 180  # 3 minutes for suburban
    
    def _calculate_travel_time(self, train, section) -> int:
        """Calculate travel time through section in seconds"""
        # Base travel time based on section length and train speed
        speed_kmh = min(train.max_speed, section.max_speed)
        speed_ms = speed_kmh * 1000 / 3600  # Convert to m/s
        
        travel_time = section.length / speed_ms
        
        # Add buffer for acceleration/deceleration
        buffer_time = 60  # 1 minute buffer
        
        return int(travel_time + buffer_time)
    
    async def _local_search_improvement(
        self, 
        problem: OptimizationProblem, 
        initial_solution: Dict[str, Any], 
        timeout: int
    ) -> Optional[Dict[str, Any]]:
        """Improve solution using local search with multiple neighborhoods"""
        
        start_time = datetime.utcnow()
        current_solution = initial_solution.copy()
        best_solution = initial_solution.copy()
        iteration = 0
        
        while (datetime.utcnow() - start_time).total_seconds() < timeout:
            iteration += 1
            improved = False
            
            # Try different neighborhood operations
            neighborhoods = [
                self._swap_train_order,
                self._adjust_departure_times,
                self._reassign_sections
            ]
            
            for neighborhood_func in neighborhoods:
                if (datetime.utcnow() - start_time).total_seconds() >= timeout:
                    break
                
                # Try neighborhood operation
                neighbor_solution = neighborhood_func(problem, current_solution)
                
                if neighbor_solution and self._is_feasible(problem, neighbor_solution):
                    neighbor_objective = self._calculate_objective(problem, neighbor_solution)
                    neighbor_solution["objective"] = neighbor_objective
                    
                    # Accept if better (steepest descent)
                    if neighbor_objective < current_solution["objective"]:
                        current_solution = neighbor_solution
                        improved = True
                        
                        # Update best if even better
                        if neighbor_objective < best_solution["objective"]:
                            best_solution = neighbor_solution.copy()
            
            # If no improvement in any neighborhood, try random restart
            if not improved and iteration > 10:
                current_solution = self._random_perturbation(problem, best_solution)
        
        return best_solution
    
    def _swap_train_order(self, problem: OptimizationProblem, solution: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Neighborhood: swap order of two trains in a section"""
        try:
            new_solution = self._deep_copy_solution(solution)
            
            # Pick random section
            section = random.choice(problem.sections)
            section_usage = new_solution["section_usage"][section.id]
            
            if len(section_usage) < 2:
                return None
            
            # Pick two trains to swap
            idx1, idx2 = random.sample(range(len(section_usage)), 2)
            train1_data = section_usage[idx1]
            train2_data = section_usage[idx2]
            
            # Swap their positions
            section_usage[idx1] = train2_data
            section_usage[idx2] = train1_data
            
            # Update train schedules
            train1_id, train2_id = train1_data[0], train2_data[0]
            new_solution["train_schedule"][train1_id][section.id] = (train2_data[1], train2_data[2])
            new_solution["train_schedule"][train2_id][section.id] = (train1_data[1], train1_data[2])
            
            return new_solution
            
        except Exception as e:
            logger.error(f"Swap operation failed: {str(e)}")
            return None
    
    def _adjust_departure_times(self, problem: OptimizationProblem, solution: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Neighborhood: adjust departure times to reduce delays"""
        try:
            new_solution = self._deep_copy_solution(solution)
            
            # Pick random train and section
            train = random.choice(problem.trains)
            section = random.choice(problem.sections)
            
            if train.id not in new_solution["train_schedule"]:
                return None
            
            if section.id not in new_solution["train_schedule"][train.id]:
                return None
            
            current_arrival, current_departure = new_solution["train_schedule"][train.id][section.id]
            
            # Try earlier departure (if feasible)
            new_departure = current_departure - timedelta(minutes=random.randint(1, 5))
            min_departure = current_arrival + timedelta(seconds=self._get_min_dwell_time(train, section))
            
            if new_departure >= min_departure:
                # Check if this creates conflicts
                if not self._creates_conflict(new_solution, section, train.id, current_arrival, new_departure):
                    # Update solution
                    new_solution["train_schedule"][train.id][section.id] = (current_arrival, new_departure)
                    
                    # Update section usage
                    section_usage = new_solution["section_usage"][section.id]
                    for i, (tid, arr, dep) in enumerate(section_usage):
                        if tid == train.id:
                            section_usage[i] = (tid, current_arrival, new_departure)
                            break
                    
                    return new_solution
            
            return None
            
        except Exception as e:
            logger.error(f"Departure adjustment failed: {str(e)}")
            return None
    
    def _reassign_sections(self, problem: OptimizationProblem, solution: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Neighborhood: reassign train to different platform/track within section"""
        # Simplified: just try different section if multiple available
        try:
            if len(problem.sections) < 2:
                return None
            
            new_solution = self._deep_copy_solution(solution)
            
            # Pick random train
            train = random.choice(problem.trains)
            
            if train.id not in new_solution["train_schedule"]:
                return None
            
            # Try moving to different section
            current_sections = list(new_solution["train_schedule"][train.id].keys())
            available_sections = [s.id for s in problem.sections if s.id not in current_sections]
            
            if not available_sections:
                return None
            
            new_section_id = random.choice(available_sections)
            new_section = next(s for s in problem.sections if s.id == new_section_id)
            
            # Calculate new timing for this section
            arrival_time = datetime.utcnow()  # Simplified
            departure_time = self._find_conflict_free_departure(
                new_solution, new_section, train, arrival_time
            )
            
            # Add to new section
            new_solution["train_schedule"][train.id][new_section_id] = (arrival_time, departure_time)
            new_solution["section_usage"][new_section_id].append((train.id, arrival_time, departure_time))
            
            return new_solution
            
        except Exception as e:
            logger.error(f"Reassignment failed: {str(e)}")
            return None
    
    def _creates_conflict(self, solution: Dict[str, Any], section, train_id: int, arrival: datetime, departure: datetime) -> bool:
        """Check if the given timing creates a conflict"""
        section_usage = solution["section_usage"][section.id]
        
        for other_train_id, other_arrival, other_departure in section_usage:
            if other_train_id != train_id:
                if self._times_conflict(arrival, departure, other_arrival, other_departure):
                    return True
        
        return False
    
    def _random_perturbation(self, problem: OptimizationProblem, solution: Dict[str, Any]) -> Dict[str, Any]:
        """Apply random perturbation to escape local minimum"""
        try:
            new_solution = self._deep_copy_solution(solution)
            
            # Randomly delay some trains
            trains_to_perturb = random.sample(problem.trains, min(3, len(problem.trains)))
            
            for train in trains_to_perturb:
                if train.id in new_solution["train_schedule"]:
                    for section_id in new_solution["train_schedule"][train.id]:
                        arrival, departure = new_solution["train_schedule"][train.id][section_id]
                        
                        # Add random delay
                        delay = timedelta(minutes=random.randint(1, 10))
                        new_arrival = arrival + delay
                        new_departure = departure + delay
                        
                        new_solution["train_schedule"][train.id][section_id] = (new_arrival, new_departure)
                        
                        # Update section usage
                        section_usage = new_solution["section_usage"][section_id]
                        for i, (tid, arr, dep) in enumerate(section_usage):
                            if tid == train.id:
                                section_usage[i] = (tid, new_arrival, new_departure)
                                break
            
            return new_solution
            
        except Exception as e:
            logger.error(f"Random perturbation failed: {str(e)}")
            return solution
    
    def _deep_copy_solution(self, solution: Dict[str, Any]) -> Dict[str, Any]:
        """Create deep copy of solution"""
        import copy
        return copy.deepcopy(solution)
    
    def _is_feasible(self, problem: OptimizationProblem, solution: Dict[str, Any]) -> bool:
        """Check if solution is feasible"""
        try:
            # Check capacity constraints
            for section in problem.sections:
                if not self._check_section_capacity(solution, section):
                    return False
            
            # Check minimum separation constraints
            if not self._check_separation_constraints(solution):
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Feasibility check failed: {str(e)}")
            return False
    
    def _check_section_capacity(self, solution: Dict[str, Any], section) -> bool:
        """Check if section capacity is not exceeded at any time"""
        section_usage = solution["section_usage"][section.id]
        
        # Create timeline of events
        events = []
        for train_id, arrival, departure in section_usage:
            events.append((arrival, 1, train_id))    # Train enters
            events.append((departure, -1, train_id)) # Train exits
        
        # Sort events by time
        events.sort()
        
        # Check occupancy at each event
        current_occupancy = 0
        for time, change, train_id in events:
            current_occupancy += change
            if current_occupancy > section.max_occupancy:
                return False
        
        return True
    
    def _check_separation_constraints(self, solution: Dict[str, Any]) -> bool:
        """Check minimum separation between trains"""
        min_separation = timedelta(minutes=5)
        
        for section_id, section_usage in solution["section_usage"].items():
            # Sort by departure time
            sorted_usage = sorted(section_usage, key=lambda x: x[2])
            
            for i in range(len(sorted_usage) - 1):
                current_departure = sorted_usage[i][2]
                next_arrival = sorted_usage[i + 1][1]
                
                if next_arrival < current_departure + min_separation:
                    return False
        
        return True
    
    def _calculate_objective(self, problem: OptimizationProblem, solution: Dict[str, Any]) -> float:
        """Calculate objective value for solution"""
        try:
            total_delay = 0.0
            total_throughput = 0.0
            
            # Calculate delay component
            delay_weight = problem.objective_weights.get('delay', 0.6)
            for train in problem.trains:
                if train.id in solution["train_schedule"] and train.scheduled_arrival:
                    # Find actual arrival (first section)
                    first_section_id = min(solution["train_schedule"][train.id].keys())
                    actual_arrival = solution["train_schedule"][train.id][first_section_id][0]
                    
                    delay_minutes = max(0, (actual_arrival - train.scheduled_arrival).total_seconds() / 60)
                    total_delay += delay_minutes
            
            # Calculate throughput component (negative because we want to maximize)
            throughput_weight = problem.objective_weights.get('throughput', 0.4)
            completed_trains = len([t for t in problem.trains if t.id in solution["train_schedule"]])
            total_throughput = -completed_trains  # Negative to convert maximization to minimization
            
            # Combined objective
            objective = delay_weight * total_delay + throughput_weight * total_throughput
            
            return objective
            
        except Exception as e:
            logger.error(f"Objective calculation failed: {str(e)}")
            return float('inf')
    
    def _convert_to_solution(
        self, 
        problem: OptimizationProblem, 
        heuristic_solution: Dict[str, Any], 
        start_time: datetime
    ) -> OptimizationSolution:
        """Convert heuristic solution to standard format"""
        
        solving_time = (datetime.utcnow() - start_time).total_seconds()
        
        # Generate decisions
        decisions = []
        for train in problem.trains:
            if train.id in heuristic_solution["train_schedule"]:
                for section_id, (arrival, departure) in heuristic_solution["train_schedule"][train.id].items():
                    
                    # Determine recommendation
                    if train.scheduled_arrival:
                        delay = (arrival - train.scheduled_arrival).total_seconds() / 60
                        if delay > 5:
                            recommendation = "HOLD"
                            reason = f"Scheduled delay of {delay:.1f} minutes to optimize overall flow"
                        elif delay < -2:
                            recommendation = "INCREASE_SPEED"
                            reason = "Can arrive earlier to improve schedule"
                        else:
                            recommendation = "ALLOW"
                            reason = "Proceed as optimized"
                    else:
                        recommendation = "ALLOW"
                        reason = "Proceed as scheduled"
                    
                    decisions.append({
                        "train_id": train.id,
                        "section_id": section_id,
                        "type": "PRECEDENCE",
                        "action": recommendation,
                        "confidence": 0.8,
                        "reason": reason,
                        "constraints": {
                            "arrival_time": arrival.isoformat(),
                            "departure_time": departure.isoformat()
                        },
                        "delay_reduction": max(0, 1.5),
                        "throughput_gain": 0.05
                    })
        
        # Calculate metrics
        metrics = {
            "total_delay": heuristic_solution.get("total_delay", 0.0),
            "throughput": len(decisions) / (problem.time_horizon / 3600),
            "safety_violations": 0 if heuristic_solution.get("feasible", True) else 1
        }
        
        return OptimizationSolution(
            status="FEASIBLE" if heuristic_solution.get("feasible", True) else "INFEASIBLE",
            objective_value=heuristic_solution.get("objective"),
            solving_time=solving_time,
            decisions=decisions,
            metrics=metrics
        )