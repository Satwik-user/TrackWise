"""
Objective function management for TrackWise Railway Optimization System
"""

import logging
import numpy as np
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Callable, Union
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ObjectiveType(str, Enum):
    """Types of optimization objectives"""
    MINIMIZE = "minimize"
    MAXIMIZE = "maximize"


class ObjectiveCategory(str, Enum):
    """Categories of objectives"""
    EFFICIENCY = "efficiency"
    COST = "cost"
    TIME = "time"
    QUALITY = "quality"
    SAFETY = "safety"
    SUSTAINABILITY = "sustainability"
    CUSTOMER = "customer"


@dataclass
class ObjectiveEvaluation:
    """Result of objective function evaluation"""
    objective_id: str
    value: float
    normalized_value: float
    contribution: float
    metadata: Dict[str, Any]


class BaseObjective(ABC):
    """Base class for optimization objectives"""
    
    def __init__(
        self,
        objective_id: str,
        objective_type: ObjectiveType,
        weight: float = 1.0,
        category: ObjectiveCategory = ObjectiveCategory.EFFICIENCY
    ):
        self.objective_id = objective_id
        self.objective_type = objective_type
        self.weight = weight
        self.category = category
        self.enabled = True
        self.normalization_factor = 1.0
        self.evaluation_history: List[ObjectiveEvaluation] = []
    
    @abstractmethod
    def evaluate(self, solution: Dict[str, Any]) -> ObjectiveEvaluation:
        """Evaluate the objective function for a given solution"""
        pass
    
    @abstractmethod
    def get_description(self) -> str:
        """Get human-readable description of objective"""
        pass
    
    def normalize_value(self, raw_value: float) -> float:
        """Normalize objective value to 0-1 range"""
        if self.normalization_factor == 0:
            return 0.0
        return min(1.0, abs(raw_value) / self.normalization_factor)
    
    def calculate_contribution(self, normalized_value: float) -> float:
        """Calculate weighted contribution to overall objective"""
        if self.objective_type == ObjectiveType.MINIMIZE:
            return self.weight * (1.0 - normalized_value)
        else:  # MAXIMIZE
            return self.weight * normalized_value
    
    def update_normalization_factor(self, reference_values: List[float]):
        """Update normalization factor based on reference values"""
        if reference_values:
            self.normalization_factor = max(reference_values) if reference_values else 1.0


class TotalDelayObjective(BaseObjective):
    """Minimize total system delay"""
    
    def __init__(self, weight: float = 2.0):
        super().__init__(
            objective_id="total_delay",
            objective_type=ObjectiveType.MINIMIZE,
            weight=weight,
            category=ObjectiveCategory.TIME
        )
        self.normalization_factor = 1000.0  # Normalize against 1000 minutes
    
    def evaluate(self, solution: Dict[str, Any]) -> ObjectiveEvaluation:
        """Calculate total delay across all trains"""
        total_delay = 0.0
        train_count = 0
        delay_distribution = []
        
        # Extract delay information from solution
        trains = solution.get("variables", {}).get("trains", [])
        decisions = solution.get("decisions", [])
        
        # Base delays from train data
        for train in trains:
            delay = train.get("delay_minutes", 0)
            total_delay += delay
            train_count += 1
            delay_distribution.append(delay)
        
        # Add/subtract delays from optimization decisions
        for decision in decisions:
            if decision.get("type") == "delay_mitigation":
                reduction = decision.get("expected_delay_reduction", 0)
                total_delay -= reduction
            elif decision.get("type") == "schedule_adjustment":
                # May introduce new delays
                potential_delay = decision.get("potential_delay_increase", 0)
                total_delay += potential_delay
        
        normalized_value = self.normalize_value(total_delay)
        contribution = self.calculate_contribution(normalized_value)
        
        evaluation = ObjectiveEvaluation(
            objective_id=self.objective_id,
            value=total_delay,
            normalized_value=normalized_value,
            contribution=contribution,
            metadata={
                "train_count": train_count,
                "average_delay": total_delay / train_count if train_count > 0 else 0,
                "max_delay": max(delay_distribution) if delay_distribution else 0,
                "delay_variance": np.var(delay_distribution) if delay_distribution else 0
            }
        )
        
        self.evaluation_history.append(evaluation)
        return evaluation
    
    def get_description(self) -> str:
        return "Minimize total delay across all trains in the system"


