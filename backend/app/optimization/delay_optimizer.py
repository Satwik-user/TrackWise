"""
Delay optimization for TrackWise Railway Optimization System
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from .base import BaseOptimizer, OptimizationProblem, OptimizationResult, OptimizationStatus
from .solver_factory import SolverFactory

logger = logging.getLogger(__name__)


class DelayType(str, Enum):
    """Types of delays"""
    PRIMARY = "primary"      # Original delay
    SECONDARY = "secondary"  # Delay caused by other delays
    CASCADING = "cascading"  # Delay that propagates through network


class DelayMitigationStrategy(str, Enum):
    """Delay mitigation strategies"""
    SPEED_INCREASE = "speed_increase"
    ROUTE_CHANGE = "route_change"
    PRIORITY_CHANGE = "priority_change"
    SCHEDULE_ADJUSTMENT = "schedule_adjustment"
    RESOURCE_REALLOCATION = "resource_reallocation"


@dataclass
class DelayIncident:
    """Delay incident data structure"""
    train_id: int
    delay_minutes: float
    delay_type: DelayType
    cause: str
    severity: str
    propagation_risk: float
    affected_routes: List[int]


@dataclass
class MitigationAction:
    """Delay mitigation action"""
    strategy: DelayMitigationStrategy
    train_id: int
    action_details: Dict[str, Any]
    expected_reduction: float
    implementation_cost: float
    implementation_time: int  # minutes
    success_probability: float


@dataclass
class DelayOptimizationResult:
    """Extended result for delay optimization"""
    base_result: OptimizationResult
    mitigation_actions: List[MitigationAction]
    delay_reduction_total: float
    delays_prevented: int
    cost_savings: float


class DelayOptimizer:
    """Optimizer for delay mitigation and prevention"""
    
    def __init__(self, solver_type: Optional[str] = None):
        self.solver_type = solver_type or "heuristic"
        self.delay_incidents: List[DelayIncident] = []
        self.mitigation_strategies: Dict[str, Dict[str, Any]] = {}
        self._load_mitigation_strategies()
    
    def _load_mitigation_strategies(self):
        """Load available mitigation strategies with parameters"""
        
        self.mitigation_strategies = {
            DelayMitigationStrategy.SPEED_INCREASE: {
                "max_increase_percent": 20,
                "cost_per_minute": 50,
                "effectiveness": 0.8,
                "implementation_time": 5,
                "applicability": ["passenger", "freight"]
            },
            DelayMitigationStrategy.ROUTE_CHANGE: {
                "alternative_routes_required": 1,
                "cost_per_change": 1000,
                "effectiveness": 0.9,
                "implementation_time": 15,
                "applicability": ["passenger", "freight"]
            },
            DelayMitigationStrategy.PRIORITY_CHANGE: {
                "cost_per_change": 100,
                "effectiveness": 0.6,
                "implementation_time": 2,
                "applicability": ["passenger", "freight"]
            },
            DelayMitigationStrategy.SCHEDULE_ADJUSTMENT: {
                "max_adjustment_minutes": 30,
                "cost_per_minute": 20,
                "effectiveness": 0.7,
                "implementation_time": 10,
                "applicability": ["passenger"]
            },
            DelayMitigationStrategy.RESOURCE_REALLOCATION: {
                "resources_required": 2,
                "cost_per_resource": 500,
                "effectiveness": 0.85,
                "implementation_time": 20,
                "applicability": ["passenger", "freight", "maintenance"]
            }
        }
    
    async def optimize_delay_mitigation(
        self,
        trains: List[Dict[str, Any]],
        sections: List[Dict[str, Any]],
        current_delays: Optional[List[Dict[str, Any]]] = None,
        objectives: Optional[List[str]] = None,
        constraints: Optional[List[Dict[str, Any]]] = None
    ) -> DelayOptimizationResult:
        """Optimize delay mitigation strategies"""
        
        logger.info(f"Starting delay optimization for {len(trains)} trains")
        
        # Set default objectives
        if objectives is None:
            objectives = ["minimize_total_delay", "minimize_mitigation_cost", "prevent_cascading"]
        
        # Analyze current delay situation
        delay_analysis = await self._analyze_delays(trains, current_delays)
        
        # Create optimization problem
        problem = self._create_delay_problem(trains, sections, delay_analysis, objectives, constraints)
        
        # Solve optimization
        solver = SolverFactory.create_solver(self.solver_type)
        base_result = await solver.solve(problem, timeout_seconds=300)
        
        # Process results
        delay_result = await self._process_delay_results(base_result, delay_analysis)
        
        return delay_result
    
    async def _analyze_delays(
        self,
        trains: List[Dict[str, Any]],
        current_delays: Optional[List[Dict[str, Any]]] = None
    ) -> List[DelayIncident]:
        """Analyze current delays and their characteristics"""
        
        incidents = []
        
        for train in trains:
            delay_minutes = train.get("delay_minutes", 0)
            
            if delay_minutes > 0:
                # Determine delay type and severity
                delay_type = self._classify_delay_type(train, delay_minutes)
                severity = self._calculate_delay_severity(delay_minutes)
                cause = train.get("delay_cause", "unknown")
                
                # Calculate propagation risk
                propagation_risk = self._calculate_propagation_risk(train, delay_minutes)
                
                # Identify affected routes
                affected_routes = self._identify_affected_routes(train, trains)
                
                incident = DelayIncident(
                    train_id=train["id"],
                    delay_minutes=delay_minutes,
                    delay_type=delay_type,
                    cause=cause,
                    severity=severity,
                    propagation_risk=propagation_risk,
                    affected_routes=affected_routes
                )
                incidents.append(incident)
        
        # Sort by severity and propagation risk
        incidents.sort(key=lambda x: (x.propagation_risk, x.delay_minutes), reverse=True)
        
        self.delay_incidents = incidents
        return incidents
    
    def _classify_delay_type(self, train: Dict[str, Any], delay_minutes: float) -> DelayType:
        """Classify the type of delay"""
        
        # Check if delay is caused by other trains (simplified logic)
        delay_cause = train.get("delay_cause", "")
        
        if "cascading" in delay_cause.lower():
            return DelayType.CASCADING
        elif "secondary" in delay_cause.lower() or "conflict" in delay_cause.lower():
            return DelayType.SECONDARY
        else:
            return DelayType.PRIMARY
    
    def _calculate_delay_severity(self, delay_minutes: float) -> str:
        """Calculate delay severity level"""
        
        if delay_minutes >= 60:
            return "critical"
        elif delay_minutes >= 30:
            return "high"
        elif delay_minutes >= 15:
            return "medium"
        else:
            return "low"
    
    def _calculate_propagation_risk(self, train: Dict[str, Any], delay_minutes: float) -> float:
        """Calculate risk of delay propagating to other trains"""
        
        # Factors affecting propagation risk:
        # 1. Delay magnitude
        # 2. Train type and priority
        # 3. Route congestion
        # 4. Time of day
        
        # Delay magnitude factor
        delay_factor = min(1.0, delay_minutes / 60)  # Normalize to 0-1
        
        # Train type factor
        train_type = train.get("train_type", "PASSENGER")
        type_factors = {
            "PASSENGER": 0.8,    # High impact on other trains
            "HIGH_SPEED": 0.9,   # Very high impact
            "FREIGHT": 0.5,      # Lower impact
            "MAINTENANCE": 0.3   # Lowest impact
        }
        type_factor = type_factors.get(train_type, 0.6)
        
        # Route congestion factor (simplified)
        route_length = len(train.get("route", []))
        congestion_factor = min(1.0, route_length / 10)
        
        # Time factor (peak hours have higher propagation risk)
        current_hour = datetime.utcnow().hour
        if 7 <= current_hour <= 9 or 17 <= current_hour <= 19:
            time_factor = 1.0  # Peak hours
        else:
            time_factor = 0.6  # Off-peak
        
        propagation_risk = (
            delay_factor * 0.4 +
            type_factor * 0.3 +
            congestion_factor * 0.2 +
            time_factor * 0.1
        )
        
        return min(1.0, propagation_risk)
    
    def _identify_affected_routes(self, delayed_train: Dict[str, Any], all_trains: List[Dict[str, Any]]) -> List[int]:
        """Identify routes that could be affected by this delay"""
        
        delayed_route = delayed_train.get("route", [])
        affected_routes = []
        
        for train in all_trains:
            if train["id"] == delayed_train["id"]:
                continue
            
            train_route = train.get("route", [])
            
            # Check for route overlap
            if any(section in delayed_route for section in train_route):
                affected_routes.append(train["id"])
        
        return affected_routes
    
    def _create_delay_problem(
        self,
        trains: List[Dict[str, Any]],
        sections: List[Dict[str, Any]],
        delay_incidents: List[DelayIncident],
        objectives: List[str],
        constraints: Optional[List[Dict[str, Any]]]
    ) -> OptimizationProblem:
        """Create optimization problem for delay mitigation"""
        
        # Variables
        variables = {
            "trains": trains,
            "sections": sections,
            "delay_incidents": [
                {
                    "train_id": incident.train_id,
                    "delay_minutes": incident.delay_minutes,
                    "delay_type": incident.delay_type.value,
                    "cause": incident.cause,
                    "severity": incident.severity,
                    "propagation_risk": incident.propagation_risk,
                    "affected_routes": incident.affected_routes
                }
                for incident in delay_incidents
            ],
            "mitigation_strategies": self.mitigation_strategies
        }
        
        # Constraints
        problem_constraints = constraints or []
        
        # Budget constraints for mitigation actions
        problem_constraints.append({
            "type": "mitigation_budget",
            "max_budget": 100000,  # $100k for mitigation actions
            "description": "Budget limit for delay mitigation actions"
        })
        
        # Time constraints for implementation
        problem_constraints.append({
            "type": "implementation_time",
            "max_time_minutes": 60,  # Actions must be implementable within 1 hour
            "description": "Time limit for implementing mitigation actions"
        })
        
        # Resource constraints
        problem_constraints.append({
            "type": "resource_availability",
            "max_concurrent_actions": 5,  # Maximum 5 concurrent mitigation actions
            "description": "Limit on concurrent mitigation actions"
        })
        
        # Safety constraints
        for train in trains:
            problem_constraints.append({
                "type": "safety_constraint",
                "train_id": train["id"],
                "max_speed_increase": 20,  # Maximum 20% speed increase
                "min_separation_distance": 2.0,  # Minimum 2km separation
                "description": f"Safety constraints for train {train['id']}"
            })
        
        # Objectives
        problem_objectives = []
        for obj in objectives:
            if obj == "minimize_total_delay":
                problem_objectives.append({
                    "type": "minimize",
                    "function": "total_system_delay",
                    "weight": 2.0,
                    "description": "Minimize total system delay"
                })
            elif obj == "minimize_mitigation_cost":
                problem_objectives.append({
                    "type": "minimize",
                    "function": "mitigation_cost",
                    "weight": 1.0,
                    "description": "Minimize cost of mitigation actions"
                })
            elif obj == "prevent_cascading":
                problem_objectives.append({
                    "type": "minimize",
                    "function": "cascading_delay_risk",
                    "weight": 1.5,
                    "description": "Prevent cascading delays"
                })
            elif obj == "maximize_recovery_speed":
                problem_objectives.append({
                    "type": "minimize",
                    "function": "recovery_time",
                    "weight": 1.2,
                    "description": "Maximize speed of delay recovery"
                })
        
        return OptimizationProblem(
            problem_type="delay_minimization",
            variables=variables,
            constraints=problem_constraints,
            objectives=problem_objectives,
            parameters={
                "solver_timeout": 300,
                "max_mitigation_actions": 10
            }
        )
    
    async def _process_delay_results(
        self,
        base_result: OptimizationResult,
        delay_incidents: List[DelayIncident]
    ) -> DelayOptimizationResult:
        """Process optimization results into delay-specific format"""
        
        if not base_result.is_successful():
            return DelayOptimizationResult(
                base_result=base_result,
                mitigation_actions=[],
                delay_reduction_total=0.0,
                delays_prevented=0,
                cost_savings=0.0
            )
        
        # Extract mitigation actions from decisions
        mitigation_actions = []
        total_delay_reduction = 0.0
        total_cost = 0.0
        
        for decision in base_result.decisions:
            if decision.get("type") == "delay_mitigation":
                strategy_name = decision.get("strategy")
                strategy = DelayMitigationStrategy(strategy_name) if strategy_name else DelayMitigationStrategy.SPEED_INCREASE
                
                action = MitigationAction(
                    strategy=strategy,
                    train_id=decision.get("train_id"),
                    action_details=decision.get("action_details", {}),
                    expected_reduction=decision.get("expected_delay_reduction", 0),
                    implementation_cost=decision.get("cost", 0),
                    implementation_time=decision.get("implementation_time", 0),
                    success_probability=decision.get("success_probability", 0.8)
                )
                
                mitigation_actions.append(action)
                total_delay_reduction += action.expected_reduction
                total_cost += action.implementation_cost
        
        # Calculate delays prevented (estimate)
        delays_prevented = len([
            incident for incident in delay_incidents 
            if incident.propagation_risk > 0.7 and total_delay_reduction > incident.delay_minutes * 0.3
        ])
        
        # Calculate cost savings (simplified)
        cost_savings = total_delay_reduction * 100 - total_cost  # $100 per minute saved minus mitigation cost
        
        return DelayOptimizationResult(
            base_result=base_result,
            mitigation_actions=mitigation_actions,
            delay_reduction_total=total_delay_reduction,
            delays_prevented=delays_prevented,
            cost_savings=max(0, cost_savings)
        )
    
    async def generate_mitigation_recommendations(
        self,
        train_id: int,
        delay_minutes: float,
        train_data: Dict[str, Any],
        available_strategies: Optional[List[DelayMitigationStrategy]] = None
    ) -> List[MitigationAction]:
        """Generate mitigation recommendations for a specific delay"""
        
        if available_strategies is None:
            available_strategies = list(DelayMitigationStrategy)
        
        recommendations = []
        
        for strategy in available_strategies:
            if strategy not in self.mitigation_strategies:
                continue
            
            strategy_config = self.mitigation_strategies[strategy]
            
            # Check if strategy is applicable to this train type
            train_type = train_data.get("train_type", "PASSENGER").lower()
            if train_type not in strategy_config.get("applicability", []):
                continue
            
            # Generate strategy-specific recommendation
            action = await self._generate_strategy_action(
                strategy, train_id, delay_minutes, train_data, strategy_config
            )
            
            if action:
                recommendations.append(action)
        
        # Sort by effectiveness per cost
        recommendations.sort(
            key=lambda x: (x.expected_reduction * x.success_probability) / max(x.implementation_cost, 1),
            reverse=True
        )
        
        return recommendations
    
    async def _generate_strategy_action(
        self,
        strategy: DelayMitigationStrategy,
        train_id: int,
        delay_minutes: float,
        train_data: Dict[str, Any],
        strategy_config: Dict[str, Any]
    ) -> Optional[MitigationAction]:
        """Generate specific mitigation action for a strategy"""
        
        if strategy == DelayMitigationStrategy.SPEED_INCREASE:
            current_speed = train_data.get("current_speed", 60)
            max_speed = train_data.get("max_speed_kmh", 120)
            max_increase = strategy_config["max_increase_percent"]
            
            if current_speed < max_speed * (1 - max_increase / 100):
                new_speed = min(max_speed, current_speed * 1.1)
                expected_reduction = min(delay_minutes * 0.3, 15)  # Max 15 minutes reduction
                
                return MitigationAction(
                    strategy=strategy,
                    train_id=train_id,
                    action_details={
                        "current_speed": current_speed,
                        "new_speed": new_speed,
                        "speed_increase_percent": ((new_speed - current_speed) / current_speed) * 100
                    },
                    expected_reduction=expected_reduction,
                    implementation_cost=expected_reduction * strategy_config["cost_per_minute"],
                    implementation_time=strategy_config["implementation_time"],
                    success_probability=strategy_config["effectiveness"]
                )
        
        elif strategy == DelayMitigationStrategy.ROUTE_CHANGE:
            current_route = train_data.get("route", [])
            
            if len(current_route) > 2:  # Only if alternative routes possible
                expected_reduction = min(delay_minutes * 0.4, 20)
                
                return MitigationAction(
                    strategy=strategy,
                    train_id=train_id,
                    action_details={
                        "current_route": current_route,
                        "suggested_alternative": "optimized_route",
                        "route_change_type": "bypass"
                    },
                    expected_reduction=expected_reduction,
                    implementation_cost=strategy_config["cost_per_change"],
                    implementation_time=strategy_config["implementation_time"],
                    success_probability=strategy_config["effectiveness"]
                )
        
        elif strategy == DelayMitigationStrategy.PRIORITY_CHANGE:
            current_priority = train_data.get("priority_level", 1)
            
            if current_priority < 5:  # Can increase priority
                expected_reduction = min(delay_minutes * 0.2, 10)
                
                return MitigationAction(
                    strategy=strategy,
                    train_id=train_id,
                    action_details={
                        "current_priority": current_priority,
                        "new_priority": current_priority + 1,
                        "priority_duration": "temporary"
                    },
                    expected_reduction=expected_reduction,
                    implementation_cost=strategy_config["cost_per_change"],
                    implementation_time=strategy_config["implementation_time"],
                    success_probability=strategy_config["effectiveness"]
                )
        
        elif strategy == DelayMitigationStrategy.SCHEDULE_ADJUSTMENT:
            if delay_minutes <= strategy_config["max_adjustment_minutes"]:
                expected_reduction = min(delay_minutes * 0.25, 12)
                
                return MitigationAction(
                    strategy=strategy,
                    train_id=train_id,
                    action_details={
                        "adjustment_type": "departure_delay",
                        "adjustment_minutes": min(delay_minutes, 15),
                        "affected_connections": []
                    },
                    expected_reduction=expected_reduction,
                    implementation_cost=delay_minutes * strategy_config["cost_per_minute"],
                    implementation_time=strategy_config["implementation_time"],
                    success_probability=strategy_config["effectiveness"]
                )
        
        elif strategy == DelayMitigationStrategy.RESOURCE_REALLOCATION:
            expected_reduction = min(delay_minutes * 0.35, 25)
            
            return MitigationAction(
                strategy=strategy,
                train_id=train_id,
                action_details={
                    "resources_type": "maintenance_crew",
                    "resources_count": strategy_config["resources_required"],
                    "allocation_duration": "temporary"
                },
                expected_reduction=expected_reduction,
                implementation_cost=strategy_config["resources_required"] * strategy_config["cost_per_resource"],
                implementation_time=strategy_config["implementation_time"],
                success_probability=strategy_config["effectiveness"]
            )
        
        return None
    
    async def predict_delay_propagation(
        self,
        delay_incident: DelayIncident,
        trains: List[Dict[str, Any]],
        sections: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Predict how a delay might propagate through the system"""
        
        propagation_analysis = {
            "primary_incident": {
                "train_id": delay_incident.train_id,
                "delay_minutes": delay_incident.delay_minutes,
                "propagation_risk": delay_incident.propagation_risk
            },
            "affected_trains": [],
            "total_propagated_delay": 0,
            "propagation_timeline": []
        }
        
        # Identify directly affected trains
        for train_id in delay_incident.affected_routes:
            train = next((t for t in trains if t["id"] == train_id), None)
            if train:
                # Estimate propagated delay
                propagated_delay = delay_incident.delay_minutes * delay_incident.propagation_risk * 0.5
                
                affected_train = {
                    "train_id": train_id,
                    "estimated_delay": propagated_delay,
                    "delay_cause": "secondary",
                    "confidence": 0.7
                }
                propagation_analysis["affected_trains"].append(affected_train)
                propagation_analysis["total_propagated_delay"] += propagated_delay
        
        # Create propagation timeline
        base_time = datetime.utcnow()
        for i, affected in enumerate(propagation_analysis["affected_trains"]):
            propagation_analysis["propagation_timeline"].append({
                "time": (base_time + timedelta(minutes=i * 10)).isoformat(),
                "train_id": affected["train_id"],
                "estimated_delay": affected["estimated_delay"],
                "event": "delay_propagation"
            })
        
        return propagation_analysis


# Export classes
__all__ = [
    "DelayOptimizer",
    "DelayIncident",
    "MitigationAction",
    "DelayOptimizationResult",
    "DelayType",
    "DelayMitigationStrategy"
]