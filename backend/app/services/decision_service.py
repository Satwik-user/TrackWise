"""
Decision making service for TrackWise Railway Optimization System
"""

from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
import logging
from dataclasses import dataclass
from enum import Enum
import asyncio

from app.models.train import Train, TrainStatus
from app.models.section import Section, SectionStatus
from app.models.optimization import OptimizationRun, OptimizationDecision
from app.services.train_service import train_service
from app.services.section_service import section_service
from app.services.optimization_service import optimization_service
from app.utils.exceptions import ValidationError, NotFoundError

logger = logging.getLogger(__name__)


class DecisionType(str, Enum):
    """Types of decisions the system can make"""
    ROUTE_CHANGE = "route_change"
    SPEED_ADJUSTMENT = "speed_adjustment"
    SCHEDULE_MODIFICATION = "schedule_modification"
    SECTION_ALLOCATION = "section_allocation"
    MAINTENANCE_SCHEDULING = "maintenance_scheduling"
    EMERGENCY_RESPONSE = "emergency_response"
    CAPACITY_REALLOCATION = "capacity_reallocation"


class DecisionPriority(str, Enum):
    """Decision priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class DecisionStatus(str, Enum):
    """Decision implementation status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    IMPLEMENTED = "implemented"
    FAILED = "failed"
    EXPIRED = "expired"


@dataclass
class DecisionContext:
    """Context information for decision making"""
    timestamp: datetime
    triggering_event: str
    affected_entities: List[Dict[str, Any]]
    system_state: Dict[str, Any]
    constraints: List[Dict[str, Any]]
    objectives: List[str]


@dataclass
class DecisionRecommendation:
    """Decision recommendation with rationale"""
    decision_type: DecisionType
    priority: DecisionPriority
    confidence: float
    expected_impact: Dict[str, float]
    implementation_cost: float
    risk_assessment: Dict[str, float]
    rationale: str
    alternatives: List[Dict[str, Any]]


