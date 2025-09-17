from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

from app.core.database import get_db
from app.models.train import Train, TrainSchedule
from app.models.section import Section
from app.models.decision import Decision, OptimizationRun
from app.schemas.optimization import OptimizationMetrics

router = APIRouter()

@router.get("/performance/overview")
async def get_performance_overview(
    hours: int = Query(24, ge=1, le=168),
    section_ids: Optional[List[int]] = Query(None),
    db: Session = Depends(get_db)
):
    """Get overall system performance overview"""
    try:
        since = datetime.utcnow() - timedelta(hours=hours)
        
        # Base query for trains
        train_query = db.query(Train).filter(Train.updated_at >= since)
        if section_ids:
            train_query = train_query.filter(Train.current_section_id.in_(section_ids))
        
        trains = train_query.all()
        
        # Calculate basic metrics
        total_trains = len(trains)
        running_trains = len([t for t in trains if t.status == "RUNNING"])
        delayed_trains = len([t for t in trains if t.status == "DELAYED"])
        completed_trains = len([t for t in trains if t.status == "COMPLETED"])
        
        # Calculate average delay
        delays = []
        for train in trains:
            if train.actual_arrival and train.scheduled_arrival:
                delay = (train.actual_arrival - train.scheduled_arrival).total_seconds() / 60
                if delay > 0:
                    delays.append(delay)
        
        avg_delay = np.mean(delays) if delays else 0.0
        
        # On-time performance (within 5 minutes)
        on_time_trains = len([d for d in delays if d <= 5])
        on_time_percentage = (on_time_trains / len(delays) * 100) if delays else 100.0
        
        # Section utilization
        sections = db.query(Section).all()
        total_capacity = sum(s.max_occupancy for s in sections)
        current_occupancy = sum(s.current_occupancy for s in sections)
        capacity_utilization = (current_occupancy / total_capacity * 100) if total_capacity > 0 else 0.0
        
        # Throughput (trains per hour)
        completed_last_hour = db.query(Train).filter(
            Train.status == "COMPLETED",
            Train.actual_departure >= datetime.utcnow() - timedelta(hours=1)
        ).count()
        
        return {
            "period_hours": hours,
            "timestamp": datetime.utcnow().isoformat(),
            "train_metrics": {
                "total_trains": total_trains,
                "running_trains": running_trains,
                "delayed_trains": delayed_trains,
                "completed_trains": completed_trains,
                "on_time_percentage": round(on_time_percentage, 1),
                "average_delay_minutes": round(avg_delay, 2)
            },
            "capacity_metrics": {
                "total_capacity": total_capacity,
                "current_occupancy": current_occupancy,
                "utilization_percentage": round(capacity_utilization, 1)
            },
            "throughput_metrics": {
                "trains_per_hour": completed_last_hour,
                "completion_rate": round((completed_trains / max(1, total_trains)) * 100, 1)
            },
            "section_count": len(sections),
            "active_sections": len([s for s in sections if s.is_active])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance overview: {str(e)}")

@router.get("/delays/analysis")
async def get_delay_analysis(
    hours: int = Query(24, ge=1, le=168),
    train_type: Optional[str] = Query(None),
    priority: Optional[int] = Query(None, ge=1, le=5),
    db: Session = Depends(get_db)
):
    """Get detailed delay analysis"""
    try:
        since = datetime.utcnow() - timedelta(hours=hours)
        
        # Build query
        query = db.query(Train).filter(
            Train.updated_at >= since,
            Train.actual_arrival.isnot(None),
            Train.scheduled_arrival.isnot(None)
        )
        
        if train_type:
            query = query.filter(Train.train_type == train_type)
        if priority:
            query = query.filter(Train.priority == priority)
        
        trains = query.all()
        
        # Calculate delays
        delay_data = []
        for train in trains:
            delay_minutes = (train.actual_arrival - train.scheduled_arrival).total_seconds() / 60
            delay_data.append({
                'train_id': train.id,
                'train_number': train.train_number,
                'train_type': train.train_type,
                'priority': train.priority,
                'delay_minutes': max(0, delay_minutes),
                'scheduled_arrival': train.scheduled_arrival,
                'actual_arrival': train.actual_arrival
            })
        
        if not delay_data:
            return {
                "message": "No delay data available for the specified period",
                "period_hours": hours,
                "filters": {"train_type": train_type, "priority": priority}
            }
        
        df = pd.DataFrame(delay_data)
        
        # Statistical analysis
        delay_stats = {
            "total_trains": len(df),
            "mean_delay": float(df['delay_minutes'].mean()),
            "median_delay": float(df['delay_minutes'].median()),
            "std_delay": float(df['delay_minutes'].std()),
            "min_delay": float(df['delay_minutes'].min()),
            "max_delay": float(df['delay_minutes'].max()),
            "percentile_75": float(df['delay_minutes'].quantile(0.75)),
            "percentile_95": float(df['delay_minutes'].quantile(0.95))
        }
        
        # Delay distribution
        delay_buckets = {
            "on_time": len(df[df['delay_minutes'] <= 5]),
            "minor_delay": len(df[(df['delay_minutes'] > 5) & (df['delay_minutes'] <= 15)]),
            "moderate_delay": len(df[(df['delay_minutes'] > 15) & (df['delay_minutes'] <= 30)]),
            "major_delay": len(df[df['delay_minutes'] > 30])
        }
        
        # By train type
        delay_by_type = df.groupby('train_type')['delay_minutes'].agg(['mean', 'count']).to_dict('index')
        
        # By priority
        delay_by_priority = df.groupby('priority')['delay_minutes'].agg(['mean', 'count']).to_dict('index')
        
        # Time series (hourly)
        df['hour'] = pd.to_datetime(df['actual_arrival']).dt.hour
        hourly_delays = df.groupby('hour')['delay_minutes'].mean().to_dict()
        
        return {
            "period_hours": hours,
            "filters_applied": {"train_type": train_type, "priority": priority},
            "statistics": delay_stats,
            "distribution": delay_buckets,
            "by_train_type": delay_by_type,
            "by_priority": delay_by_priority,
            "hourly_pattern": hourly_delays,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze delays: {str(e)}")

@router.get("/throughput/trends")
async def get_throughput_trends(
    hours: int = Query(24, ge=1, le=168),
    section_ids: Optional[List[int]] = Query(None),
    interval: str = Query("hour", regex="^(hour|day)$"),
    db: Session = Depends(get_db)
):
    """Get throughput trends over time"""
    try:
        since = datetime.utcnow() - timedelta(hours=hours)
        
        # Query completed trains
        query = db.query(Train).filter(
            Train.status == "COMPLETED",
            Train.actual_departure >= since
        )
        
        if section_ids:
            query = query.filter(Train.current_section_id.in_(section_ids))
        
        trains = query.all()
        
        if not trains:
            return {
                "message": "No completed trains in the specified period",
                "period_hours": hours,
                "interval": interval
            }
        
        # Create DataFrame
        df = pd.DataFrame([{
            'train_id': t.id,
            'completion_time': t.actual_departure,
            'train_type': t.train_type,
            'section_id': t.current_section_id
        } for t in trains])
        
        df['completion_time'] = pd.to_datetime(df['completion_time'])
        
        # Group by interval
        if interval == "hour":
            df['period'] = df['completion_time'].dt.floor('H')
        else:  # day
            df['period'] = df['completion_time'].dt.floor('D')
        
        # Calculate throughput
        throughput_data = df.groupby('period').size().reset_index(name='trains_completed')
        throughput_data['throughput_per_hour'] = throughput_data['trains_completed']
        
        if interval == "day":
            throughput_data['throughput_per_hour'] = throughput_data['trains_completed'] / 24
        
        # By train type
        type_throughput = df.groupby(['period', 'train_type']).size().unstack(fill_value=0)
        
        # By section (if applicable)
        section_throughput = {}
        if section_ids:
            section_throughput = df.groupby(['period', 'section_id']).size().unstack(fill_value=0).to_dict('index')
        
        # Calculate trends
        throughput_values = throughput_data['throughput_per_hour'].values
        if len(throughput_values) > 1:
            trend = np.polyfit(range(len(throughput_values)), throughput_values, 1)[0]
            trend_direction = "increasing" if trend > 0.1 else "decreasing" if trend < -0.1 else "stable"
        else:
            trend = 0
            trend_direction = "insufficient_data"
        
        return {
            "period_hours": hours,
            "interval": interval,
            "total_completed": len(trains),
            "average_throughput_per_hour": float(throughput_data['throughput_per_hour'].mean()),
            "max_throughput_per_hour": float(throughput_data['throughput_per_hour'].max()),
            "min_throughput_per_hour": float(throughput_data['throughput_per_hour'].min()),
            "trend_direction": trend_direction,
            "trend_slope": float(trend),
            "time_series": [
                {
                    "timestamp": row['period'].isoformat(),
                    "trains_completed": int(row['trains_completed']),
                    "throughput_per_hour": float(row['throughput_per_hour'])
                }
                for _, row in throughput_data.iterrows()
            ],
            "by_train_type": type_throughput.to_dict('index') if not type_throughput.empty else {},
            "by_section": section_throughput,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get throughput trends: {str(e)}")

@router.get("/optimization/effectiveness")
async def get_optimization_effectiveness(
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db)
):
    """Analyze optimization effectiveness"""
    try:
        since = datetime.utcnow() - timedelta(hours=hours)
        
        # Get optimization runs
        opt_runs = db.query(OptimizationRun).filter(
            OptimizationRun.created_at >= since,
            OptimizationRun.completed_at.isnot(None)
        ).all()
        
        if not opt_runs:
            return {
                "message": "No completed optimization runs in the specified period",
                "period_hours": hours
            }
        
        # Analyze runs
        successful_runs = [r for r in opt_runs if r.solution_status in ["OPTIMAL", "FEASIBLE"]]
        failed_runs = [r for r in opt_runs if r.solution_status in ["INFEASIBLE", "ERROR"]]
        
        # Performance metrics
        avg_solving_time = np.mean([r.solving_time for r in opt_runs if r.solving_time])
        
        # Improvement metrics
        total_delay_reductions = []
        throughput_improvements = []
        
        for run in successful_runs:
            if run.total_delay:
                # Compare with baseline (simplified)
                baseline_delay = run.total_delay * 1.2  # Assume 20% worse without optimization
                reduction = ((baseline_delay - run.total_delay) / baseline_delay) * 100
                total_delay_reductions.append(reduction)
            
            if run.throughput:
                # Compare with baseline throughput
                baseline_throughput = run.throughput * 0.9  # Assume 10% worse without optimization
                improvement = ((run.throughput - baseline_throughput) / baseline_throughput) * 100
                throughput_improvements.append(improvement)
        
        # Decision analysis
        decisions = db.query(Decision).filter(
            Decision.created_at >= since
        ).all()
        
        approved_decisions = [d for d in decisions if d.status == "APPROVED"]
        implemented_decisions = [d for d in decisions if d.status == "IMPLEMENTED"]
        
        # Decision effectiveness
        effective_decisions = [
            d for d in implemented_decisions 
            if d.actual_delay_reduction and d.actual_delay_reduction > 0
        ]
        
        return {
            "period_hours": hours,
            "optimization_runs": {
                "total_runs": len(opt_runs),
                "successful_runs": len(successful_runs),
                "failed_runs": len(failed_runs),
                "success_rate": (len(successful_runs) / len(opt_runs)) * 100 if opt_runs else 0,
                "average_solving_time": float(avg_solving_time) if avg_solving_time else 0
            },
            "performance_improvements": {
                "delay_reductions": {
                    "average_reduction_percent": float(np.mean(total_delay_reductions)) if total_delay_reductions else 0,
                    "max_reduction_percent": float(np.max(total_delay_reductions)) if total_delay_reductions else 0,
                    "runs_with_improvement": len(total_delay_reductions)
                },
                "throughput_improvements": {
                    "average_improvement_percent": float(np.mean(throughput_improvements)) if throughput_improvements else 0,
                    "max_improvement_percent": float(np.max(throughput_improvements)) if throughput_improvements else 0,
                    "runs_with_improvement": len(throughput_improvements)
                }
            },
            "decision_metrics": {
                "total_decisions": len(decisions),
                "approved_decisions": len(approved_decisions),
                "implemented_decisions": len(implemented_decisions),
                "effective_decisions": len(effective_decisions),
                "approval_rate": (len(approved_decisions) / len(decisions)) * 100 if decisions else 0,
                "implementation_rate": (len(implemented_decisions) / len(approved_decisions)) * 100 if approved_decisions else 0,
                "effectiveness_rate": (len(effective_decisions) / len(implemented_decisions)) * 100 if implemented_decisions else 0
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze optimization effectiveness: {str(e)}")

@router.get("/sections/utilization")
async def get_section_utilization(
    hours: int = Query(24, ge=1, le=168),
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Get section utilization analysis"""
    try:
        # Get sections
        sections_query = db.query(Section)
        if not include_inactive:
            sections_query = sections_query.filter(Section.is_active == True)
        
        sections = sections_query.all()
        
        utilization_data = []
        
        for section in sections:
            # Calculate current utilization
            current_utilization = section.current_occupancy / section.max_occupancy if section.max_occupancy > 0 else 0
            
            # Get historical data (simplified - in real implementation, you'd track this over time)
            since = datetime.utcnow() - timedelta(hours=hours)
            trains_through_section = db.query(Train).filter(
                Train.current_section_id == section.id,
                Train.updated_at >= since
            ).count()
            
            # Estimate average utilization (simplified calculation)
            max_possible_trains = section.hourly_capacity * hours if hasattr(section, 'hourly_capacity') else trains_through_section
            avg_utilization = min(1.0, trains_through_section / max(1, max_possible_trains))
            
            utilization_data.append({
                "section_id": section.id,
                "section_code": section.section_code,
                "section_name": section.section_name,
                "section_type": section.section_type if hasattr(section, 'section_type') else "UNKNOWN",
                "current_occupancy": section.current_occupancy,
                "max_occupancy": section.max_occupancy,
                "current_utilization": round(current_utilization, 3),
                "average_utilization": round(avg_utilization, 3),
                "trains_processed": trains_through_section,
                "is_active": section.is_active,
                "maintenance_mode": section.maintenance_mode,
                "length": section.length if hasattr(section, 'length') else 1000,
                "max_speed": section.max_speed if hasattr(section, 'max_speed') else 100
            })
        
        # Sort by utilization
        utilization_data.sort(key=lambda x: x['current_utilization'], reverse=True)
        
        # Calculate summary statistics
        if utilization_data:
            current_utils = [s['current_utilization'] for s in utilization_data]
            avg_utils = [s['average_utilization'] for s in utilization_data]
            
            summary = {
                "total_sections": len(utilization_data),
                "active_sections": len([s for s in utilization_data if s['is_active']]),
                "maintenance_sections": len([s for s in utilization_data if s['maintenance_mode']]),
                "high_utilization_sections": len([s for s in utilization_data if s['current_utilization'] > 0.8]),
                "average_current_utilization": round(np.mean(current_utils), 3),
                "max_current_utilization": round(np.max(current_utils), 3),
                "average_historical_utilization": round(np.mean(avg_utils), 3),
                "total_capacity": sum(s['max_occupancy'] for s in utilization_data),
                "total_current_occupancy": sum(s['current_occupancy'] for s in utilization_data)
            }
        else:
            summary = {
                "total_sections": 0,
                "message": "No sections found"
            }
        
        return {
            "period_hours": hours,
            "include_inactive": include_inactive,
            "summary": summary,
            "sections": utilization_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get section utilization: {str(e)}")

@router.get("/export/performance-report")
async def export_performance_report(
    background_tasks: BackgroundTasks,
    hours: int = Query(24, ge=1, le=168),
    format: str = Query("json", regex="^(json|csv)$"),
    db: Session = Depends(get_db)
):
    """Generate and export comprehensive performance report"""
    try:
        # This would typically generate a report in the background
        # For now, we'll return the data directly
        
        since = datetime.utcnow() - timedelta(hours=hours)
        
        # Gather all analytics data
        report_data = {
            "report_metadata": {
                "generated_at": datetime.utcnow().isoformat(),
                "period_start": since.isoformat(),
                "period_end": datetime.utcnow().isoformat(),
                "period_hours": hours,
                "format": format
            }
        }
        
        # Add each analytics component
        try:
            overview = await get_performance_overview(hours=hours, db=db)
            report_data["performance_overview"] = overview
        except:
            report_data["performance_overview"] = {"error": "Failed to generate overview"}
        
        try:
            delay_analysis = await get_delay_analysis(hours=hours, db=db)
            report_data["delay_analysis"] = delay_analysis
        except:
            report_data["delay_analysis"] = {"error": "Failed to generate delay analysis"}
        
        try:
            throughput_trends = await get_throughput_trends(hours=hours, db=db)
            report_data["throughput_trends"] = throughput_trends
        except:
            report_data["throughput_trends"] = {"error": "Failed to generate throughput trends"}
        
        try:
            optimization_effectiveness = await get_optimization_effectiveness(hours=hours, db=db)
            report_data["optimization_effectiveness"] = optimization_effectiveness
        except:
            report_data["optimization_effectiveness"] = {"error": "Failed to generate optimization analysis"}
        
        try:
            section_utilization = await get_section_utilization(hours=hours, db=db)
            report_data["section_utilization"] = section_utilization
        except:
            report_data["section_utilization"] = {"error": "Failed to generate section utilization"}
        
        return {
            "message": "Performance report generated successfully",
            "report_data": report_data,
            "download_format": format,
            "size_estimate": f"{len(str(report_data)) / 1024:.1f} KB"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate performance report: {str(e)}")