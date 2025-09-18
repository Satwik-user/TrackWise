"""
Constraint management for TrackWise Railway Optimization System
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Union, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ConstraintType(str, Enum):
    """Types of optimization constraints"""
    CAPACITY = "capacity"
    SAFETY = "safety"
    TEMPORAL = "temporal"
    RESOURCE = "resource"
    OPERATIONAL = "operational"
    REGULATORY = "regulatory"
    PHYSICAL = "physical"
    BUSINESS = "business"


class ConstraintPriority(str, Enum):
    """Constraint priority levels"""
    CRITICAL = "critical"    # Must not be violated
    HIGH = "high"           # Should not be violated
    MEDIUM = "medium"       # Preferably not violated
    LOW = "low"            # Can be violated if necessary


@dataclass
class ConstraintViolation:
    """Constraint violation information"""
    constraint_id: str
    violation_type: str
    severity: float
    description: str
    affected_entities: List[int]
    penalty_cost: float
    suggested_fix: Optional[str] = None


@dataclass
class ConstraintDefinition:
    """Definition of an optimization constraint"""
    constraint_id: str
    constraint_type: ConstraintType
    priority: ConstraintPriority
    description: str
    parameters: Dict[str, Any]
    validation_function: Optional[Callable] = None
    penalty_function: Optional[Callable] = None
    
    def validate(self, solution: Dict[str, Any]) -> List[ConstraintViolation]:
        """Validate solution against this constraint"""
        if self.validation_function:
            return self.validation_function(solution, self.parameters)
        return []
    
    def calculate_penalty(self, violation: ConstraintViolation) -> float:
        """Calculate penalty for constraint violation"""
        if self.penalty_function:
            return self.penalty_function(violation, self.parameters)
        return violation.severity * 1000  # Default penalty


class BaseConstraint(ABC):
    """Base class for optimization constraints"""
    
    def __init__(self, constraint_id: str, priority: ConstraintPriority = ConstraintPriority.MEDIUM):
        self.constraint_id = constraint_id
        self.priority = priority
        self.enabled = True
    
    @abstractmethod
    def validate(self, solution: Dict[str, Any]) -> List[ConstraintViolation]:
        """Validate solution against this constraint"""
        pass
    
    @abstractmethod
    def get_description(self) -> str:
        """Get human-readable description of constraint"""
        pass
    
    def get_penalty_weight(self) -> float:
        """Get penalty weight based on priority"""
        weights = {
            ConstraintPriority.CRITICAL: 10000,
            ConstraintPriority.HIGH: 1000,
            ConstraintPriority.MEDIUM: 100,
            ConstraintPriority.LOW: 10
        }
        return weights.get(self.priority, 100)


class CapacityConstraint(BaseConstraint):
    """Section capacity constraint"""
    
    def __init__(
        self,
        constraint_id: str,
        section_id: int,
        max_capacity: int,
        priority: ConstraintPriority = ConstraintPriority.HIGH
    ):
        super().__init__(constraint_id, priority)
        self.section_id = section_id
        self.max_capacity = max_capacity
    
    def validate(self, solution: Dict[str, Any]) -> List[ConstraintViolation]:
        """Validate section capacity is not exceeded"""
        violations = []
        
        # Count trains assigned to this section
        trains_in_section = 0
        affected_trains = []
        
        for decision in solution.get("decisions", []):
            if (decision.get("type") == "section_assignment" and 
                decision.get("assigned_section") == self.section_id):
                trains_in_section += 1
                affected_trains.append(decision.get("train_id"))
        
        # Check capacity violation
        if trains_in_section > self.max_capacity:
            violation = ConstraintViolation(
                constraint_id=self.constraint_id,
                violation_type="capacity_exceeded",
                severity=(trains_in_section - self.max_capacity) / self.max_capacity,
                description=f"Section {self.section_id} capacity exceeded: {trains_in_section}/{self.max_capacity}",
                affected_entities=affected_trains,
                penalty_cost=self.get_penalty_weight() * (trains_in_section - self.max_capacity)
            )
            violations.append(violation)
        
        return violations
    
    def get_description(self) -> str:
        return f"Section {self.section_id} capacity must not exceed {self.max_capacity} trains"


class SafetyConstraint(BaseConstraint):
    """Safety constraint for minimum separation"""
    
    def __init__(
        self,
        constraint_id: str,
        min_separation_km: float = 2.0,
        priority: ConstraintPriority = ConstraintPriority.CRITICAL
    ):
        super().__init__(constraint_id, priority)
        self.min_separation_km = min_separation_km
    
    def validate(self, solution: Dict[str, Any]) -> List[ConstraintViolation]:
        """Validate minimum separation between trains"""
        violations = []
        
        # Group trains by section
        section_trains = {}
        for decision in solution.get("decisions", []):
            if decision.get("type") == "section_assignment":
                section_id = decision.get("assigned_section")
                train_id = decision.get("train_id")
                
                if section_id not in section_trains:
                    section_trains[section_id] = []
                section_trains[section_id].append(train_id)
        
        # Check separation within each section
        for section_id, train_ids in section_trains.items():
            if len(train_ids) > 1:
                # Simplified check - in reality would use actual positions
                violation = ConstraintViolation(
                    constraint_id=self.constraint_id,
                    violation_type="insufficient_separation",
                    severity=0.8,  # High severity for safety
                    description=f"Multiple trains in section {section_id} may violate separation requirements",
                    affected_entities=train_ids,
                    penalty_cost=self.get_penalty_weight() * len(train_ids),
                    suggested_fix="Increase temporal separation or use alternative routes"
                )
                violations.append(violation)
        
        return violations
    
    def get_description(self) -> str:
        return f"Trains must maintain minimum {self.min_separation_km}km separation"


class TemporalConstraint(BaseConstraint):
    """Temporal constraint for schedule ordering"""
    
    def __init__(
        self,
        constraint_id: str,
        train_id: int,
        departure_window: tuple,
        arrival_window: tuple,
        priority: ConstraintPriority = ConstraintPriority.MEDIUM
    ):
        super().__init__(constraint_id, priority)
        self.train_id = train_id
        self.departure_window = departure_window  # (min_time, max_time)
        self.arrival_window = arrival_window
    
    def validate(self, solution: Dict[str, Any]) -> List[ConstraintViolation]:
        """Validate temporal constraints"""
        violations = []
        
        for decision in solution.get("decisions", []):
            if (decision.get("type") == "schedule_adjustment" and 
                decision.get("train_id") == self.train_id):
                
                new_departure = decision.get("new_departure")
                if isinstance(new_departure, str):
                    new_departure = datetime.fromisoformat(new_departure.replace('Z', '+00:00'))
                
                # Check departure window
                min_dep, max_dep = self.departure_window
                if new_departure < min_dep or new_departure > max_dep:
                    violation = ConstraintViolation(
                        constraint_id=self.constraint_id,
                        violation_type="departure_window_violation",
                        severity=0.6,
                        description=f"Train {self.train_id} departure outside allowed window",
                        affected_entities=[self.train_id],
                        penalty_cost=self.get_penalty_weight() * 0.5
                    )
                    violations.append(violation)
        
        return violations
    
    def get_description(self) -> str:
        return f"Train {self.train_id} must depart and arrive within specified time windows"


class ResourceConstraint(BaseConstraint):
    """Resource availability constraint"""
    
    def __init__(
        self,
        constraint_id: str,
        resource_type: str,
        max_concurrent_usage: int,
        priority: ConstraintPriority = ConstraintPriority.HIGH
    ):
        super().__init__(constraint_id, priority)
        self.resource_type = resource_type
        self.max_concurrent_usage = max_concurrent_usage
    
    def validate(self, solution: Dict[str, Any]) -> List[ConstraintViolation]:
        """Validate resource usage limits"""
        violations = []
        
        # Count resource usage
        resource_usage = 0
        using_entities = []
        
        for decision in solution.get("decisions", []):
            if decision.get("type") == "resource_allocation":
                if decision.get("resource_type") == self.resource_type:
                    resource_usage += decision.get("quantity", 1)
                    using_entities.append(decision.get("entity_id"))
        
        # Check constraint violation
        if resource_usage > self.max_concurrent_usage:
            violation = ConstraintViolation(
                constraint_id=self.constraint_id,
                violation_type="resource_overallocation",
                severity=(resource_usage - self.max_concurrent_usage) / self.max_concurrent_usage,
                description=f"Resource {self.resource_type} overallocated: {resource_usage}/{self.max_concurrent_usage}",
                affected_entities=using_entities,
                penalty_cost=self.get_penalty_weight() * (resource_usage - self.max_concurrent_usage)
            )
            violations.append(violation)
        
        return violations
    
    def get_description(self) -> str:
        return f"Resource {self.resource_type} usage must not exceed {self.max_concurrent_usage}"


class OperationalConstraint(BaseConstraint):
    """Operational business rule constraint"""
    
    def __init__(
        self,
        constraint_id: str,
        rule_description: str,
        validation_func: Callable,
        priority: ConstraintPriority = ConstraintPriority.MEDIUM
    ):
        super().__init__(constraint_id, priority)
        self.rule_description = rule_description
        self.validation_func = validation_func
    
    def validate(self, solution: Dict[str, Any]) -> List[ConstraintViolation]:
        """Validate using custom validation function"""
        try:
            return self.validation_func(solution, self.constraint_id)
        except Exception as e:
            logger.error(f"Error validating operational constraint {self.constraint_id}: {e}")
            return []
    
    def get_description(self) -> str:
        return self.rule_description


class ConstraintManager:
    """Manager for handling optimization constraints"""
    
    def __init__(self):
        self.constraints: Dict[str, BaseConstraint] = {}
        self.constraint_groups: Dict[str, List[str]] = {}
        self.violation_history: List[ConstraintViolation] = []
    
    def add_constraint(self, constraint: BaseConstraint):
        """Add a constraint to the manager"""
        self.constraints[constraint.constraint_id] = constraint
        logger.info(f"Added constraint: {constraint.constraint_id} ({constraint.priority.value})")
    
    def remove_constraint(self, constraint_id: str):
        """Remove a constraint"""
        if constraint_id in self.constraints:
            del self.constraints[constraint_id]
            logger.info(f"Removed constraint: {constraint_id}")
    
    def enable_constraint(self, constraint_id: str):
        """Enable a constraint"""
        if constraint_id in self.constraints:
            self.constraints[constraint_id].enabled = True
    
    def disable_constraint(self, constraint_id: str):
        """Disable a constraint"""
        if constraint_id in self.constraints:
            self.constraints[constraint_id].enabled = False
    
    def create_constraint_group(self, group_name: str, constraint_ids: List[str]):
        """Create a group of related constraints"""
        self.constraint_groups[group_name] = constraint_ids
    
    def enable_constraint_group(self, group_name: str):
        """Enable all constraints in a group"""
        if group_name in self.constraint_groups:
            for constraint_id in self.constraint_groups[group_name]:
                self.enable_constraint(constraint_id)
    
    def disable_constraint_group(self, group_name: str):
        """Disable all constraints in a group"""
        if group_name in self.constraint_groups:
            for constraint_id in self.constraint_groups[group_name]:
                self.disable_constraint(constraint_id)
    
    def validate_solution(self, solution: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a solution against all enabled constraints"""
        all_violations = []
        constraint_results = {}
        
        for constraint_id, constraint in self.constraints.items():
            if not constraint.enabled:
                continue
            
            try:
                violations = constraint.validate(solution)
                constraint_results[constraint_id] = {
                    "violations": len(violations),
                    "details": violations
                }
                all_violations.extend(violations)
                
            except Exception as e:
                logger.error(f"Error validating constraint {constraint_id}: {e}")
                constraint_results[constraint_id] = {
                    "violations": 0,
                    "error": str(e)
                }
        
        # Store violation history
        self.violation_history.extend(all_violations)
        
        # Calculate total penalty
        total_penalty = sum(v.penalty_cost for v in all_violations)
        
        # Categorize violations by severity
        critical_violations = [v for v in all_violations if v.severity >= 0.8]
        high_violations = [v for v in all_violations if 0.6 <= v.severity < 0.8]
        medium_violations = [v for v in all_violations if 0.4 <= v.severity < 0.6]
        low_violations = [v for v in all_violations if v.severity < 0.4]
        
        return {
            "is_feasible": len(critical_violations) == 0,
            "total_violations": len(all_violations),
            "total_penalty": total_penalty,
            "violations_by_severity": {
                "critical": len(critical_violations),
                "high": len(high_violations),
                "medium": len(medium_violations),
                "low": len(low_violations)
            },
            "constraint_results": constraint_results,
            "all_violations": [
                {
                    "constraint_id": v.constraint_id,
                    "type": v.violation_type,
                    "severity": v.severity,
                    "description": v.description,
                    "penalty": v.penalty_cost,
                    "suggested_fix": v.suggested_fix
                }
                for v in all_violations
            ]
        }
    
    def get_constraint_summary(self) -> Dict[str, Any]:
        """Get summary of all constraints"""
        enabled_constraints = [c for c in self.constraints.values() if c.enabled]
        disabled_constraints = [c for c in self.constraints.values() if not c.enabled]
        
        by_type = {}
        by_priority = {}
        
        for constraint in enabled_constraints:
            # Group by type
            constraint_type = getattr(constraint, 'constraint_type', 'unknown')
            if constraint_type not in by_type:
                by_type[constraint_type] = 0
            by_type[constraint_type] += 1
            
            # Group by priority
            priority = constraint.priority.value
            if priority not in by_priority:
                by_priority[priority] = 0
            by_priority[priority] += 1
        
        return {
            "total_constraints": len(self.constraints),
            "enabled_constraints": len(enabled_constraints),
            "disabled_constraints": len(disabled_constraints),
            "constraints_by_type": by_type,
            "constraints_by_priority": by_priority,
            "constraint_groups": len(self.constraint_groups),
            "recent_violations": len([v for v in self.violation_history[-100:]])  # Last 100 violations
        }
    
    def create_railway_constraints(
        self,
        trains: List[Dict[str, Any]],
        sections: List[Dict[str, Any]]
    ):
        """Create standard railway optimization constraints"""
        
        # Capacity constraints for each section
        for section in sections:
            constraint = CapacityConstraint(
                constraint_id=f"capacity_{section['id']}",
                section_id=section["id"],
                max_capacity=section.get("max_capacity", 1),
                priority=ConstraintPriority.HIGH
            )
            self.add_constraint(constraint)
        
        # Safety constraints
        safety_constraint = SafetyConstraint(
            constraint_id="min_separation",
            min_separation_km=2.0,
            priority=ConstraintPriority.CRITICAL
        )
        self.add_constraint(safety_constraint)
        
        # Temporal constraints for each train
        for train in trains:
            if train.get("scheduled_departure") and train.get("scheduled_arrival"):
                departure_time = train["scheduled_departure"]
                if isinstance(departure_time, str):
                    departure_time = datetime.fromisoformat(departure_time.replace('Z', '+00:00'))
                
                # Allow ±30 minutes flexibility
                departure_window = (
                    departure_time - timedelta(minutes=30),
                    departure_time + timedelta(minutes=30)
                )
                
                arrival_time = train.get("scheduled_arrival")
                if isinstance(arrival_time, str):
                    arrival_time = datetime.fromisoformat(arrival_time.replace('Z', '+00:00'))
                
                arrival_window = (
                    arrival_time - timedelta(minutes=60),
                    arrival_time + timedelta(minutes=60)
                )
                
                constraint = TemporalConstraint(
                    constraint_id=f"temporal_{train['id']}",
                    train_id=train["id"],
                    departure_window=departure_window,
                    arrival_window=arrival_window,
                    priority=ConstraintPriority.MEDIUM
                )
                self.add_constraint(constraint)
        
        # Resource constraints
        maintenance_constraint = ResourceConstraint(
            constraint_id="maintenance_crews",
            resource_type="maintenance_crew",
            max_concurrent_usage=5,
            priority=ConstraintPriority.HIGH
        )
        self.add_constraint(maintenance_constraint)
        
        # Operational constraints
        def validate_train_types(solution: Dict[str, Any], constraint_id: str) -> List[ConstraintViolation]:
            """Validate that passenger and freight trains don't conflict"""
            violations = []
            
            # Group assignments by section
            section_assignments = {}
            for decision in solution.get("decisions", []):
                if decision.get("type") == "section_assignment":
                    section_id = decision.get("assigned_section")
                    train_id = decision.get("train_id")
                    
                    if section_id not in section_assignments:
                        section_assignments[section_id] = []
                    section_assignments[section_id].append(train_id)
            
            # Check for train type conflicts
            for section_id, train_ids in section_assignments.items():
                if len(train_ids) > 1:
                    # In reality, would check actual train types
                    # For now, just flag potential conflicts
                    pass
            
            return violations
        
        operational_constraint = OperationalConstraint(
            constraint_id="train_type_separation",
            rule_description="Passenger and freight trains should avoid simultaneous section usage",
            validation_func=validate_train_types,
            priority=ConstraintPriority.MEDIUM
        )
        self.add_constraint(operational_constraint)
        
        # Create constraint groups
        self.create_constraint_group("safety", ["min_separation"])
        self.create_constraint_group("capacity", [f"capacity_{s['id']}" for s in sections])
        self.create_constraint_group("temporal", [f"temporal_{t['id']}" for t in trains if t.get("scheduled_departure")])
        self.create_constraint_group("operational", ["train_type_separation", "maintenance_crews"])
    
    def get_constraint_violations_report(self) -> Dict[str, Any]:
        """Generate detailed constraint violations report"""
        
        if not self.violation_history:
            return {"message": "No constraint violations recorded"}
        
        # Analyze violation patterns
        violations_by_constraint = {}
        violations_by_type = {}
        violations_by_severity = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        
        for violation in self.violation_history[-1000:]:  # Last 1000 violations
            # By constraint
            constraint_id = violation.constraint_id
            if constraint_id not in violations_by_constraint:
                violations_by_constraint[constraint_id] = 0
            violations_by_constraint[constraint_id] += 1
            
            # By type
            violation_type = violation.violation_type
            if violation_type not in violations_by_type:
                violations_by_type[violation_type] = 0
            violations_by_type[violation_type] += 1
            
            # By severity
            if violation.severity >= 0.8:
                violations_by_severity["critical"] += 1
            elif violation.severity >= 0.6:
                violations_by_severity["high"] += 1
            elif violation.severity >= 0.4:
                violations_by_severity["medium"] += 1
            else:
                violations_by_severity["low"] += 1
        
        # Most problematic constraints
        most_violated = sorted(violations_by_constraint.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # Total penalty cost
        total_penalty = sum(v.penalty_cost for v in self.violation_history[-1000:])
        
        return {
            "total_violations": len(self.violation_history),
            "recent_violations": len(self.violation_history[-1000:]),
            "violations_by_constraint": violations_by_constraint,
            "violations_by_type": violations_by_type,
            "violations_by_severity": violations_by_severity,
            "most_violated_constraints": most_violated,
            "total_penalty_cost": total_penalty,
            "average_penalty_per_violation": total_penalty / len(self.violation_history[-1000:]) if self.violation_history[-1000:] else 0
        }


# Export classes
__all__ = [
    "ConstraintManager",
    "BaseConstraint",
    "CapacityConstraint",
    "SafetyConstraint", 
    "TemporalConstraint",
    "ResourceConstraint",
    "OperationalConstraint",
    "ConstraintType",
    "ConstraintPriority",
    "ConstraintViolation",
    "ConstraintDefinition"
]