"""
Capacity optimization for TrackWise Railway Optimization System
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import numpy as np

from .base import BaseOptimizer, OptimizationProblem, OptimizationResult, OptimizationStatus
from .solver_factory import SolverFactory

logger = logging.getLogger(__name__)


@dataclass
class CapacityAnalysis:
    """Capacity analysis result"""
    section_id: int
    current_utilization: float
    peak_utilization: float
    bottleneck_score: float
    recommendations: List[str]


@dataclass
class CapacityOptimizationResult:
    """Extended result for capacity optimization"""
    base_result: OptimizationResult
    capacity_improvements: List[Dict[str, Any]]
    utilization_changes: Dict[int, Dict[str, float]]
    bottlenecks_resolved: int
    throughput_improvement: float


class CapacityOptimizer:
    """Optimizer for railway capacity management"""
    
    def __init__(self, solver_type: Optional[str] = None):
        self.solver_type = solver_type or "heuristic"
        self.capacity_data: Dict[int, CapacityAnalysis] = {}
        
    async def optimize_capacity(
        self,
        sections: List[Dict[str, Any]],
        trains: List[Dict[str, Any]],
        demand_forecast: Optional[List[Dict[str, Any]]] = None,
        time_horizon_hours: int = 24,
        objectives: Optional[List[str]] = None
    ) -> CapacityOptimizationResult:
        """Optimize capacity allocation across the network"""
        
        logger.info(f"Starting capacity optimization for {len(sections)} sections")
        
        # Set default objectives
        if objectives is None:
            objectives = ["maximize_throughput", "minimize_bottlenecks", "balance_utilization"]
        
        # Analyze current capacity situation
        capacity_analysis = await self._analyze_capacity(sections, trains, demand_forecast)
        
        # Create optimization problem
        problem = self._create_capacity_problem(sections, trains, capacity_analysis, objectives)
        
        # Solve optimization
        solver = SolverFactory.create_solver(self.solver_type)
        base_result = await solver.solve(problem, timeout_seconds=300)
        
        # Process results
        capacity_result = await self._process_capacity_results(base_result, capacity_analysis)
        
        return capacity_result
    
    async def _analyze_capacity(
        self,
        sections: List[Dict[str, Any]],
        trains: List[Dict[str, Any]],
        demand_forecast: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[int, CapacityAnalysis]:
        """Analyze current capacity utilization and bottlenecks"""
        
        analysis = {}
        
        for section in sections:
            section_id = section["id"]
            max_capacity = section.get("max_capacity", 1)
            
            # Calculate current utilization
            trains_in_section = sum(1 for train in trains if train.get("current_section") == section_id)
            current_utilization = trains_in_section / max_capacity if max_capacity > 0 else 0
            
            # Estimate peak utilization (mock calculation)
            # In reality, this would use historical data and demand forecasts
            peak_utilization = min(1.2, current_utilization * 1.3 + np.random.uniform(0, 0.2))
            
            # Calculate bottleneck score
            bottleneck_score = self._calculate_bottleneck_score(
                section, current_utilization, peak_utilization, trains
            )
            
            # Generate recommendations
            recommendations = self._generate_capacity_recommendations(
                section, current_utilization, peak_utilization, bottleneck_score
            )
            
            analysis[section_id] = CapacityAnalysis(
                section_id=section_id,
                current_utilization=current_utilization,
                peak_utilization=peak_utilization,
                bottleneck_score=bottleneck_score,
                recommendations=recommendations
            )
        
        self.capacity_data = analysis
        return analysis
    
    def _calculate_bottleneck_score(
        self,
        section: Dict[str, Any],
        current_util: float,
        peak_util: float,
        trains: List[Dict[str, Any]]
    ) -> float:
        """Calculate bottleneck score for a section"""
        
        # Factors contributing to bottleneck score:
        # 1. Current utilization level
        # 2. Peak utilization level  
        # 3. Number of trains using this section
        # 4. Section type importance
        
        utilization_factor = (current_util + peak_util) / 2
        
        # Count trains that use this section
        section_usage = sum(1 for train in trains 
                          if section["id"] in train.get("route", []))
        usage_factor = min(1.0, section_usage / 10)  # Normalize to 0-1
        
        # Section type importance
        section_type = section.get("section_type", "MAIN_LINE")
        type_weights = {
            "MAIN_LINE": 1.0,
            "JUNCTION": 0.9,
            "STATION": 0.8,
            "BRANCH_LINE": 0.6,
            "YARD": 0.4,
            "SIDING": 0.2
        }
        type_factor = type_weights.get(section_type, 0.5)
        
        # Combined bottleneck score
        bottleneck_score = (
            utilization_factor * 0.5 +
            usage_factor * 0.3 +
            type_factor * 0.2
        )
        
        return min(1.0, bottleneck_score)
    
    def _generate_capacity_recommendations(
        self,
        section: Dict[str, Any],
        current_util: float,
        peak_util: float,
        bottleneck_score: float
    ) -> List[str]:
        """Generate capacity improvement recommendations"""
        
        recommendations = []
        
        # High utilization recommendations
        if current_util > 0.8:
            recommendations.append("Consider increasing section capacity")
            recommendations.append("Implement dynamic scheduling to reduce conflicts")
        
        # Peak utilization recommendations
        if peak_util > 0.9:
            recommendations.append("Add parallel tracks or sidings")
            recommendations.append("Implement peak hour management strategies")
        
        # Bottleneck recommendations
        if bottleneck_score > 0.7:
            recommendations.append("Priority bottleneck - requires immediate attention")
            recommendations.append("Consider traffic redistribution")
        
        # Type-specific recommendations
        section_type = section.get("section_type", "")
        if section_type == "JUNCTION" and current_util > 0.6:
            recommendations.append("Optimize signal timing at junction")
        elif section_type == "STATION" and current_util > 0.7:
            recommendations.append("Extend platform capacity or add platforms")
        
        return recommendations
    
    def _create_capacity_problem(
        self,
        sections: List[Dict[str, Any]],
        trains: List[Dict[str, Any]],
        capacity_analysis: Dict[int, CapacityAnalysis],
        objectives: List[str]
    ) -> OptimizationProblem:
        """Create optimization problem for capacity planning"""
        
        # Variables
        variables = {
            "sections": sections,
            "trains": trains,
            "capacity_analysis": {
                section_id: {
                    "current_utilization": analysis.current_utilization,
                    "peak_utilization": analysis.peak_utilization,
                    "bottleneck_score": analysis.bottleneck_score,
                    "recommendations": analysis.recommendations
                }
                for section_id, analysis in capacity_analysis.items()
            }
        }
        
        # Constraints
        constraints = []
        
        # Capacity expansion constraints
        for section in sections:
            constraints.append({
                "type": "capacity_expansion_limit",
                "section_id": section["id"],
                "max_expansion": section.get("max_capacity", 1) * 2,  # Can double capacity
                "expansion_cost": 1000000,  # Cost per capacity unit
                "description": f"Capacity expansion limit for section {section['id']}"
            })
        
        # Budget constraints
        constraints.append({
            "type": "budget_constraint",
            "max_budget": 50000000,  # 50M budget
            "description": "Total capacity improvement budget"
        })
        
        # Physical constraints
        for section in sections:
            constraints.append({
                "type": "physical_constraint",
                "section_id": section["id"],
                "max_physical_capacity": section.get("length_km", 10) * 2,  # Based on length
                "description": f"Physical capacity limit for section {section['id']}"
            })
        
        # Objectives
        problem_objectives = []
        for obj in objectives:
            if obj == "maximize_throughput":
                problem_objectives.append({
                    "type": "maximize",
                    "function": "system_throughput",
                    "weight": 2.0,
                    "description": "Maximize overall system throughput"
                })
            elif obj == "minimize_bottlenecks":
                problem_objectives.append({
                    "type": "minimize",
                    "function": "bottleneck_severity",
                    "weight": 1.5,
                    "description": "Minimize system bottlenecks"
                })
            elif obj == "balance_utilization":
                problem_objectives.append({
                    "type": "minimize",
                    "function": "utilization_variance",
                    "weight": 1.0,
                    "description": "Balance utilization across sections"
                })
            elif obj == "minimize_cost":
                problem_objectives.append({
                    "type": "minimize",
                    "function": "total_cost",
                    "weight": 0.8,
                    "description": "Minimize capacity improvement costs"
                })
        
        return OptimizationProblem(
            problem_type="capacity_optimization",
            variables=variables,
            constraints=constraints,
            objectives=problem_objectives,
            parameters={
                "solver_timeout": 300,
                "budget_limit": 50000000
            }
        )
    
    async def _process_capacity_results(
        self,
        base_result: OptimizationResult,
        capacity_analysis: Dict[int, CapacityAnalysis]
    ) -> CapacityOptimizationResult:
        """Process optimization results into capacity-specific format"""
        
        if not base_result.is_successful():
            return CapacityOptimizationResult(
                base_result=base_result,
                capacity_improvements=[],
                utilization_changes={},
                bottlenecks_resolved=0,
                throughput_improvement=0.0
            )
        
        # Extract capacity improvements from decisions
        capacity_improvements = []
        utilization_changes = {}
        bottlenecks_resolved = 0
        
        for decision in base_result.decisions:
            if decision.get("type") == "capacity_expansion":
                section_id = decision.get("section_id")
                improvement = {
                    "section_id": section_id,
                    "improvement_type": "capacity_expansion",
                    "old_capacity": decision.get("old_capacity"),
                    "new_capacity": decision.get("new_capacity"),
                    "cost": decision.get("cost", 0),
                    "expected_utilization_reduction": decision.get("utilization_reduction", 0)
                }
                capacity_improvements.append(improvement)
                
                # Calculate utilization changes
                if section_id in capacity_analysis:
                    old_util = capacity_analysis[section_id].current_utilization
                    new_util = max(0.1, old_util - decision.get("utilization_reduction", 0))
                    utilization_changes[section_id] = {
                        "old_utilization": old_util,
                        "new_utilization": new_util,
                        "improvement": old_util - new_util
                    }
                    
                    # Count bottleneck resolution
                    if capacity_analysis[section_id].bottleneck_score > 0.7 and new_util < 0.7:
                        bottlenecks_resolved += 1
            
            elif decision.get("type") == "traffic_redistribution":
                improvement = {
                    "section_id": decision.get("section_id"),
                    "improvement_type": "traffic_redistribution",
                    "redistributed_trains": decision.get("train_count", 0),
                    "alternative_routes": decision.get("alternative_routes", []),
                    "cost": 0,  # No infrastructure cost
                    "expected_utilization_reduction": decision.get("utilization_reduction", 0)
                }
                capacity_improvements.append(improvement)
        
        # Calculate overall throughput improvement
        total_utilization_improvement = sum(
            change["improvement"] 
            for change in utilization_changes.values()
        )
        throughput_improvement = total_utilization_improvement * 10  # Mock calculation
        
        return CapacityOptimizationResult(
            base_result=base_result,
            capacity_improvements=capacity_improvements,
            utilization_changes=utilization_changes,
            bottlenecks_resolved=bottlenecks_resolved,
            throughput_improvement=throughput_improvement
        )
    
    async def identify_bottlenecks(
        self,
        sections: List[Dict[str, Any]],
        trains: List[Dict[str, Any]],
        threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """Identify system bottlenecks"""
        
        capacity_analysis = await self._analyze_capacity(sections, trains)
        
        bottlenecks = []
        
        for section_id, analysis in capacity_analysis.items():
            if analysis.bottleneck_score >= threshold:
                section = next((s for s in sections if s["id"] == section_id), None)
                
                bottleneck = {
                    "section_id": section_id,
                    "section_code": section.get("section_code", f"SEC-{section_id}") if section else f"SEC-{section_id}",
                    "bottleneck_score": analysis.bottleneck_score,
                    "current_utilization": analysis.current_utilization,
                    "peak_utilization": analysis.peak_utilization,
                    "severity": self._get_bottleneck_severity(analysis.bottleneck_score),
                    "impact": self._calculate_bottleneck_impact(section_id, trains),
                    "recommendations": analysis.recommendations
                }
                bottlenecks.append(bottleneck)
        
        # Sort by bottleneck score (highest first)
        bottlenecks.sort(key=lambda x: x["bottleneck_score"], reverse=True)
        
        return bottlenecks
    
    def _get_bottleneck_severity(self, score: float) -> str:
        """Get bottleneck severity level"""
        if score >= 0.9:
            return "critical"
        elif score >= 0.8:
            return "high"
        elif score >= 0.7:
            return "medium"
        else:
            return "low"
    
    def _calculate_bottleneck_impact(self, section_id: int, trains: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate the impact of a bottleneck"""
        
        # Count affected trains
        affected_trains = [
            train for train in trains 
            if section_id in train.get("route", []) or train.get("current_section") == section_id
        ]
        
        # Calculate delay impact
        total_delay = sum(train.get("delay_minutes", 0) for train in affected_trains)
        avg_delay = total_delay / len(affected_trains) if affected_trains else 0
        
        # Estimate passenger/cargo impact
        passenger_impact = sum(train.get("capacity_passengers", 0) for train in affected_trains)
        cargo_impact = sum(train.get("capacity_cargo_tons", 0) for train in affected_trains if train.get("capacity_cargo_tons"))
        
        return {
            "affected_trains": len(affected_trains),
            "total_delay_minutes": total_delay,
            "average_delay_minutes": avg_delay,
            "passenger_impact": passenger_impact,
            "cargo_impact_tons": cargo_impact,
            "economic_impact_estimate": total_delay * 100  # $100 per delay minute (simplified)
        }
    
    async def suggest_capacity_improvements(
        self,
        sections: List[Dict[str, Any]],
        trains: List[Dict[str, Any]],
        budget_limit: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """Suggest capacity improvement options"""
        
        capacity_analysis = await self._analyze_capacity(sections, trains)
        bottlenecks = await self.identify_bottlenecks(sections, trains)
        
        suggestions = []
        
        # Prioritize suggestions by bottleneck severity and cost-benefit
        for bottleneck in bottlenecks:
            section_id = bottleneck["section_id"]
            section = next((s for s in sections if s["id"] == section_id), None)
            
            if not section:
                continue
            
            current_capacity = section.get("max_capacity", 1)
            
            # Capacity expansion suggestion
            expansion_suggestion = {
                "type": "capacity_expansion",
                "section_id": section_id,
                "section_code": section.get("section_code"),
                "priority": bottleneck["severity"],
                "current_capacity": current_capacity,
                "suggested_capacity": current_capacity + 1,
                "estimated_cost": 2000000,  # 2M per capacity unit
                "expected_benefits": {
                    "utilization_reduction": 0.3,
                    "delay_reduction": bottleneck["impact"]["average_delay_minutes"] * 0.4,
                    "throughput_increase": 0.2
                },
                "implementation_time_months": 12,
                "description": f"Expand capacity of {section.get('section_code')} from {current_capacity} to {current_capacity + 1}"
            }
            suggestions.append(expansion_suggestion)
            
            # Traffic redistribution suggestion (lower cost alternative)
            if bottleneck["impact"]["affected_trains"] > 2:
                redistribution_suggestion = {
                    "type": "traffic_redistribution",
                    "section_id": section_id,
                    "section_code": section.get("section_code"),
                    "priority": "medium",
                    "affected_trains": bottleneck["impact"]["affected_trains"],
                    "estimated_cost": 50000,  # Lower cost - operational change
                    "expected_benefits": {
                        "utilization_reduction": 0.15,
                        "delay_reduction": bottleneck["impact"]["average_delay_minutes"] * 0.2,
                        "throughput_increase": 0.1
                    },
                    "implementation_time_months": 2,
                    "description": f"Redistribute traffic from {section.get('section_code')} to alternative routes"
                }
                suggestions.append(redistribution_suggestion)
            
            # Technology improvement suggestion
            if section.get("section_type") == "JUNCTION":
                tech_suggestion = {
                    "type": "technology_upgrade",
                    "section_id": section_id,
                    "section_code": section.get("section_code"),
                    "priority": "medium",
                    "upgrade_type": "smart_signaling",
                    "estimated_cost": 500000,
                    "expected_benefits": {
                        "utilization_reduction": 0.1,
                        "delay_reduction": bottleneck["impact"]["average_delay_minutes"] * 0.15,
                        "efficiency_increase": 0.25
                    },
                    "implementation_time_months": 6,
                    "description": f"Implement smart signaling system at {section.get('section_code')}"
                }
                suggestions.append(tech_suggestion)
        
        # Filter by budget if specified
        if budget_limit:
            suggestions = [s for s in suggestions if s["estimated_cost"] <= budget_limit]
        
        # Sort by cost-benefit ratio
        for suggestion in suggestions:
            benefits = suggestion["expected_benefits"]
            cost = suggestion["estimated_cost"]
            benefit_score = (
                benefits.get("utilization_reduction", 0) * 0.4 +
                benefits.get("delay_reduction", 0) * 0.01 +  # Convert minutes to normalized score
                benefits.get("throughput_increase", 0) * 0.3
            )
            suggestion["cost_benefit_ratio"] = benefit_score / (cost / 1000000) if cost > 0 else 0
        
        suggestions.sort(key=lambda x: x["cost_benefit_ratio"], reverse=True)
        
        return suggestions
    
    async def simulate_capacity_changes(
        self,
        sections: List[Dict[str, Any]],
        trains: List[Dict[str, Any]],
        improvements: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Simulate the impact of capacity changes"""
        
        # Create modified sections with improvements
        modified_sections = []
        for section in sections:
            modified_section = section.copy()
            
            # Apply improvements
            for improvement in improvements:
                if improvement["section_id"] == section["id"]:
                    if improvement["type"] == "capacity_expansion":
                        modified_section["max_capacity"] = improvement["suggested_capacity"]
                    elif improvement["type"] == "technology_upgrade":
                        # Mock technology improvement effect
                        modified_section["efficiency_factor"] = 1.2
            
            modified_sections.append(modified_section)
        
        # Analyze capacity before and after
        before_analysis = await self._analyze_capacity(sections, trains)
        after_analysis = await self._analyze_capacity(modified_sections, trains)
        
        # Calculate improvements
        improvements_summary = {
            "total_cost": sum(imp["estimated_cost"] for imp in improvements),
            "sections_improved": len(improvements),
            "utilization_improvements": {},
            "bottleneck_changes": {},
            "overall_improvement": 0
        }
        
        total_improvement = 0
        improved_sections = 0
        
        for section_id in before_analysis:
            if section_id in after_analysis:
                before = before_analysis[section_id]
                after = after_analysis[section_id]
                
                util_improvement = before.current_utilization - after.current_utilization
                bottleneck_improvement = before.bottleneck_score - after.bottleneck_score
                
                if util_improvement > 0 or bottleneck_improvement > 0:
                    improvements_summary["utilization_improvements"][section_id] = {
                        "before": before.current_utilization,
                        "after": after.current_utilization,
                        "improvement": util_improvement
                    }
                    
                    improvements_summary["bottleneck_changes"][section_id] = {
                        "before": before.bottleneck_score,
                        "after": after.bottleneck_score,
                        "improvement": bottleneck_improvement
                    }
                    
                    total_improvement += util_improvement + bottleneck_improvement
                    improved_sections += 1
        
        improvements_summary["overall_improvement"] = total_improvement / improved_sections if improved_sections > 0 else 0
        
        return improvements_summary


# Export classes
__all__ = [
    "CapacityOptimizer",
    "CapacityAnalysis",
    "CapacityOptimizationResult"
]