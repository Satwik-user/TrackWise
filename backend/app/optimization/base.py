"""
Base optimization classes for TrackWise Railway Optimization System
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Union
from enum import Enum
import time
import json

logger = logging.getLogger(__name__)


class OptimizationStatus(str, Enum):
    """Optimization status enumeration"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"


class SolverType(str, Enum):
    """Available solver types"""
    CP_SAT = "cp_sat"
    LINEAR = "linear"
    HEURISTIC = "heuristic"
    GENETIC = "genetic"
    SIMULATED_ANNEALING = "simulated_annealing"


@dataclass
class OptimizationResult:
    """Result of an optimization run"""
    status: OptimizationStatus
    objective_value: Optional[float] = None
    optimality_gap: Optional[float] = None
    runtime_seconds: float = 0.0
    iterations: int = 0
    solver_used: Optional[str] = None
    decisions: List[Dict[str, Any]] = None
    metadata: Dict[str, Any] = None
    error_message: Optional[str] = None
    
    def __post_init__(self):
        if self.decisions is None:
            self.decisions = []
        if self.metadata is None:
            self.metadata = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)
    
    def is_successful(self) -> bool:
        """Check if optimization was successful"""
        return self.status == OptimizationStatus.COMPLETED and self.objective_value is not None


@dataclass
class OptimizationProblem:
    """Optimization problem definition"""
    problem_type: str
    variables: Dict[str, Any]
    constraints: List[Dict[str, Any]]
    objectives: List[Dict[str, Any]]
    parameters: Dict[str, Any]
    time_horizon: Optional[int] = None  # minutes
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


class BaseOptimizer(ABC):
    """Base class for all optimizers"""
    
    def __init__(self, solver_type: SolverType = SolverType.HEURISTIC):
        self.solver_type = solver_type
        self.problem: Optional[OptimizationProblem] = None
        self.result: Optional[OptimizationResult] = None
        self.is_cancelled = False
        self.start_time: Optional[datetime] = None
        
    @abstractmethod
    async def solve(self, problem: OptimizationProblem, timeout_seconds: int = 300) -> OptimizationResult:
        """Solve the optimization problem"""
        pass
    
    @abstractmethod
    def validate_problem(self, problem: OptimizationProblem) -> bool:
        """Validate the optimization problem"""
        pass
    
    def cancel(self):
        """Cancel the optimization"""
        self.is_cancelled = True
        logger.info(f"Optimization cancelled: {self.__class__.__name__}")
    
    def get_progress(self) -> Dict[str, Any]:
        """Get optimization progress"""
        if not self.start_time:
            return {"progress": 0.0, "status": "not_started"}
        
        elapsed = (datetime.utcnow() - self.start_time).total_seconds()
        
        return {
            "progress": min(50.0, elapsed * 2),  # Simplified progress calculation
            "status": "running" if not self.is_cancelled else "cancelled",
            "elapsed_seconds": elapsed,
            "solver_type": self.solver_type.value
        }
    
    async def _setup_solver(self, problem: OptimizationProblem):
        """Setup solver-specific configuration"""
        self.problem = problem
        self.start_time = datetime.utcnow()
        self.is_cancelled = False
    
    async def _create_result(
        self,
        status: OptimizationStatus,
        objective_value: Optional[float] = None,
        decisions: Optional[List[Dict[str, Any]]] = None,
        error_message: Optional[str] = None
    ) -> OptimizationResult:
        """Create optimization result"""
        
        runtime = 0.0
        if self.start_time:
            runtime = (datetime.utcnow() - self.start_time).total_seconds()
        
        return OptimizationResult(
            status=status,
            objective_value=objective_value,
            runtime_seconds=runtime,
            solver_used=self.solver_type.value,
            decisions=decisions or [],
            error_message=error_message,
            metadata={
                "problem_type": self.problem.problem_type if self.problem else "unknown",
                "cancelled": self.is_cancelled
            }
        )


