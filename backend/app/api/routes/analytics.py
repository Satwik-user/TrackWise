"""
Analytics routes for TrackWise Railway Optimization System
"""

from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from enum import Enum

from app.core.security import get_current_active_user

router = APIRouter()


class MetricType(str, Enum):
    """Types of metrics"""
    PERFORMANCE = "performance"
    EFFICIENCY = "efficiency"
    SAFETY = "safety"
    ENVIRONMENTAL = "environmental"
    FINANCIAL = "financial"


class TimeRange(str, Enum):
    """Time range options"""
    LAST_HOUR = "last_hour"
    LAST_24_HOURS = "last_24_hours"
    LAST_WEEK = "last_week"
    LAST_MONTH = "last_month"
    LAST_YEAR = "last_year"
    CUSTOM = "custom"


class DashboardData(BaseModel):
    """Dashboard data model"""
    train_analytics: Dict[str, Any]
    section_analytics: Dict[str, Any]
    performance_metrics: Dict[str, Any]
    efficiency_metrics: Dict[str, Any]
    safety_metrics: Dict[str, Any]
    environmental_metrics: Dict[str, Any]
    recent_alerts: List[Dict[str, Any]]
    system_health: Dict[str, Any]


class PerformanceReport(BaseModel):
    """Performance report model"""
    report_id: str
    report_type: str
    time_range: str
    generated_at: datetime
    summary: Dict[str, Any]
    detailed_metrics: Dict[str, Any]
    recommendations: List[str]


class AlertSummary(BaseModel):
    """Alert summary model"""
    total_alerts: int
    critical_alerts: int
    warning_alerts: int
    info_alerts: int
    resolved_alerts: int
    recent_alerts: List[Dict[str, Any]]


# Mock analytics data
MOCK_ANALYTICS_DATA = {
    "train_analytics": {
        "total_trains": 5,
        "active_trains": 3,
        "average_speed": 67.5,
        "total_distance_today": 2850.5,
        "on_time_percentage": 87.2,
        "delay_incidents": 3,
        "average_delay_minutes": 8.5,
        "fuel_consumption_liters": 1250.8,
        "energy_efficiency_score": 0.82
    },
    "section_analytics": {
        "total_sections": 5,
        "available_sections": 4,
        "maintenance_sections": 1,
        "average_utilization": 65.4,
        "bottleneck_sections": ["SEC-003"],
        "highest_traffic_section": "SEC-001",
        "signal_changes_today": 45,
        "maintenance_hours_today": 4.5
    },
    "performance_metrics": {
        "overall_efficiency": 0.78,
        "schedule_adherence": 0.87,
        "capacity_utilization": 0.65,
        "average_delay_minutes": 8.5,
        "throughput_trains_per_hour": 12.3,
        "system_availability": 0.98,
        "mean_time_between_failures": 168.5,
        "response_time_minutes": 3.2
    },
    "efficiency_metrics": {
        "energy_efficiency": 0.82,
        "route_optimization_savings": 12.5,
        "fuel_savings_percentage": 8.7,
        "time_savings_minutes": 45.2,
        "cost_savings_daily": 2150.75,
        "resource_utilization": 0.73,
        "automation_percentage": 0.65
    },
    "safety_metrics": {
        "safety_score": 0.96,
        "incidents_today": 0,
        "near_miss_events": 1,
        "safety_protocol_compliance": 0.98,
        "emergency_response_time": 4.2,
        "maintenance_compliance": 0.94,
        "safety_training_completion": 0.89
    },
    "environmental_metrics": {
        "carbon_footprint_kg": 1250.5,
        "emission_reduction_percentage": 15.2,
        "noise_pollution_db": 68.5,
        "energy_from_renewable": 0.35,
        "waste_recycling_percentage": 0.78,
        "environmental_score": 0.81
    }
}

MOCK_ALERTS = [
    {
        "id": 1,
        "type": "warning",
        "title": "Train TW003 Delayed",
        "message": "Train TW003 is running 15 minutes behind schedule",
        "timestamp": datetime.utcnow() - timedelta(minutes=30),
        "resolved": False,
        "severity": "medium"
    },
    {
        "id": 2,
        "type": "info",
        "title": "Maintenance Completed",
        "message": "Scheduled maintenance on SEC-005 completed successfully",
        "timestamp": datetime.utcnow() - timedelta(hours=2),
        "resolved": True,
        "severity": "low"
    },
    {
        "id": 3,
        "type": "critical",
        "title": "Signal Malfunction",
        "message": "Signal system malfunction detected on SEC-003",
        "timestamp": datetime.utcnow() - timedelta(hours=1),
        "resolved": False,
        "severity": "high"
    }
]