class DecisionEngine:
    """Core decision-making engine"""
    
    def __init__(self):
        self.decision_rules = {}
        self.load_decision_rules()
    
    def load_decision_rules(self):
        """Load decision-making rules and policies"""
        
        self.decision_rules = {
            "delay_threshold": 15,  # minutes
            "capacity_threshold": 0.8,  # 80%
            "emergency_response_time": 5,  # minutes
            "maintenance_priority_threshold": 0.9,
            "route_change_cost_factor": 100,
            "speed_adjustment_limit": 0.2  # 20% max change
        }
    
    async def analyze_situation(
        self,
        db: AsyncSession,
        context: DecisionContext
    ) -> List[DecisionRecommendation]:
        """Analyze situation and generate decision recommendations"""
        
        recommendations = []
        
        # Analyze for different decision types
        delay_decisions = await self._analyze_delay_situations(db, context)
        capacity_decisions = await self._analyze_capacity_situations(db, context)
        maintenance_decisions = await self._analyze_maintenance_situations(db, context)
        emergency_decisions = await self._analyze_emergency_situations(db, context)
        
        recommendations.extend(delay_decisions)
        recommendations.extend(capacity_decisions)
        recommendations.extend(maintenance_decisions)
        recommendations.extend(emergency_decisions)
        
        # Sort by priority and confidence
        recommendations.sort(key=lambda x: (x.priority.value, -x.confidence))
        
        return recommendations
    
    async def _analyze_delay_situations(
        self,
        db: AsyncSession,
        context: DecisionContext
    ) -> List[DecisionRecommendation]:
        """Analyze delay situations and recommend actions"""
        
        recommendations = []
        
        # Check for trains with significant delays
        delayed_trains_query = select(Train).where(
            and_(
                Train.delay_minutes >= self.decision_rules["delay_threshold"],
                Train.is_active == True,
                Train.is_deleted == False
            )
        )
        
        result = await db.execute(delayed_trains_query)
        delayed_trains = result.scalars().all()
        
        for train in delayed_trains:
            # Recommend route change for severely delayed trains
            if train.delay_minutes > 30:
                recommendation = DecisionRecommendation(
                    decision_type=DecisionType.ROUTE_CHANGE,
                    priority=DecisionPriority.HIGH,
                    confidence=0.85,
                    expected_impact={
                        "delay_reduction": 15.0,
                        "affected_passengers": 120,
                        "cost_increase": 500.0
                    },
                    implementation_cost=1000.0,
                    risk_assessment={
                        "success_probability": 0.85,
                        "disruption_risk": 0.3
                    },
                    rationale=f"Train {train.train_number} has {train.delay_minutes} minutes delay. Alternative route can reduce delay by 15 minutes.",
                    alternatives=[
                        {"type": "speed_increase", "impact": "10 minute reduction", "cost": 200},
                        {"type": "priority_scheduling", "impact": "8 minute reduction", "cost": 100}
                    ]
                )
                recommendations.append(recommendation)
            
            # Recommend speed adjustment for moderately delayed trains
            elif 15 <= train.delay_minutes <= 30:
                recommendation = DecisionRecommendation(
                    decision_type=DecisionType.SPEED_ADJUSTMENT,
                    priority=DecisionPriority.MEDIUM,
                    confidence=0.75,
                    expected_impact={
                        "delay_reduction": 8.0,
                        "energy_increase": 15.0,
                        "schedule_recovery": 0.7
                    },
                    implementation_cost=200.0,
                    risk_assessment={
                        "success_probability": 0.9,
                        "safety_risk": 0.1
                    },
                    rationale=f"Train {train.train_number} can recover {train.delay_minutes // 2} minutes through 10% speed increase.",
                    alternatives=[
                        {"type": "priority_signals", "impact": "5 minute reduction", "cost": 50},
                        {"type": "skip_optional_stops", "impact": "6 minute reduction", "cost": 300}
                    ]
                )
                recommendations.append(recommendation)
        
        return recommendations
    
    async def _analyze_capacity_situations(
        self,
        db: AsyncSession,
        context: DecisionContext
    ) -> List[DecisionRecommendation]:
        """Analyze capacity situations and recommend actions"""
        
        recommendations = []
        
        # Check for overcapacity sections
        sections_query = select(Section).where(
            and_(Section.is_active == True, Section.is_deleted == False)
        )
        
        result = await db.execute(sections_query)
        sections = result.scalars().all()
        
        for section in sections:
            # Get current train count in section
            trains_in_section_query = select(func.count(Train.id)).where(
                and_(
                    Train.current_section == section.id,
                    Train.is_active == True,
                    Train.is_deleted == False
                )
            )
            
            train_count_result = await db.execute(trains_in_section_query)
            current_trains = train_count_result.scalar()
            
            utilization = current_trains / section.max_capacity if section.max_capacity > 0 else 0
            
            # Recommend capacity reallocation for high utilization
            if utilization >= self.decision_rules["capacity_threshold"]:
                recommendation = DecisionRecommendation(
                    decision_type=DecisionType.CAPACITY_REALLOCATION,
                    priority=DecisionPriority.HIGH if utilization > 0.9 else DecisionPriority.MEDIUM,
                    confidence=0.8,
                    expected_impact={
                        "utilization_reduction": 20.0,
                        "throughput_improvement": 15.0,
                        "delay_prevention": 10.0
                    },
                    implementation_cost=800.0,
                    risk_assessment={
                        "success_probability": 0.85,
                        "disruption_risk": 0.4
                    },
                    rationale=f"Section {section.section_code} at {utilization*100:.1f}% capacity. Redistribute traffic to parallel sections.",
                    alternatives=[
                        {"type": "temporary_speed_limits", "impact": "10% reduction", "cost": 100},
                        {"type": "dynamic_scheduling", "impact": "15% reduction", "cost": 300}
                    ]
                )
                recommendations.append(recommendation)
        
        return recommendations
    
    async def _analyze_maintenance_situations(
        self,
        db: AsyncSession,
        context: DecisionContext
    ) -> List[DecisionRecommendation]:
        """Analyze maintenance needs and recommend scheduling"""
        
        recommendations = []
        
        # Check sections needing maintenance (mock logic)
        sections_query = select(Section).where(
            and_(
                Section.status == SectionStatus.AVAILABLE,
                Section.is_active == True,
                Section.is_deleted == False
            )
        )
        
        result = await db.execute(sections_query)
        sections = result.scalars().all()
        
        for section in sections:
            # Mock maintenance priority calculation
            # In real implementation, this would consider:
            # - Last maintenance date
            # - Usage statistics
            # - Condition monitoring data
            # - Safety inspection results
            
            days_since_maintenance = 45  # Mock value
            usage_intensity = 0.7  # Mock value
            condition_score = 0.3  # Mock value (lower is worse)
            
            maintenance_priority = (days_since_maintenance / 90) * 0.4 + usage_intensity * 0.3 + (1 - condition_score) * 0.3
            
            if maintenance_priority >= self.decision_rules["maintenance_priority_threshold"]:
                recommendation = DecisionRecommendation(
                    decision_type=DecisionType.MAINTENANCE_SCHEDULING,
                    priority=DecisionPriority.HIGH if maintenance_priority > 0.95 else DecisionPriority.MEDIUM,
                    confidence=0.9,
                    expected_impact={
                        "reliability_improvement": 25.0,
                        "safety_improvement": 30.0,
                        "downtime_hours": 8.0
                    },
                    implementation_cost=5000.0,
                    risk_assessment={
                        "safety_risk_reduction": 0.8,
                        "schedule_disruption": 0.6
                    },
                    rationale=f"Section {section.section_code} requires maintenance. Priority score: {maintenance_priority:.2f}",
                    alternatives=[
                        {"type": "minimal_maintenance", "impact": "Partial improvement", "cost": 2000},
                        {"type": "condition_monitoring", "impact": "Risk assessment", "cost": 500}
                    ]
                )
                recommendations.append(recommendation)
        
        return recommendations
    
    async def _analyze_emergency_situations(
        self,
        db: AsyncSession,
        context: DecisionContext
    ) -> List[DecisionRecommendation]:
        """Analyze emergency situations and recommend immediate actions"""
        
        recommendations = []
        
        # Check for emergency indicators in context
        if context.triggering_event in ["equipment_failure", "weather_alert", "safety_incident"]:
            recommendation = DecisionRecommendation(
                decision_type=DecisionType.EMERGENCY_RESPONSE,
                priority=DecisionPriority.EMERGENCY,
                confidence=0.95,
                expected_impact={
                    "response_time_reduction": 5.0,
                    "safety_improvement": 90.0,
                    "service_disruption": 30.0
                },
                implementation_cost=10000.0,
                risk_assessment={
                    "safety_risk_reduction": 0.95,
                    "financial_impact": 0.7
                },
                rationale=f"Emergency situation detected: {context.triggering_event}. Immediate response required.",
                alternatives=[
                    {"type": "partial_shutdown", "impact": "Reduced risk", "cost": 5000},
                    {"type": "increased_monitoring", "impact": "Risk awareness", "cost": 1000}
                ]
            )
            recommendations.append(recommendation)
        
        return recommendations