class ThroughputObjective(BaseObjective):
    """Maximize system throughput"""
    
    def __init__(self, weight: float = 1.5):
        super().__init__(
            objective_id="system_throughput",
            objective_type=ObjectiveType.MAXIMIZE,
            weight=weight,
            category=ObjectiveCategory.EFFICIENCY
        )
        self.normalization_factor = 100.0  # Normalize against 100 trains/hour
    
    def evaluate(self, solution: Dict[str, Any]) -> ObjectiveEvaluation:
        """Calculate system throughput"""
        completed_trains = 0
        total_capacity_used = 0
        section_utilization = []
        
        trains = solution.get("variables", {}).get("trains", [])
        sections = solution.get("variables", {}).get("sections", [])
        decisions = solution.get("decisions", [])
        
        # Count trains that complete their journeys
        for train in trains:
            if train.get("status") == "COMPLETED" or train.get("delay_minutes", 0) < 30:
                completed_trains += 1
        
        # Calculate section utilization
        section_usage = {}
        for decision in decisions:
            if decision.get("type") == "section_assignment":
                section_id = decision.get("assigned_section")
                if section_id not in section_usage:
                    section_usage[section_id] = 0
                section_usage[section_id] += 1
        
        for section in sections:
            section_id = section["id"]
            max_capacity = section.get("max_capacity", 1)
            usage = section_usage.get(section_id, 0)
            utilization = usage / max_capacity if max_capacity > 0 else 0
            section_utilization.append(utilization)
            total_capacity_used += utilization
        
        # Throughput metric (trains per hour equivalent)
        throughput = completed_trains * 1.5  # Simplified calculation
        
        normalized_value = self.normalize_value(throughput)
        contribution = self.calculate_contribution(normalized_value)
        
        evaluation = ObjectiveEvaluation(
            objective_id=self.objective_id,
            value=throughput,
            normalized_value=normalized_value,
            contribution=contribution,
            metadata={
                "completed_trains": completed_trains,
                "average_section_utilization": np.mean(section_utilization) if section_utilization else 0,
                "max_section_utilization": max(section_utilization) if section_utilization else 0,
                "total_capacity_used": total_capacity_used
            }
        )
        
        self.evaluation_history.append(evaluation)
        return evaluation
    
    def get_description(self) -> str:
        return "Maximize system throughput (trains processed per hour)"


class CostObjective(BaseObjective):
    """Minimize operational costs"""
    
    def __init__(self, weight: float = 1.0):
        super().__init__(
            objective_id="operational_cost",
            objective_type=ObjectiveType.MINIMIZE,
            weight=weight,
            category=ObjectiveCategory.COST
        )
        self.normalization_factor = 100000.0  # Normalize against $100k
    
    def evaluate(self, solution: Dict[str, Any]) -> ObjectiveEvaluation:
        """Calculate total operational costs"""
        total_cost = 0.0
        cost_breakdown = {
            "delay_penalties": 0,
            "mitigation_costs": 0,
            "fuel_costs": 0,
            "maintenance_costs": 0,
            "resource_costs": 0
        }
        
        trains = solution.get("variables", {}).get("trains", [])
        decisions = solution.get("decisions", [])
        
        # Delay penalty costs
        for train in trains:
            delay = train.get("delay_minutes", 0)
            penalty = delay * 100  # $100 per minute of delay
            cost_breakdown["delay_penalties"] += penalty
            total_cost += penalty
        
        # Mitigation action costs
        for decision in decisions:
            if decision.get("type") == "delay_mitigation":
                cost = decision.get("implementation_cost", 0)
                cost_breakdown["mitigation_costs"] += cost
                total_cost += cost
            elif decision.get("type") == "speed_increase":
                # Additional fuel cost for speed increases
                fuel_cost = decision.get("additional_fuel_cost", 0)
                cost_breakdown["fuel_costs"] += fuel_cost
                total_cost += fuel_cost
            elif decision.get("type") == "capacity_expansion":
                # Infrastructure costs
                infra_cost = decision.get("cost", 0)
                cost_breakdown["maintenance_costs"] += infra_cost
                total_cost += infra_cost
            elif decision.get("type") == "resource_allocation":
                # Resource costs
                resource_cost = decision.get("cost", 0)
                cost_breakdown["resource_costs"] += resource_cost
                total_cost += resource_cost
        
        normalized_value = self.normalize_value(total_cost)
        contribution = self.calculate_contribution(normalized_value)
        
        evaluation = ObjectiveEvaluation(
            objective_id=self.objective_id,
            value=total_cost,
            normalized_value=normalized_value,
            contribution=contribution,
            metadata=cost_breakdown
        )
        
        self.evaluation_history.append(evaluation)
        return evaluation
    
    def get_description(self) -> str:
        return "Minimize total operational costs including delays, fuel, and mitigation actions"


