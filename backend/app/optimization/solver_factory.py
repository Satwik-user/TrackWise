"""
Solver factory for TrackWise Railway Optimization System
"""

import logging
from typing import Dict, Type, Optional
from enum import Enum

from .base import BaseOptimizer, SolverType, SimpleHeuristicOptimizer, LinearProgrammingOptimizer, CPSATOptimizer

logger = logging.getLogger(__name__)


class SolverFactory:
    """Factory for creating optimization solvers"""
    
    # Registry of available solvers
    _solvers: Dict[SolverType, Type[BaseOptimizer]] = {
        SolverType.HEURISTIC: SimpleHeuristicOptimizer,
        SolverType.LINEAR: LinearProgrammingOptimizer,
        SolverType.CP_SAT: CPSATOptimizer,
    }
    
    @classmethod
    def create_solver(cls, solver_type: SolverType) -> BaseOptimizer:
        """Create a solver instance"""
        
        if solver_type not in cls._solvers:
            logger.warning(f"Solver type {solver_type} not available, falling back to heuristic")
            solver_type = SolverType.HEURISTIC
        
        solver_class = cls._solvers[solver_type]
        return solver_class()
    
    @classmethod
    def register_solver(cls, solver_type: SolverType, solver_class: Type[BaseOptimizer]):
        """Register a new solver type"""
        cls._solvers[solver_type] = solver_class
        logger.info(f"Registered solver: {solver_type} -> {solver_class.__name__}")
    
    @classmethod
    def get_available_solvers(cls) -> Dict[str, str]:
        """Get list of available solvers"""
        return {
            solver_type.value: solver_class.__name__ 
            for solver_type, solver_class in cls._solvers.items()
        }
    
    @classmethod
    def get_recommended_solver(cls, problem_type: str, problem_size: str = "medium") -> SolverType:
        """Get recommended solver based on problem characteristics"""
        
        recommendations = {
            ("schedule_optimization", "small"): SolverType.HEURISTIC,
            ("schedule_optimization", "medium"): SolverType.LINEAR,
            ("schedule_optimization", "large"): SolverType.HEURISTIC,
            
            ("route_optimization", "small"): SolverType.CP_SAT,
            ("route_optimization", "medium"): SolverType.HEURISTIC,
            ("route_optimization", "large"): SolverType.HEURISTIC,
            
            ("capacity_optimization", "small"): SolverType.LINEAR,
            ("capacity_optimization", "medium"): SolverType.LINEAR,
            ("capacity_optimization", "large"): SolverType.HEURISTIC,
            
            ("delay_minimization", "small"): SolverType.CP_SAT,
            ("delay_minimization", "medium"): SolverType.HEURISTIC,
            ("delay_minimization", "large"): SolverType.HEURISTIC,
        }
        
        key = (problem_type, problem_size)
        recommended = recommendations.get(key, SolverType.HEURISTIC)
        
        logger.info(f"Recommended solver for {problem_type} ({problem_size}): {recommended}")
        return recommended


# Export factory
__all__ = ["SolverFactory"]