@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard_data(
    current_user: dict = Depends(get_current_active_user)
) -> DashboardData:
    """Get comprehensive dashboard analytics data"""
    
    return DashboardData(
        train_analytics=MOCK_ANALYTICS_DATA["train_analytics"],
        section_analytics=MOCK_ANALYTICS_DATA["section_analytics"],
        performance_metrics=MOCK_ANALYTICS_DATA["performance_metrics"],
        efficiency_metrics=MOCK_ANALYTICS_DATA["efficiency_metrics"],
        safety_metrics=MOCK_ANALYTICS_DATA["safety_metrics"],
        environmental_metrics=MOCK_ANALYTICS_DATA["environmental_metrics"],
        recent_alerts=[
            {
                "id": alert["id"],
                "type": alert["type"],
                "title": alert["title"],
                "message": alert["message"],
                "timestamp": alert["timestamp"].isoformat(),
                "severity": alert["severity"]
            }
            for alert in MOCK_ALERTS[:5]
        ],
        system_health={
            "overall_health_score": 0.89,
            "database_status": "healthy",
            "api_response_time": 150,
            "system_uptime_hours": 720.5,
            "memory_usage_percentage": 65.2,
            "cpu_usage_percentage": 45.8,
            "disk_usage_percentage": 23.1
        }
    )


@router.get("/metrics/{metric_type}")
async def get_metrics_by_type(
    metric_type: MetricType,
    time_range: TimeRange = TimeRange.LAST_24_HOURS,
    start_date: Optional[datetime] = Query(None, description="Start date for custom range"),
    end_date: Optional[datetime] = Query(None, description="End date for custom range"),
    current_user: dict = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """Get metrics by type and time range"""
    
    if time_range == TimeRange.CUSTOM and (not start_date or not end_date):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date and end date are required for custom time range"
        )
    
    # Get base metrics data
    if metric_type == MetricType.PERFORMANCE:
        base_data = MOCK_ANALYTICS_DATA["performance_metrics"]
    elif metric_type == MetricType.EFFICIENCY:
        base_data = MOCK_ANALYTICS_DATA["efficiency_metrics"]
    elif metric_type == MetricType.SAFETY:
        base_data = MOCK_ANALYTICS_DATA["safety_metrics"]
    elif metric_type == MetricType.ENVIRONMENTAL:
        base_data = MOCK_ANALYTICS_DATA["environmental_metrics"]
    else:
        base_data = {}
    
    # Generate time series data based on time range
    time_series = generate_time_series_data(time_range, start_date, end_date)
    
    return {
        "metric_type": metric_type.value,
        "time_range": time_range.value,
        "current_metrics": base_data,
        "time_series_data": time_series,
        "summary": {
            "average": sum(time_series.values()) / len(time_series) if time_series else 0,
            "minimum": min(time_series.values()) if time_series else 0,
            "maximum": max(time_series.values()) if time_series else 0,
            "trend": "increasing" if len(time_series) > 1 and list(time_series.values())[-1] > list(time_series.values())[0] else "stable"
        }
    }