class UtilizationBalanceObjective(BaseObjective):
    """Balance utilization across sections"""
    
    def __init__(self, weight: float = 0.8):
        super().__init__(
            objective_id="utilization_balance",
            objective_type=ObjectiveType.MINIMIZE,
            weight=weight,
            category=ObjectiveCategory.EFFICIENCY
        )
        self.normalization_factor = 1.0  # Variance normalized to 0-1
    
    def evaluate(self, solution: Dict[str, Any]) -> ObjectiveEvaluation:
        """Calculate utilization balance (minimize variance)"""
        sections = solution.get("variables", {}).get("sections", [])
        decisions = solution.get("decisions", [])
        
        # Calculate utilization for each section
        section_utilization = {}
        for section in sections:
            section_id = section["id"]
            max_capacity = section.get("max_capacity", 1)
            section_utilization[section_id] = 0
        
        # Count assignments
        for decision in decisions:
            if decision.get("type") == "section_assignment":
                section_id = decision.get("assigned_section")
                if section_id in section_utilization:
                    section_utilization[section_id] += 1
        
        # Normalize utilization
        utilization_ratios = []
        for section in sections:
            section_id = section["id"]
            max_capacity = section.get("max_capacity", 1)
            usage = section_utilization.get(section_id, 0)
            ratio = usage / max_capacity if max_capacity > 0 else 0
            utilization_ratios.append(ratio)
        
        # Calculate variance (imbalance)
        if utilization_ratios:
            variance = np.var(utilization_ratios)
            mean_utilization = np.mean(utilization_ratios)
            max_utilization = max(utilization_ratios)
            min_utilization = min(utilization_ratios)
        else:
            variance = 0
            mean_utilization = 0
            max_utilization = 0
            min_utilization = 0
        
        normalized_value = self.normalize_value(variance)
        contribution = self.calculate_contribution(normalized_value)
        
        evaluation = ObjectiveEvaluation(
            objective_id=self.objective_id,
            value=variance,
            normalized_value=normalized_value,
            contribution=contribution,
            metadata={
                "mean_utilization": mean_utilization,
                "max_utilization": max_utilization,
                "min_utilization": min_utilization,
                "utilization_spread": max_utilization - min_utilization,
                "sections_analyzed": len(sections)
            }
        )
        
        self.evaluation_history.append(evaluation)
        return evaluation
    
    def get_description(self) -> str:
        return "Balance resource utilization across all sections to minimize bottlenecks"