class DecisionService:
    """Service for managing decisions and recommendations"""
    
    def __init__(self):
        self.decision_engine = DecisionEngine()
        self.pending_decisions = {}
        self.decision_history = []
    
    async def evaluate_situation(
        self,
        db: AsyncSession,
        triggering_event: str,
        affected_entities: Optional[List[Dict[str, Any]]] = None
    ) -> List[DecisionRecommendation]:
        """Evaluate current situation and generate recommendations"""
        
        # Gather system state
        system_state = await self._gather_system_state(db)
        
        # Create decision context
        context = DecisionContext(
            timestamp=datetime.utcnow(),
            triggering_event=triggering_event,
            affected_entities=affected_entities or [],
            system_state=system_state,
            constraints=await self._get_system_constraints(db),
            objectives=["minimize_delays", "maximize_throughput", "ensure_safety"]
        )
        
        # Generate recommendations
        recommendations = await self.decision_engine.analyze_situation(db, context)
        
        logger.info(f"Generated {len(recommendations)} recommendations for event: {triggering_event}")
        
        return recommendations
    
    async def implement_decision(
        self,
        db: AsyncSession,
        decision_id: str,
        approved_by: int,
        implementation_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Implement an approved decision"""
        
        if decision_id not in self.pending_decisions:
            raise NotFoundError("Decision not found")
        
        decision = self.pending_decisions[decision_id]
        
        try:
            # Implement the decision based on type
            if decision.decision_type == DecisionType.ROUTE_CHANGE:
                result = await self._implement_route_change(db, decision)
            elif decision.decision_type == DecisionType.SPEED_ADJUSTMENT:
                result = await self._implement_speed_adjustment(db, decision)
            elif decision.decision_type == DecisionType.SCHEDULE_MODIFICATION:
                result = await self._implement_schedule_modification(db, decision)
            elif decision.decision_type == DecisionType.SECTION_ALLOCATION:
                result = await self._implement_section_allocation(db, decision)
            elif decision.decision_type == DecisionType.MAINTENANCE_SCHEDULING:
                result = await self._implement_maintenance_scheduling(db, decision)
            elif decision.decision_type == DecisionType.EMERGENCY_RESPONSE:
                result = await self._implement_emergency_response(db, decision)
            else:
                raise ValidationError(f"Unknown decision type: {decision.decision_type}")
            
            # Record implementation
            implementation_record = {
                "decision_id": decision_id,
                "decision_type": decision.decision_type.value,
                "implemented_at": datetime.utcnow(),
                "approved_by": approved_by,
                "implementation_notes": implementation_notes,
                "result": result,
                "status": "implemented"
            }
            
            self.decision_history.append(implementation_record)
            del self.pending_decisions[decision_id]
            
            logger.info(f"Decision {decision_id} implemented successfully")
            
            return implementation_record
            
        except Exception as e:
            logger.error(f"Failed to implement decision {decision_id}: {e}")
            
            # Record failure
            failure_record = {
                "decision_id": decision_id,
                "decision_type": decision.decision_type.value,
                "failed_at": datetime.utcnow(),
                "approved_by": approved_by,
                "error": str(e),
                "status": "failed"
            }
            
            self.decision_history.append(failure_record)
            
            raise
    
    async def _implement_route_change(
        self,
        db: AsyncSession,
        decision: DecisionRecommendation
    ) -> Dict[str, Any]:
        """Implement route change decision"""
        
        # This would involve:
        # 1. Calculating new route
        # 2. Updating train schedules
        # 3. Reserving new sections
        # 4. Releasing old sections
        
        # Mock implementation
        return {
            "action": "route_change",
            "trains_affected": 3,
            "new_route_length": 45.2,
            "estimated_time_savings": 12,
            "implementation_cost": 1000.0
        }
    
    async def _implement_speed_adjustment(
        self,
        db: AsyncSession,
        decision: DecisionRecommendation
    ) -> Dict[str, Any]:
        """Implement speed adjustment decision"""
        
        # Mock implementation
        return {
            "action": "speed_adjustment",
            "trains_affected": 1,
            "new_speed": 95.0,
            "estimated_time_savings": 8,
            "energy_cost_increase": 200.0
        }
    
    async def _implement_schedule_modification(
        self,
        db: AsyncSession,
        decision: DecisionRecommendation
    ) -> Dict[str, Any]:
        """Implement schedule modification decision"""
        
        # Mock implementation
        return {
            "action": "schedule_modification",
            "schedules_updated": 5,
            "passenger_notifications_sent": 150,
            "estimated_delay_reduction": 15
        }
    
    async def _implement_section_allocation(
        self,
        db: AsyncSession,
        decision: DecisionRecommendation
    ) -> Dict[str, Any]:
        """Implement section allocation decision"""
        
        # Mock implementation
        return {
            "action": "section_allocation",
            "sections_reallocated": 2,
            "trains_rerouted": 4,
            "capacity_improvement": 25.0
        }
    
    async def _implement_maintenance_scheduling(
        self,
        db: AsyncSession,
        decision: DecisionRecommendation
    ) -> Dict[str, Any]:
        """Implement maintenance scheduling decision"""
        
        # Mock implementation
        return {
            "action": "maintenance_scheduling",
            "maintenance_window": "2024-01-15 02:00 - 10:00",
            "sections_affected": 1,
            "estimated_duration": 8,
            "service_impact": "minimal"
        }
    
    async def _implement_emergency_response(
        self,
        db: AsyncSession,
        decision: DecisionRecommendation
    ) -> Dict[str, Any]:
        """Implement emergency response decision"""
        
        # Mock implementation
        return {
            "action": "emergency_response",
            "response_teams_dispatched": 2,
            "affected_services": 3,
            "estimated_resolution_time": 45,
            "safety_measures_activated": True
        }
    
    async def _gather_system_state(self, db: AsyncSession) -> Dict[str, Any]:
        """Gather current system state information"""
        
        # Get train statistics
        train_stats_query = select(
            func.count(Train.id).label('total_trains'),
            func.sum(case((Train.delay_minutes > 5, 1), else_=0)).label('delayed_trains'),
            func.avg(Train.delay_minutes).label('avg_delay')
        ).where(
            and_(Train.is_active == True, Train.is_deleted == False)
        )
        
        train_stats_result = await db.execute(train_stats_query)
        train_stats = train_stats_result.first()
        
        # Get section statistics
        section_stats_query = select(
            func.count(Section.id).label('total_sections'),
            func.sum(case((Section.status == SectionStatus.AVAILABLE, 1), else_=0)).label('available_sections'),
            func.sum(case((Section.status == SectionStatus.OCCUPIED, 1), else_=0)).label('occupied_sections')
        ).where(
            and_(Section.is_active == True, Section.is_deleted == False)
        )
        
        section_stats_result = await db.execute(section_stats_query)
        section_stats = section_stats_result.first()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "trains": {
                "total": train_stats.total_trains,
                "delayed": train_stats.delayed_trains,
                "average_delay": float(train_stats.avg_delay or 0)
            },
            "sections": {
                "total": section_stats.total_sections,
                "available": section_stats.available_sections,
                "occupied": section_stats.occupied_sections
            }
        }
    
    async def _get_system_constraints(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """Get current system constraints"""
        
        return [
            {"type": "capacity", "description": "Maximum trains per section", "value": 3},
            {"type": "speed", "description": "Maximum train speed", "value": 120},
            {"type": "maintenance", "description": "Required maintenance window", "value": "02:00-06:00"},
            {"type": "safety", "description": "Minimum train separation", "value": 2.0}
        ]
    
    async def get_decision_history(
        self,
        limit: int = 100,
        decision_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get decision implementation history"""
        
        history = self.decision_history.copy()
        
        if decision_type:
            history = [d for d in history if d["decision_type"] == decision_type]
        
        # Sort by implementation time (most recent first)
        history.sort(key=lambda x: x.get("implemented_at", x.get("failed_at", datetime.min)), reverse=True)
        
        return history[:limit]
    
    async def analyze_decision_effectiveness(
        self,
        db: AsyncSession,
        decision_id: str
    ) -> Dict[str, Any]:
        """Analyze the effectiveness of an implemented decision"""
        
        # Find decision in history
        decision_record = None
        for record in self.decision_history:
            if record["decision_id"] == decision_id:
                decision_record = record
                break
        
        if not decision_record:
            raise NotFoundError("Decision record not found")
        
        # Mock effectiveness analysis
        return {
            "decision_id": decision_id,
            "implementation_success": True,
            "actual_impact": {
                "delay_reduction": 12.5,
                "cost": 950.0,
                "passenger_satisfaction": 8.2
            },
            "expected_vs_actual": {
                "delay_reduction": {"expected": 15.0, "actual": 12.5, "variance": -16.7},
                "cost": {"expected": 1000.0, "actual": 950.0, "variance": -5.0}
            },
            "effectiveness_score": 0.85,
            "lessons_learned": [
                "Implementation was smoother than expected",
                "Cost savings due to efficient execution",
                "Slight underperformance in delay reduction"
            ]
        }


# Create service instance
decision_service = DecisionService()

# Export service
__all__ = ["decision_service", "DecisionService", "DecisionEngine", "DecisionType", "DecisionPriority", "DecisionStatus", "DecisionRecommendation"]