@router.get("/reports/performance", response_model=PerformanceReport)
async def generate_performance_report(
    time_range: TimeRange = TimeRange.LAST_WEEK,
    include_recommendations: bool = True,
    current_user: dict = Depends(get_current_active_user)
) -> PerformanceReport:
    """Generate comprehensive performance report"""
    
    report_id = f"PERF_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    
    # Generate mock detailed metrics
    detailed_metrics = {
        "train_performance": {
            "total_trains_analyzed": 5,
            "average_on_time_performance": 87.2,
            "delay_analysis": {
                "total_delays": 8,
                "average_delay_minutes": 8.5,
                "delay_causes": {
                    "maintenance": 3,
                    "signal_issues": 2,
                    "weather": 1,
                    "technical": 2
                }
            },
            "speed_analysis": {
                "average_speed": 67.5,
                "maximum_speed_achieved": 115.2,
                "speed_efficiency": 0.78
            }
        },
        "section_performance": {
            "total_sections_analyzed": 5,
            "capacity_utilization": 65.4,
            "bottlenecks_identified": 1,
            "maintenance_impact": {
                "sections_under_maintenance": 1,
                "performance_impact_percentage": 15.2
            }
        },
        "system_performance": {
            "overall_efficiency": 78.5,
            "availability": 98.2,
            "response_times": {
                "average_response_time": 3.2,
                "api_response_time": 150,
                "system_processing_time": 45
            }
        }
    }
    
    # Generate recommendations
    recommendations = []
    if include_recommendations:
        recommendations = [
            "Implement predictive maintenance for Section SEC-003 to reduce bottlenecks",
            "Optimize train schedules during peak hours to improve on-time performance",
            "Consider increasing signal response times to reduce delays",
            "Implement energy-efficient routing to reduce environmental impact",
            "Schedule maintenance activities during off-peak hours to minimize disruption"
        ]
    
    return PerformanceReport(
        report_id=report_id,
        report_type="performance",
        time_range=time_range.value,
        generated_at=datetime.utcnow(),
        summary={
            "overall_score": 82.5,
            "key_achievements": [
                "98.2% system availability maintained",
                "15.2% reduction in carbon emissions",
                "87.2% on-time performance achieved"
            ],
            "areas_for_improvement": [
                "Reduce average delay time",
                "Optimize capacity utilization",
                "Improve signal response times"
            ]
        },
        detailed_metrics=detailed_metrics,
        recommendations=recommendations
    )


@router.get("/alerts/summary", response_model=AlertSummary)
async def get_alerts_summary(
    current_user: dict = Depends(get_current_active_user)
) -> AlertSummary:
    """Get alerts summary and recent alerts"""
    
    total_alerts = len(MOCK_ALERTS)
    critical_alerts = len([a for a in MOCK_ALERTS if a["type"] == "critical"])
    warning_alerts = len([a for a in MOCK_ALERTS if a["type"] == "warning"])
    info_alerts = len([a for a in MOCK_ALERTS if a["type"] == "info"])
    resolved_alerts = len([a for a in MOCK_ALERTS if a["resolved"]])
    
    recent_alerts = [
        {
            "id": alert["id"],
            "type": alert["type"],
            "title": alert["title"],
            "message": alert["message"],
            "timestamp": alert["timestamp"].isoformat(),
            "resolved": alert["resolved"],
            "severity": alert["severity"]
        }
        for alert in sorted(MOCK_ALERTS, key=lambda x: x["timestamp"], reverse=True)[:10]
    ]
    
    return AlertSummary(
        total_alerts=total_alerts,
        critical_alerts=critical_alerts,
        warning_alerts=warning_alerts,
        info_alerts=info_alerts,
        resolved_alerts=resolved_alerts,
        recent_alerts=recent_alerts
    )


