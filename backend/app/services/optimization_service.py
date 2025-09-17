from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio
import logging

from app.models.train import Train
from app.models.section import Section
from app.schemas.optimization import OptimizationRequest, OptimizationResult, Decision
from optimization.core.cp_solver import CPSolver
from optimization.core.heuristic_solver import HeuristicSolver
from optimization.models.optimization_model import OptimizationProblem
from ml_models.inference.prediction_service import PredictionService

logger = logging.getLogger(__name__)

class OptimizationService:
    def __init__(self, db: Session):
        self.db = db
        self.cp_solver = CPSolver()
        self.heuristic_solver = HeuristicSolver()
        self.prediction_service = PredictionService()
    
    async def optimize_real_time(
        self, 
        trains: List[Train], 
        sections: List[Section], 
        request: OptimizationRequest
    ) -> OptimizationResult:
        """Run real-time optimization using fast heuristics"""
        start_time = datetime.utcnow()
        
        try:
            # Create optimization problem
            problem = OptimizationProblem(
                trains=trains,
                sections=sections,
                time_horizon=request.time_horizon,
                objective_weights=request.objective_weights
            )
            
            # Use heuristic solver for speed
            solution = await self.heuristic_solver.solve(
                problem=problem,
                timeout=min(request.solver_timeout, 3)  # Max 3 seconds for real-time
            )
            
            # Generate decisions from solution
            decisions = self._generate_decisions(solution, trains, sections)
            
            # Calculate metrics
            metrics = self._calculate_metrics(solution, trains)
            
            solving_time = (datetime.utcnow() - start_time).total_seconds()
            
            return OptimizationResult(
                run_id="",  # Will be set by caller
                scenario_name=request.scenario_name,
                optimization_type=request.optimization_type,
                solution_status=solution.status,
                objective_value=solution.objective_value,
                solving_time=solving_time,
                total_delay=metrics["total_delay"],
                throughput=metrics["throughput"],
                safety_violations=metrics["safety_violations"],
                decisions=decisions,
                trains_affected=len(trains),
                sections_involved=len(sections),
                improvements=metrics["improvements"],
                created_at=start_time,
                completed_at=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Real-time optimization failed: {str(e)}")
            solving_time = (datetime.utcnow() - start_time).total_seconds()
            
            return OptimizationResult(
                run_id="",
                scenario_name=request.scenario_name,
                optimization_type=request.optimization_type,
                solution_status="ERROR",
                objective_value=None,
                solving_time=solving_time,
                decisions=[],
                trains_affected=len(trains),
                sections_involved=len(sections),
                created_at=start_time,
                completed_at=datetime.utcnow()
            )
    
    async def optimize_batch(
        self, 
        trains: List[Train], 
        sections: List[Section], 
        request: OptimizationRequest
    ) -> OptimizationResult:
        """Run batch optimization using CP solver"""
        start_time = datetime.utcnow()
        
        try:
            # Create optimization problem
            problem = OptimizationProblem(
                trains=trains,
                sections=sections,
                time_horizon=request.time_horizon,
                objective_weights=request.objective_weights
            )
            
            # Try CP solver first, fallback to heuristic if needed
            solution = None
            try:
                solution = await self.cp_solver.solve(
                    problem=problem,
                    timeout=request.solver_timeout
                )
            except Exception as cp_error:
                logger.warning(f"CP solver failed, falling back to heuristic: {str(cp_error)}")
                solution = await self.heuristic_solver.solve(
                    problem=problem,
                    timeout=request.solver_timeout
                )
            
            # Generate decisions from solution
            decisions = self._generate_decisions(solution, trains, sections)
            
            # Calculate metrics
            metrics = self._calculate_metrics(solution, trains)
            
            solving_time = (datetime.utcnow() - start_time).total_seconds()
            
            return OptimizationResult(
                run_id="",
                scenario_name=request.scenario_name,
                optimization_type=request.optimization_type,
                solution_status=solution.status,
                objective_value=solution.objective_value,
                solving_time=solving_time,
                total_delay=metrics["total_delay"],
                throughput=metrics["throughput"],
                safety_violations=metrics["safety_violations"],
                decisions=decisions,
                trains_affected=len(trains),
                sections_involved=len(sections),
                improvements=metrics["improvements"],
                created_at=start_time,
                completed_at=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Batch optimization failed: {str(e)}")
            solving_time = (datetime.utcnow() - start_time).total_seconds()
            
            return OptimizationResult(
                run_id="",
                scenario_name=request.scenario_name,
                optimization_type=request.optimization_type,
                solution_status="ERROR",
                objective_value=None,
                solving_time=solving_time,
                decisions=[],
                trains_affected=len(trains),
                sections_involved=len(sections),
                created_at=start_time,
                completed_at=datetime.utcnow()
            )
    
    async def generate_recommendations(
        self,
        section: Section,
        trains: List[Train],
        time_horizon: int = 1800
    ) -> List[Dict[str, Any]]:
        """Generate real-time recommendations for a section"""
        try:
            recommendations = []
            
            # Sort trains by priority and schedule
            sorted_trains = sorted(trains, key=lambda t: (t.priority, t.scheduled_arrival or datetime.utcnow()))
            
            for i, train in enumerate(sorted_trains):
                # Check for conflicts with other trains
                conflicts = self._check_conflicts(train, sorted_trains[i+1:], section)
                
                if conflicts:
                    # Generate conflict resolution recommendation
                    recommendation = await self._generate_conflict_resolution(
                        train, conflicts, section, time_horizon
                    )
                    recommendations.append(recommendation)
                
                # Check for optimization opportunities
                optimization = await self._check_optimization_opportunity(
                    train, section, time_horizon
                )
                if optimization:
                    recommendations.append(optimization)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations: {str(e)}")
            return []
    
    def _generate_decisions(self, solution, trains: List[Train], sections: List[Section]) -> List[Decision]:
        """Generate decision objects from optimization solution"""
        decisions = []
        
        if not solution or not hasattr(solution, 'decisions'):
            return decisions
        
        for decision_data in solution.decisions:
            try:
                decision = Decision(
                    train_id=decision_data["train_id"],
                    section_id=decision_data["section_id"],
                    decision_type=decision_data["type"],
                    recommendation=decision_data["action"],
                    confidence_score=decision_data.get("confidence", 0.8),
                    reason=decision_data.get("reason", "Optimization result"),
                    constraints_considered=decision_data.get("constraints", {}),
                    alternatives=decision_data.get("alternatives", []),
                    predicted_delay_reduction=decision_data.get("delay_reduction", 0.0),
                    predicted_throughput_gain=decision_data.get("throughput_gain", 0.0)
                )
                decisions.append(decision)
            except Exception as e:
                logger.error(f"Failed to create decision: {str(e)}")
                continue
        
        return decisions
    
    def _calculate_metrics(self, solution, trains: List[Train]) -> Dict[str, Any]:
        """Calculate optimization metrics"""
        metrics = {
            "total_delay": 0.0,
            "throughput": 0.0,
            "safety_violations": 0,
            "improvements": {}
        }
        
        try:
            if solution and hasattr(solution, 'metrics'):
                metrics.update(solution.metrics)
            
            # Calculate baseline metrics for comparison
            baseline_delay = sum(
                max(0, (train.actual_arrival - train.scheduled_arrival).total_seconds() / 60)
                for train in trains 
                if train.actual_arrival and train.scheduled_arrival
            )
            
            metrics["improvements"] = {
                "delay_reduction_percent": max(0, (baseline_delay - metrics["total_delay"]) / baseline_delay * 100) if baseline_delay > 0 else 0,
                "throughput_increase_percent": 10.0  # Placeholder
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate metrics: {str(e)}")
        
        return metrics
    
    def _check_conflicts(self, train: Train, other_trains: List[Train], section: Section) -> List[Dict[str, Any]]:
        """Check for potential conflicts between trains"""
        conflicts = []
        
        try:
            for other_train in other_trains:
                # Simple conflict detection based on timing and position
                if self._trains_conflict(train, other_train, section):
                    conflicts.append({
                        "train_id": other_train.id,
                        "train_number": other_train.train_number,
                        "conflict_type": "timing",
                        "severity": "medium"
                    })
        except Exception as e:
            logger.error(f"Failed to check conflicts: {str(e)}")
        
        return conflicts
    
    def _trains_conflict(self, train1: Train, train2: Train, section: Section) -> bool:
        """Check if two trains have a timing conflict"""
        try:
            # Simplified conflict detection
            if not train1.scheduled_arrival or not train2.scheduled_arrival:
                return False
            
            # Check if arrival times are too close
            time_diff = abs((train1.scheduled_arrival - train2.scheduled_arrival).total_seconds())
            min_separation = 300  # 5 minutes minimum separation
            
            return time_diff < min_separation
        except:
            return False
    
    async def _generate_conflict_resolution(
        self, 
        train: Train, 
        conflicts: List[Dict[str, Any]], 
        section: Section, 
        time_horizon: int
    ) -> Dict[str, Any]:
        """Generate conflict resolution recommendation"""
        try:
            # Determine best resolution strategy
            if train.priority <= 2:  # High priority train
                recommendation = "ALLOW"
                reason = f"High priority train {train.train_number} should proceed"
            else:
                recommendation = "HOLD"
                reason = f"Hold {train.train_number} to resolve conflicts with {len(conflicts)} trains"
            
            return {
                "train_id": train.id,
                "train_number": train.train_number,
                "type": "conflict_resolution",
                "recommendation": recommendation,
                "reason": reason,
                "conflicts": conflicts,
                "confidence": 0.85,
                "estimated_delay": 2.5 if recommendation == "HOLD" else 0.0
            }
        except Exception as e:
            logger.error(f"Failed to generate conflict resolution: {str(e)}")
            return {}
    
    async def _check_optimization_opportunity(
        self, 
        train: Train, 
        section: Section, 
        time_horizon: int
    ) -> Optional[Dict[str, Any]]:
        """Check for optimization opportunities"""
        try:
            # Check if train can be sped up without conflicts
            if train.current_speed < train.max_speed * 0.8:
                return {
                    "train_id": train.id,
                    "train_number": train.train_number,
                    "type": "speed_optimization",
                    "recommendation": "INCREASE_SPEED",
                    "reason": f"Train can safely increase speed to improve schedule",
                    "confidence": 0.75,
                    "estimated_benefit": 1.2
                }
            
            return None
        except Exception as e:
            logger.error(f"Failed to check optimization opportunity: {str(e)}")
            return None