class SimpleHeuristicOptimizer(BaseOptimizer):
    """Simple heuristic optimizer for basic problems"""
    
    def __init__(self):
        super().__init__(SolverType.HEURISTIC)
    
    def validate_problem(self, problem: OptimizationProblem) -> bool:
        """Validate the optimization problem"""
        required_fields = ['variables', 'constraints', 'objectives']
        
        for field in required_fields:
            if not hasattr(problem, field) or not getattr(problem, field):
                logger.error(f"Missing required field: {field}")
                return False
        
        return True
    
    async def solve(self, problem: OptimizationProblem, timeout_seconds: int = 300) -> OptimizationResult:
        """Solve using simple heuristics"""
        
        if not self.validate_problem(problem):
            return await self._create_result(
                OptimizationStatus.FAILED,
                error_message="Problem validation failed"
            )
        
        await self._setup_solver(problem)
        
        try:
            logger.info(f"Starting heuristic optimization for {problem.problem_type}")
            
            # Simulate optimization process
            max_iterations = 100
            best_objective = float('inf')
            best_decisions = []
            
            for iteration in range(max_iterations):
                if self.is_cancelled:
                    return await self._create_result(OptimizationStatus.CANCELLED)
                
                # Simulate checking timeout
                if self.start_time and (datetime.utcnow() - self.start_time).total_seconds() > timeout_seconds:
                    return await self._create_result(
                        OptimizationStatus.TIMEOUT,
                        error_message=f"Optimization timed out after {timeout_seconds} seconds"
                    )
                
                # Generate solution based on problem type
                if problem.problem_type == "schedule_optimization":
                    current_solution = await self._solve_schedule_heuristic(problem)
                elif problem.problem_type == "route_optimization":
                    current_solution = await self._solve_route_heuristic(problem)
                elif problem.problem_type == "capacity_optimization":
                    current_solution = await self._solve_capacity_heuristic(problem)
                elif problem.problem_type == "delay_minimization":
                    current_solution = await self._solve_delay_heuristic(problem)
                else:
                    current_solution = await self._solve_generic_heuristic(problem)
                
                objective_value = current_solution.get("objective_value", float('inf'))
                
                if objective_value < best_objective:
                    best_objective = objective_value
                    best_decisions = current_solution.get("decisions", [])
                
                # Add small delay to prevent CPU spinning
                await asyncio.sleep(0.001)
            
            return await self._create_result(
                OptimizationStatus.COMPLETED,
                objective_value=best_objective,
                decisions=best_decisions
            )
            
        except Exception as e:
            logger.error(f"Heuristic optimization failed: {e}")
            return await self._create_result(
                OptimizationStatus.FAILED,
                error_message=str(e)
            )
    
    async def _solve_schedule_heuristic(self, problem: OptimizationProblem) -> Dict[str, Any]:
        """Solve schedule optimization using heuristics"""
        
        # Get trains and their current schedules
        trains = problem.variables.get("trains", [])
        sections = problem.variables.get("sections", [])
        
        decisions = []
        total_delay = 0
        
        # Simple greedy scheduling: assign trains to earliest available slots
        for train in trains:
            train_id = train.get("id")
            current_delay = train.get("delay_minutes", 0)
            
            # Find best schedule adjustment
            if current_delay > 10:  # Only adjust if significantly delayed
                # Suggest rescheduling to reduce conflicts
                new_departure = train.get("scheduled_departure") + timedelta(minutes=5)
                
                decision = {
                    "type": "schedule_adjustment",
                    "train_id": train_id,
                    "old_departure": train.get("scheduled_departure"),
                    "new_departure": new_departure.isoformat() if hasattr(new_departure, 'isoformat') else str(new_departure),
                    "expected_delay_reduction": min(current_delay * 0.3, 10)
                }
                decisions.append(decision)
                total_delay += current_delay * 0.7  # Reduced delay
            else:
                total_delay += current_delay
        
        return {
            "objective_value": total_delay,
            "decisions": decisions
        }
    
    async def _solve_route_heuristic(self, problem: OptimizationProblem) -> Dict[str, Any]:
        """Solve route optimization using heuristics"""
        
        trains = problem.variables.get("trains", [])
        sections = problem.variables.get("sections", [])
        
        decisions = []
        total_distance = 0
        
        # Simple route optimization: find shortest available paths
        for train in trains:
            train_id = train.get("id")
            current_route = train.get("route", [])
            
            if len(current_route) > 3:  # Only optimize longer routes
                # Suggest route optimization (simplified)
                optimized_route = current_route[:-1]  # Remove one section
                
                decision = {
                    "type": "route_change",
                    "train_id": train_id,
                    "old_route": current_route,
                    "new_route": optimized_route,
                    "distance_saved": 5.0  # Mock distance saving
                }
                decisions.append(decision)
                total_distance += len(optimized_route) * 10  # Mock distance calculation
            else:
                total_distance += len(current_route) * 10
        
        return {
            "objective_value": total_distance,
            "decisions": decisions
        }
    
    async def _solve_capacity_heuristic(self, problem: OptimizationProblem) -> Dict[str, Any]:
        """Solve capacity optimization using heuristics"""
        
        sections = problem.variables.get("sections", [])
        trains = problem.variables.get("trains", [])
        
        decisions = []
        total_utilization = 0
        
        # Analyze section utilization and suggest improvements
        for section in sections:
            section_id = section.get("id")
            current_capacity = section.get("max_capacity", 1)
            current_trains = section.get("current_trains", 0)
            utilization = current_trains / current_capacity if current_capacity > 0 else 0
            
            if utilization > 0.8:  # Overcapacity
                # Suggest redistributing trains
                decision = {
                    "type": "capacity_reallocation",
                    "section_id": section_id,
                    "current_utilization": utilization,
                    "suggested_action": "redistribute_traffic",
                    "expected_improvement": 0.2
                }
                decisions.append(decision)
                total_utilization += max(0.6, utilization - 0.2)  # Improved utilization
            else:
                total_utilization += utilization
        
        return {
            "objective_value": total_utilization,
            "decisions": decisions
        }
    
    async def _solve_delay_heuristic(self, problem: OptimizationProblem) -> Dict[str, Any]:
        """Solve delay minimization using heuristics"""
        
        trains = problem.variables.get("trains", [])
        
        decisions = []
        total_delay = 0
        
        # Analyze delays and suggest mitigation strategies
        for train in trains:
            train_id = train.get("id")
            current_delay = train.get("delay_minutes", 0)
            
            if current_delay > 15:  # Significant delay
                # Suggest multiple mitigation strategies
                strategies = []
                
                # Speed increase
                if train.get("current_speed", 0) < train.get("max_speed", 100) * 0.9:
                    strategies.append({
                        "type": "speed_increase",
                        "new_speed": min(train.get("max_speed", 100), train.get("current_speed", 60) * 1.1),
                        "expected_delay_reduction": min(current_delay * 0.3, 8)
                    })
                
                # Priority scheduling
                strategies.append({
                    "type": "priority_scheduling",
                    "new_priority": "high",
                    "expected_delay_reduction": min(current_delay * 0.2, 5)
                })
                
                best_strategy = max(strategies, key=lambda x: x.get("expected_delay_reduction", 0))
                
                decision = {
                    "type": "delay_mitigation",
                    "train_id": train_id,
                    "current_delay": current_delay,
                    "strategy": best_strategy,
                    "alternatives": [s for s in strategies if s != best_strategy]
                }
                decisions.append(decision)
                
                reduced_delay = current_delay - best_strategy.get("expected_delay_reduction", 0)
                total_delay += max(0, reduced_delay)
            else:
                total_delay += current_delay
        
        return {
            "objective_value": total_delay,
            "decisions": decisions
        }
    
    async def _solve_generic_heuristic(self, problem: OptimizationProblem) -> Dict[str, Any]:
        """Solve generic optimization problems"""
        
        # Simple generic solution
        decisions = [
            {
                "type": "generic_optimization",
                "action": "system_optimization",
                "description": "Generic system improvement recommendation",
                "expected_benefit": 0.1
            }
        ]
        
        return {
            "objective_value": 100.0,  # Mock objective value
            "decisions": decisions
        }


