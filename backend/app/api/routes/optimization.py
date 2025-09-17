from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import json

from app.core.database import get_db
from app.models.decision import Decision, OptimizationRun
from app.models.train import Train
from app.models.section import Section
from app.schemas.optimization import (
    OptimizationRequest,
    OptimizationResult,
    Decision as DecisionSchema,
    DecisionCreate,
    DecisionUpdate,
    OptimizationMetrics,
    PredictionRequest,
    PredictionResult
)
from app.services.optimization_service import OptimizationService
from app.services.decision_service import DecisionService
from optimization.core.cp_solver import CPSolver
from ml_models.inference.prediction_service import PredictionService

router = APIRouter()

@router.post("/optimize", response_model=OptimizationResult)
async def optimize_traffic(
    request: OptimizationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Run traffic optimization for given trains and sections"""
    try:
        # Generate unique run ID
        run_id = f"opt_{uuid.uuid4().hex[:8]}_{int(datetime.utcnow().timestamp())}"
        
        # Get trains and sections from database
        trains = db.query(Train).filter(Train.id.in_(request.train_ids)).all()
        sections = db.query(Section).filter(Section.id.in_(request.section_ids)).all()
        
        if len(trains) != len(request.train_ids):
            raise HTTPException(status_code=404, detail="Some trains not found")
        if len(sections) != len(request.section_ids):
            raise HTTPException(status_code=404, detail="Some sections not found")
        
        # Initialize optimization service
        opt_service = OptimizationService(db)
        
        # Create optimization run record
        opt_run = OptimizationRun(
            run_id=run_id,
            scenario_name=request.scenario_name,
            optimization_type=request.optimization_type,
            input_trains=[{"id": t.id, "number": t.train_number, "type": t.train_type} for t in trains],
            input_sections=[{"id": s.id, "code": s.section_code, "length": s.length} for s in sections],
            constraints=request.dict()
        )
        db.add(opt_run)
        db.commit()
        
        # Run optimization
        if request.optimization_type == "REAL_TIME":
            result = await opt_service.optimize_real_time(trains, sections, request)
        else:
            result = await opt_service.optimize_batch(trains, sections, request)
        
        # Update optimization run with results
        opt_run.objective_value = result.objective_value
        opt_run.solution_status = result.solution_status
        opt_run.solving_time = result.solving_time
        opt_run.total_delay = result.total_delay
        opt_run.throughput = result.throughput
        opt_run.safety_violations = result.safety_violations
        opt_run.decisions = [d.dict() for d in result.decisions]
        opt_run.completed_at = datetime.utcnow()
        
        db.commit()
        
        # Store decisions in database
        for decision_data in result.decisions:
            decision = Decision(
                decision_id=f"{run_id}_{decision_data.train_id}_{decision_data.section_id}",
                train_id=decision_data.train_id,
                section_id=decision_data.section_id,
                decision_type=decision_data.decision_type,
                recommendation=decision_data.recommendation,
                confidence_score=decision_data.confidence_score,
                reason=decision_data.reason,
                constraints_considered=decision_data.constraints_considered,
                alternatives=decision_data.alternatives,
                predicted_delay_reduction=decision_data.predicted_delay_reduction,
                predicted_throughput_gain=decision_data.predicted_throughput_gain
            )
            db.add(decision)
        
        db.commit()
        
        result.run_id = run_id
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

@router.get("/runs", response_model=List[OptimizationResult])
async def get_optimization_runs(
    skip: int = 0,
    limit: int = 50,
    scenario_name: Optional[str] = None,
    optimization_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get list of optimization runs"""
    query = db.query(OptimizationRun)
    
    if scenario_name:
        query = query.filter(OptimizationRun.scenario_name.contains(scenario_name))
    if optimization_type:
        query = query.filter(OptimizationRun.optimization_type == optimization_type)
    
    runs = query.order_by(OptimizationRun.created_at.desc()).offset(skip).limit(limit).all()
    
    results = []
    for run in runs:
        decisions = db.query(Decision).filter(
            Decision.decision_id.contains(run.run_id)
        ).all()
        
        result = OptimizationResult(
            run_id=run.run_id,
            scenario_name=run.scenario_name,
            optimization_type=run.optimization_type,
            solution_status=run.solution_status or "UNKNOWN",
            objective_value=run.objective_value,
            solving_time=run.solving_time or 0.0,
            total_delay=run.total_delay,
            throughput=run.throughput,
            safety_violations=run.safety_violations,
            decisions=[DecisionSchema.from_orm(d) for d in decisions],
            trains_affected=len(run.input_trains) if run.input_trains else 0,
            sections_involved=len(run.input_sections) if run.input_sections else 0,
            created_at=run.created_at,
            completed_at=run.completed_at
        )
        results.append(result)
    
    return results

@router.get("/runs/{run_id}", response_model=OptimizationResult)
async def get_optimization_run(run_id: str, db: Session = Depends(get_db)):
    """Get specific optimization run"""
    run = db.query(OptimizationRun).filter(OptimizationRun.run_id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Optimization run not found")
    
    decisions = db.query(Decision).filter(
        Decision.decision_id.contains(run_id)
    ).all()
    
    return OptimizationResult(
        run_id=run.run_id,
        scenario_name=run.scenario_name,
        optimization_type=run.optimization_type,
        solution_status=run.solution_status or "UNKNOWN",
        objective_value=run.objective_value,
        solving_time=run.solving_time or 0.0,
        total_delay=run.total_delay,
        throughput=run.throughput,
        safety_violations=run.safety_violations,
        decisions=[DecisionSchema.from_orm(d) for d in decisions],
        trains_affected=len(run.input_trains) if run.input_trains else 0,
        sections_involved=len(run.input_sections) if run.input_sections else 0,
        created_at=run.created_at,
        completed_at=run.completed_at
    )

@router.get("/decisions", response_model=List[DecisionSchema])
async def get_decisions(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    train_id: Optional[int] = None,
    section_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get list of decisions"""
    query = db.query(Decision)
    
    if status:
        query = query.filter(Decision.status == status)
    if train_id:
        query = query.filter(Decision.train_id == train_id)
    if section_id:
        query = query.filter(Decision.section_id == section_id)
    
    decisions = query.order_by(Decision.created_at.desc()).offset(skip).limit(limit).all()
    return decisions

@router.get("/decisions/{decision_id}", response_model=DecisionSchema)
async def get_decision(decision_id: str, db: Session = Depends(get_db)):
    """Get specific decision"""
    decision = db.query(Decision).filter(Decision.decision_id == decision_id).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    return decision

@router.put("/decisions/{decision_id}", response_model=DecisionSchema)
async def update_decision(
    decision_id: str,
    decision_update: DecisionUpdate,
    controller_id: str,
    db: Session = Depends(get_db)
):
    """Update decision status (approve/reject)"""
    decision = db.query(Decision).filter(Decision.decision_id == decision_id).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    update_data = decision_update.dict(exclude_unset=True)
    
    # Set approval details if approving
    if decision_update.status in ["APPROVED", "REJECTED"]:
        update_data["approved_by"] = controller_id
        update_data["approved_at"] = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(decision, field, value)
    
    decision.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(decision)
    
    # If approved, trigger implementation
    if decision.status == "APPROVED":
        decision_service = DecisionService(db)
        await decision_service.implement_decision(decision)
    
    return decision

@router.post("/predict", response_model=PredictionResult)
async def predict(request: PredictionRequest, db: Session = Depends(get_db)):
    """Make predictions using ML models"""
    try:
        prediction_service = PredictionService()
        
        # Get train and section data
        train = db.query(Train).filter(Train.id == request.train_id).first()
        section = db.query(Section).filter(Section.id == request.section_id).first()
        
        if not train:
            raise HTTPException(status_code=404, detail="Train not found")
        if not section:
            raise HTTPException(status_code=404, detail="Section not found")
        
        # Make prediction based on type
        if request.prediction_type == "delay":
            result = await prediction_service.predict_delay(train, section, request.time_horizon)
        elif request.prediction_type == "arrival":
            result = await prediction_service.predict_arrival(train, section)
        elif request.prediction_type == "conflict":
            result = await prediction_service.predict_conflict(train, section, request.time_horizon)
        else:
            raise HTTPException(status_code=400, detail="Invalid prediction type")
        
        return PredictionResult(
            train_id=request.train_id,
            section_id=request.section_id,
            prediction_type=request.prediction_type,
            predicted_value=result["value"],
            confidence_interval=result.get("confidence_interval"),
            uncertainty=result.get("uncertainty"),
            factors=result.get("factors", {}),
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.get("/metrics/current", response_model=OptimizationMetrics)
async def get_current_metrics(
    section_ids: Optional[List[int]] = None,
    db: Session = Depends(get_db)
):
    """Get current optimization metrics"""
    try:
        # Query trains
        train_query = db.query(Train).filter(Train.status.in_(["RUNNING", "DELAYED", "STOPPED"]))
        if section_ids:
            train_query = train_query.filter(Train.current_section_id.in_(section_ids))
        
        trains = train_query.all()
        
        # Calculate metrics
        total_trains = len(trains)
        delayed_trains = len([t for t in trains if t.status == "DELAYED"])
        
        # Calculate average delay
        total_delay = 0
        delay_count = 0
        for train in trains:
            if train.actual_arrival and train.scheduled_arrival:
                delay = (train.actual_arrival - train.scheduled_arrival).total_seconds() / 60
                if delay > 0:
                    total_delay += delay
                    delay_count += 1
        
        avg_delay = total_delay / delay_count if delay_count > 0 else 0
        
        # Calculate throughput (trains per hour in last hour)
        from datetime import timedelta
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        recent_completions = db.query(Train).filter(
            Train.status == "COMPLETED",
            Train.actual_departure >= one_hour_ago
        ).count()
        
        # Calculate capacity utilization
        if section_ids:
            sections = db.query(Section).filter(Section.id.in_(section_ids)).all()
        else:
            sections = db.query(Section).filter(Section.is_active == True).all()
        
        total_capacity = sum(s.max_occupancy for s in sections)
        current_occupancy = sum(s.current_occupancy for s in sections)
        capacity_utilization = current_occupancy / total_capacity if total_capacity > 0 else 0
        
        return OptimizationMetrics(
            timestamp=datetime.utcnow(),
            scenario="real_time",
            avg_delay=avg_delay,
            total_throughput=recent_completions,
            capacity_utilization=min(capacity_utilization, 1.0),
            on_time_performance=(total_trains - delayed_trains) / total_trains if total_trains > 0 else 1.0,
            safety_score=1.0,  # Simplified - would need actual safety violation tracking
            energy_efficiency=0.85,  # Placeholder
            resource_utilization=capacity_utilization
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate metrics: {str(e)}")

@router.post("/simulate")
async def simulate_scenario(
    scenario_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Run what-if simulation scenario"""
    try:
        from simulation.core.simulator import TrafficSimulator
        
        simulator = TrafficSimulator()
        
        # Extract scenario parameters
        trains_data = scenario_data.get("trains", [])
        sections_data = scenario_data.get("sections", [])
        disruptions = scenario_data.get("disruptions", [])
        duration = scenario_data.get("duration", 3600)  # Default 1 hour
        
        # Run simulation
        result = await simulator.run_scenario(
            trains_data=trains_data,
            sections_data=sections_data,
            disruptions=disruptions,
            duration=duration
        )
        
        return {
            "scenario_id": result["scenario_id"],
            "duration": duration,
            "metrics": result["metrics"],
            "events": result["events"][:100],  # Limit events for response size
            "summary": result["summary"],
            "timestamp": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

@router.get("/recommendations/{section_id}")
async def get_recommendations(
    section_id: int,
    time_horizon: int = 1800,
    db: Session = Depends(get_db)
):
    """Get real-time recommendations for a section"""
    try:
        section = db.query(Section).filter(Section.id == section_id).first()
        if not section:
            raise HTTPException(status_code=404, detail="Section not found")
        
        # Get trains in or approaching section
        trains = db.query(Train).filter(
            Train.current_section_id == section_id,
            Train.status.in_(["RUNNING", "DELAYED", "SCHEDULED"])
        ).all()
        
        if not trains:
            return {
                "section_id": section_id,
                "recommendations": [],
                "timestamp": datetime.utcnow(),
                "message": "No active trains in section"
            }
        
        # Generate recommendations using optimization service
        opt_service = OptimizationService(db)
        recommendations = await opt_service.generate_recommendations(
            section=section,
            trains=trains,
            time_horizon=time_horizon
        )
        
        return {
            "section_id": section_id,
            "section_name": section.section_name,
            "recommendations": recommendations,
            "trains_considered": len(trains),
            "timestamp": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")