class CustomerSatisfactionObjective(BaseObjective):
    """Maximize customer satisfaction"""
    
    def __init__(self, weight: float = 1.2):
        super().__init__(
            objective_id="customer_satisfaction",
            objective_type=ObjectiveType.MAXIMIZE,
            weight=weight,
            category=ObjectiveCategory.CUSTOMER
        )
        self.normalization_factor = 100.0  # Normalize against 100% satisfaction
    
    def evaluate(self, solution: Dict[str, Any]) -> ObjectiveEvaluation:
        """Calculate customer satisfaction score"""
        trains = solution.get("variables", {}).get("trains", [])
        
        satisfaction_factors = {
            "on_time_performance": 0,
            "delay_impact": 0,
            "service_frequency": 0,
            "comfort_level": 0
        }
        
        total_passengers = 0
        on_time_trains = 0
        total_delay_impact = 0
        
        for train in trains:
            if train.get("train_type") == "PASSENGER":
                passengers = train.get("capacity_passengers", 0)
                total_passengers += passengers
                
                delay = train.get("delay_minutes", 0)
                if delay <= 5:  # Consider ≤5 minutes as on-time
                    on_time_trains += 1
                    satisfaction_factors["on_time_performance"] += passengers
                
                # Delay impact (worse for longer delays)
                if delay > 0:
                    delay_impact = min(1.0, delay / 60)  # Normalize to 0-1
                    total_delay_impact += delay_impact * passengers
        
        # Calculate satisfaction score
        if total_passengers > 0:
            on_time_rate = satisfaction_factors["on_time_performance"] / total_passengers
            delay_penalty = total_delay_impact / total_passengers
            satisfaction_score = (on_time_rate * 0.6 - delay_penalty * 0.4) * 100
        else:
            satisfaction_score = 50  # Default neutral score
        
        satisfaction_score = max(0, min(100, satisfaction_score))  # Clamp to 0-100
        
        normalized_value = self.normalize_value(satisfaction_score)
        contribution = self.calculate_contribution(normalized_value)
        
        evaluation = ObjectiveEvaluation(
            objective_id=self.objective_id,
            value=satisfaction_score,
            normalized_value=normalized_value,
            contribution=contribution,
            metadata={
                "total_passengers": total_passengers,
                "on_time_trains": on_time_trains,
                "on_time_rate": on_time_rate if total_passengers > 0 else 0,
                "average_delay_impact": total_delay_impact / total_passengers if total_passengers > 0 else 0
            }
        )
        
        self.evaluation_history.append(evaluation)
        return evaluation
    
    def get_description(self) -> str:
        return "Maximize customer satisfaction through on-time performance and service quality"


class EnergyEfficiencyObjective(BaseObjective):
    """Minimize energy consumption"""
    
    def __init__(self, weight: float = 0.7):
        super().__init__(
            objective_id="energy_efficiency",
            objective_type=ObjectiveType.MINIMIZE,
            weight=weight,
            category=ObjectiveCategory.SUSTAINABILITY
        )
        self.normalization_factor = 10000.0  # Normalize against 10,000 kWh
    
    def evaluate(self, solution: Dict[str, Any]) -> ObjectiveEvaluation:
        """Calculate total energy consumption"""
        trains = solution.get("variables", {}).get("trains", [])
        decisions = solution.get("decisions", [])
        
        total_energy = 0.0
        energy_breakdown = {
            "base_consumption": 0,
            "speed_increase_penalty": 0,
            "route_efficiency": 0
        }
        
        # Base energy consumption
        for train in trains:
            base_energy = train.get("energy_consumption_kwh", 0)
            total_energy += base_energy
            energy_breakdown["base_consumption"] += base_energy
        
        # Additional energy from decisions
        for decision in decisions:
            if decision.get("type") == "speed_increase":
                # Speed increases consume more energy
                speed_penalty = decision.get("additional_energy_kwh", 0)
                total_energy += speed_penalty
                energy_breakdown["speed_increase_penalty"] += speed_penalty
            elif decision.get("type") == "route_change":
                # Route changes may save or cost energy
                route_energy_delta = decision.get("energy_delta_kwh", 0)
                total_energy += route_energy_delta
                energy_breakdown["route_efficiency"] += route_energy_delta
        
        normalized_value = self.normalize_value(total_energy)
        contribution = self.calculate_contribution(normalized_value)
        
        evaluation = ObjectiveEvaluation(
            objective_id=self.objective_id,
            value=total_energy,
            normalized_value=normalized_value,
            contribution=contribution,
            metadata=energy_breakdown
        )
        
        self.evaluation_history.append(evaluation)
        return evaluation
    
    def get_description(self) -> str:
        return "Minimize total energy consumption across all operations"