class LinearProgrammingOptimizer(BaseOptimizer):
    """Linear programming optimizer using simplified LP"""
    
    def __init__(self):
        super().__init__(SolverType.LINEAR)
    
    def validate_problem(self, problem: OptimizationProblem) -> bool:
        """Validate LP problem structure"""
        # Check for linear constraints and objectives
        for constraint in problem.constraints:
            if constraint.get("type") not in ["linear_equality", "linear_inequality"]:
                logger.warning(f"Non-linear constraint detected: {constraint.get('type')}")
        
        return True
    
    async def solve(self, problem: OptimizationProblem, timeout_seconds: int = 300) -> OptimizationResult:
        """Solve using linear programming (simplified)"""
        
        if not self.validate_problem(problem):
            return await self._create_result(
                OptimizationStatus.FAILED,
                error_message="LP problem validation failed"
            )
        
        await self._setup_solver(problem)
        
        try:
            logger.info(f"Starting LP optimization for {problem.problem_type}")
            
            # Simulate LP solving process
            await asyncio.sleep(0.1)  # Simulate computation time
            
            if self.is_cancelled:
                return await self._create_result(OptimizationStatus.CANCELLED)
            
            # Generate mock LP solution
            decisions = await self._generate_lp_solution(problem)
            
            # Calculate mock objective value
            objective_value = sum(d.get("value", 0) for d in decisions)
            
            return await self._create_result(
                OptimizationStatus.COMPLETED,
                objective_value=objective_value,
                decisions=decisions
            )
            
        except Exception as e:
            logger.error(f"LP optimization failed: {e}")
            return await self._create_result(
                OptimizationStatus.FAILED,
                error_message=str(e)
            )
    
    async def _generate_lp_solution(self, problem: OptimizationProblem) -> List[Dict[str, Any]]:
        """Generate mock LP solution"""
        
        variables = problem.variables
        decisions = []
        
        # Generate decisions based on problem variables
        if "trains" in variables:
            for train in variables["trains"]:
                decision = {
                    "type": "lp_schedule",
                    "train_id": train.get("id"),
                    "optimal_departure": train.get("scheduled_departure"),
                    "value": 10.5,  # Mock LP value
                    "shadow_price": 2.3
                }
                decisions.append(decision)
        
        return decisions