@router.get("/kpis")
async def get_key_performance_indicators(
    current_user: dict = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """Get key performance indicators (KPIs)"""
    
    return {
        "operational_kpis": {
            "on_time_performance": {
                "value": 87.2,
                "target": 90.0,
                "unit": "percentage",
                "trend": "improving",
                "status": "warning"
            },
            "system_availability": {
                "value": 98.2,
                "target": 99.0,
                "unit": "percentage",
                "trend": "stable",
                "status": "good"
            },
            "average_delay": {
                "value": 8.5,
                "target": 5.0,
                "unit": "minutes",
                "trend": "deteriorating",
                "status": "critical"
            },
            "capacity_utilization": {
                "value": 65.4,
                "target": 80.0,
                "unit": "percentage",
                "trend": "improving",
                "status": "warning"
            }
        },
        "efficiency_kpis": {
            "energy_efficiency": {
                "value": 82.0,
                "target": 85.0,
                "unit": "percentage",
                "trend": "improving",
                "status": "good"
            },
            "cost_per_journey": {
                "value": 15.75,
                "target": 12.00,
                "unit": "currency",
                "trend": "stable",
                "status": "warning"
            },
            "route_optimization": {
                "value": 78.5,
                "target": 80.0,
                "unit": "percentage",
                "trend": "improving",
                "status": "good"
            }
        },
        "safety_kpis": {
            "safety_incidents": {
                "value": 0,
                "target": 0,
                "unit": "count",
                "trend": "stable",
                "status": "excellent"
            },
            "maintenance_compliance": {
                "value": 94.0,
                "target": 95.0,
                "unit": "percentage",
                "trend": "improving",
                "status": "good"
            }
        }
    }


@router.get("/trends")
async def get_analytics_trends(
    days: int = Query(7, ge=1, le=365, description="Number of days for trend analysis"),
    current_user: dict = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """Get analytics trends over specified period"""
    
    # Generate mock trend data
    import random
    
    dates = [(datetime.utcnow() - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(days, 0, -1)]
    
    trends = {
        "on_time_performance": [85 + random.uniform(-5, 5) for _ in dates],
        "system_efficiency": [78 + random.uniform(-8, 8) for _ in dates],
        "energy_consumption": [1200 + random.uniform(-200, 200) for _ in dates],
        "average_delays": [8 + random.uniform(-3, 7) for _ in dates],
        "capacity_utilization": [65 + random.uniform(-10, 15) for _ in dates]
    }
    
    return {
        "period": f"{days} days",
        "dates": dates,
        "trends": trends,
        "analysis": {
            "best_performing_day": dates[trends["on_time_performance"].index(max(trends["on_time_performance"]))],
            "worst_performing_day": dates[trends["on_time_performance"].index(min(trends["on_time_performance"]))],
            "average_efficiency": sum(trends["system_efficiency"]) / len(trends["system_efficiency"]),
            "trend_direction": "improving" if trends["on_time_performance"][-1] > trends["on_time_performance"][0] else "declining"
        }
    }


@router.post("/export")
async def export_analytics_data(
    export_format: str = Query("json", description="Export format (json, csv, pdf)"),
    metric_types: List[MetricType] = Query(default=[], description="Metric types to export"),
    time_range: TimeRange = TimeRange.LAST_WEEK,
    current_user: dict = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """Export analytics data in specified format"""
    
    if not metric_types:
        metric_types = list(MetricType)
    
    export_data = {}
    for metric_type in metric_types:
        if metric_type == MetricType.PERFORMANCE:
            export_data[metric_type.value] = MOCK_ANALYTICS_DATA["performance_metrics"]
        elif metric_type == MetricType.EFFICIENCY:
            export_data[metric_type.value] = MOCK_ANALYTICS_DATA["efficiency_metrics"]
        elif metric_type == MetricType.SAFETY:
            export_data[metric_type.value] = MOCK_ANALYTICS_DATA["safety_metrics"]
        elif metric_type == MetricType.ENVIRONMENTAL:
            export_data[metric_type.value] = MOCK_ANALYTICS_DATA["environmental_metrics"]
    
    export_id = f"EXPORT_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    
    return {
        "export_id": export_id,
        "format": export_format,
        "data": export_data,
        "metadata": {
            "exported_at": datetime.utcnow().isoformat(),
            "exported_by": current_user["username"],
            "time_range": time_range.value,
            "metric_types": [mt.value for mt in metric_types],
            "record_count": sum(len(data) if isinstance(data, list) else 1 for data in export_data.values())
        },
        "download_url": f"/analytics/download/{export_id}",
        "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat()
    }


def generate_time_series_data(time_range: TimeRange, start_date: Optional[datetime], end_date: Optional[datetime]) -> Dict[str, float]:
    """Generate mock time series data based on time range"""
    import random
    
    if time_range == TimeRange.LAST_HOUR:
        # Generate data points for last hour (every 5 minutes)
        times = [(datetime.utcnow() - timedelta(minutes=i*5)).strftime('%H:%M') for i in range(12, 0, -1)]
    elif time_range == TimeRange.LAST_24_HOURS:
        # Generate data points for last 24 hours (every hour)
        times = [(datetime.utcnow() - timedelta(hours=i)).strftime('%H:00') for i in range(24, 0, -1)]
    elif time_range == TimeRange.LAST_WEEK:
        # Generate data points for last week (daily)
        times = [(datetime.utcnow() - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7, 0, -1)]
    elif time_range == TimeRange.LAST_MONTH:
        # Generate data points for last month (daily)
        times = [(datetime.utcnow() - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(30, 0, -1)]
    elif time_range == TimeRange.LAST_YEAR:
        # Generate data points for last year (monthly)
        times = [(datetime.utcnow() - timedelta(days=i*30)).strftime('%Y-%m') for i in range(12, 0, -1)]
    else:
        # Custom range - generate daily data points
        if start_date and end_date:
            delta = end_date - start_date
            times = [(start_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(delta.days + 1)]
        else:
            times = []
    
    # Generate random values for demonstration
    return {time: 70 + random.uniform(-20, 20) for time in times}