class ObjectiveManager:
    """Manager for handling multiple optimization objectives"""
    
    def __init__(self):
        self.objectives: Dict[str, BaseObjective] = {}
        self.objective_weights: Dict[str, float] = {}
        self.evaluation_history: List[Dict[str, ObjectiveEvaluation]] = []
        self.pareto_front: List[Dict[str, Any]] = []
    
    def add_objective(self, objective: BaseObjective):
        """Add an objective to the manager"""
        self.objectives[objective.objective_id] = objective
        self.objective_weights[objective.objective_id] = objective.weight
        logger.info(f"Added objective: {objective.objective_id} (weight: {objective.weight})")
    
    def remove_objective(self, objective_id: str):
        """Remove an objective"""
        if objective_id in self.objectives:
            del self.objectives[objective_id]
            del self.objective_weights[objective_id]
            logger.info(f"Removed objective: {objective_id}")
    
    def set_objective_weight(self, objective_id: str, weight: float):
        """Set weight for an objective"""
        if objective_id in self.objectives:
            self.objectives[objective_id].weight = weight
            self.objective_weights[objective_id] = weight
    
    def enable_objective(self, objective_id: str):
        """Enable an objective"""
        if objective_id in self.objectives:
            self.objectives[objective_id].enabled = True
    
    def disable_objective(self, objective_id: str):
        """Disable an objective"""
        if objective_id in self.objectives:
            self.objectives[objective_id].enabled = False
    
    def evaluate_solution(self, solution: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate a solution against all enabled objectives"""
        evaluations = {}
        total_weighted_score = 0.0
        total_weight = 0.0
        
        for objective_id, objective in self.objectives.items():
            if not objective.enabled:
                continue
            
            try:
                evaluation = objective.evaluate(solution)
                evaluations[objective_id] = evaluation
                
                total_weighted_score += evaluation.contribution
                total_weight += objective.weight
                
            except Exception as e:
                logger.error(f"Error evaluating objective {objective_id}: {e}")
                # Create dummy evaluation for failed objectives
                evaluations[objective_id] = ObjectiveEvaluation(
                    objective_id=objective_id,
                    value=0.0,
                    normalized_value=0.0,
                    contribution=0.0,
                    metadata={"error": str(e)}
                )
        
        # Calculate overall score
        overall_score = total_weighted_score / total_weight if total_weight > 0 else 0.0
        
        # Store evaluation history
        self.evaluation_history.append(evaluations)
        
        # Build summary
        summary = {
            "overall_score": overall_score,
            "total_weighted_score": total_weighted_score,
            "objectives_evaluated": len(evaluations),
            "objective_scores": {
                obj_id: {
                    "value": eval.value,
                    "normalized_value": eval.normalized_value,
                    "contribution": eval.contribution,
                    "weight": self.objectives[obj_id].weight
                }
                for obj_id, eval in evaluations.items()
            },
            "objective_breakdown": {
                "minimize_objectives": {
                    obj_id: eval.value for obj_id, eval in evaluations.items()
                    if self.objectives[obj_id].objective_type == ObjectiveType.MINIMIZE
                },
                "maximize_objectives": {
                    obj_id: eval.value for obj_id, eval in evaluations.items()
                    if self.objectives[obj_id].objective_type == ObjectiveType.MAXIMIZE
                }
            }
        }
        
        return summary
    
    def get_objective_summary(self) -> Dict[str, Any]:
        """Get summary of all objectives"""
        enabled_objectives = [obj for obj in self.objectives.values() if obj.enabled]
        disabled_objectives = [obj for obj in self.objectives.values() if not obj.enabled]
        
        by_type = {"minimize": 0, "maximize": 0}
        by_category = {}
        total_weight = 0.0
        
        for obj in enabled_objectives:
            by_type[obj.objective_type.value] += 1
            
            category = obj.category.value
            if category not in by_category:
                by_category[category] = 0
            by_category[category] += 1
            
            total_weight += obj.weight
        
        return {
            "total_objectives": len(self.objectives),
            "enabled_objectives": len(enabled_objectives),
            "disabled_objectives": len(disabled_objectives),
            "objectives_by_type": by_type,
            "objectives_by_category": by_category,
            "total_weight": total_weight,
            "average_weight": total_weight / len(enabled_objectives) if enabled_objectives else 0,
            "evaluations_performed": len(self.evaluation_history)
        }
    
    def create_railway_objectives(self):
        """Create standard railway optimization objectives"""
        
        # Primary objectives
        delay_objective = TotalDelayObjective(weight=2.0)
        self.add_objective(delay_objective)
        
        throughput_objective = ThroughputObjective(weight=1.5)
        self.add_objective(throughput_objective)
        
        cost_objective = CostObjective(weight=1.0)
        self.add_objective(cost_objective)
        
        # Secondary objectives
        balance_objective = UtilizationBalanceObjective(weight=0.8)
        self.add_objective(balance_objective)
        
        satisfaction_objective = CustomerSatisfactionObjective(weight=1.2)
        self.add_objective(satisfaction_objective)
        
        # Environmental objective
        energy_objective = EnergyEfficiencyObjective(weight=0.7)
        self.add_objective(energy_objective)
    
    def analyze_objective_trends(self, window_size: int = 50) -> Dict[str, Any]:
        """Analyze trends in objective performance"""
        if len(self.evaluation_history) < window_size:
            return {"message": "Insufficient data for trend analysis"}
        
        recent_evaluations = self.evaluation_history[-window_size:]
        trends = {}
        
        for objective_id in self.objectives:
            values = [
                eval_dict.get(objective_id, ObjectiveEvaluation(objective_id, 0, 0, 0, {})).value
                for eval_dict in recent_evaluations
                if objective_id in eval_dict
            ]
            
            if len(values) >= 2:
                # Calculate trend
                x = list(range(len(values)))
                slope = np.polyfit(x, values, 1)[0] if len(values) > 1 else 0
                
                trends[objective_id] = {
                    "slope": slope,
                    "direction": "improving" if slope < 0 else "degrading" if slope > 0 else "stable",
                    "recent_average": np.mean(values[-10:]) if len(values) >= 10 else np.mean(values),
                    "overall_average": np.mean(values),
                    "volatility": np.std(values),
                    "best_value": min(values) if self.objectives[objective_id].objective_type == ObjectiveType.MINIMIZE else max(values),
                    "worst_value": max(values) if self.objectives[objective_id].objective_type == ObjectiveType.MINIMIZE else min(values)
                }
        
        return {
            "analysis_window": window_size,
            "evaluations_analyzed": len(recent_evaluations),
            "objective_trends": trends,
            "overall_trend": self._calculate_overall_trend(trends)
        }
    
    def _calculate_overall_trend(self, trends: Dict[str, Any]) -> str:
        """Calculate overall system trend"""
        if not trends:
            return "unknown"
        
        improving_count = sum(1 for t in trends.values() if t["direction"] == "improving")
        degrading_count = sum(1 for t in trends.values() if t["direction"] == "degrading")
        
        if improving_count > degrading_count:
            return "improving"
        elif degrading_count > improving_count:
            return "degrading"
        else:
            return "stable"


# Export classes
__all__ = [
    "ObjectiveManager",
    "BaseObjective",
    "TotalDelayObjective",
    "ThroughputObjective",
    "CostObjective",
    "UtilizationBalanceObjective",
    "CustomerSatisfactionObjective",
    "EnergyEfficiencyObjective",
    "ObjectiveType",
    "ObjectiveCategory",
    "ObjectiveEvaluation"
]