class CPSATOptimizer(BaseOptimizer):
    """Constraint Programming SAT optimizer"""
    
    def __init__(self):
        super().__init__(SolverType.CP_SAT)
    
    def validate_problem(self, problem: OptimizationProblem) -> bool:
        """Validate CP-SAT problem structure"""
        # Check for discrete variables and constraints
        return True
    
    async def solve(self, problem: OptimizationProblem, timeout_seconds: int = 300) -> OptimizationResult:
        """Solve using CP-SAT (simplified)"""
        
        if not self.validate_problem(problem):
            return await self._create_result(
                OptimizationStatus.FAILED,
                error_message="CP-SAT problem validation failed"
            )
        
        await self._setup_solver(problem)
        
        try:
            logger.info(f"Starting CP-SAT optimization for {problem.problem_type}")
            
            # Simulate CP-SAT solving
            iterations = 50
            best_solution = None
            best_objective = float('inf')
            
            for i in range(iterations):
                if self.is_cancelled:
                    return await self._create_result(OptimizationStatus.CANCELLED)
                
                # Simulate finding better solutions
                current_objective = 1000 - i * 15 + (i % 7) * 3  # Mock decreasing objective
                
                if current_objective < best_objective:
                    best_objective = current_objective
                    best_solution = await self._generate_cpsat_solution(problem, i)
                
                await asyncio.sleep(0.001)  # Prevent CPU spinning
            
            return await self._create_result(
                OptimizationStatus.COMPLETED,
                objective_value=best_objective,
                decisions=best_solution
            )
            
        except Exception as e:
            logger.error(f"CP-SAT optimization failed: {e}")
            return await self._create_result(
                OptimizationStatus.FAILED,
                error_message=str(e)
            )
    
    async def _generate_cpsat_solution(self, problem: OptimizationProblem, iteration: int) -> List[Dict[str, Any]]:
        """Generate mock CP-SAT solution"""
        
        decisions = []
        
        # Generate assignment decisions
        variables = problem.variables
        if "trains" in variables and "sections" in variables:
            trains = variables["trains"]
            sections = variables["sections"]
            
            for train in trains:
                # Assign train to optimal section
                optimal_section = sections[iteration % len(sections)] if sections else None
                
                if optimal_section:
                    decision = {
                        "type": "section_assignment",
                        "train_id": train.get("id"),
                        "assigned_section": optimal_section.get("id"),
                        "assignment_time": datetime.utcnow().isoformat(),
                        "confidence": 0.95
                    }
                    decisions.append(decision)
        
        return decisions


# Export classes
__all__ = [
    "BaseOptimizer",
    "OptimizationResult",
    "OptimizationProblem", 
    "OptimizationStatus",
    "SolverType",
    "SimpleHeuristicOptimizer",
    "LinearProgrammingOptimizer",
    "CPSATOptimizer"
]