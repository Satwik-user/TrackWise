"""
Analytics schemas for API request/response validation
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, validator, Field
from enum import Enum


class TimeGranularity(str, Enum):
    """Time granularity for analytics queries"""
    MINUTE = "minute"
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"


class MetricType(str, Enum):
    """Types of metrics available"""
    COUNT = "count"
    SUM = "sum"
    AVERAGE = "average"
    MIN = "min"
    MAX = "max"
    MEDIAN = "median"
    PERCENTILE = "percentile"
    RATE = "rate"
    RATIO = "ratio"


class ChartType(str, Enum):
    """Chart types for visualization"""
    LINE = "line"
    BAR = "bar"
    AREA = "area"
    PIE = "pie"
    SCATTER = "scatter"
    HISTOGRAM = "histogram"
    HEATMAP = "heatmap"
    GAUGE = "gauge"
    TABLE = "table"


class DateRange(BaseModel):
    """Date range for analytics queries"""
    start_date: date = Field(..., description="Start date")
    end_date: date = Field(..., description="End date")
    
    @validator('end_date')
    def end_date_after_start_date(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after start date')
        return v
    
    @validator('start_date')
    def start_date_not_future(cls, v):
        if v > date.today():
            raise ValueError('Start date cannot be in the future')
        return v


class TimeSeriesPoint(BaseModel):
    """Single point in a time series"""
    timestamp: datetime
    value: Union[int, float]
    metadata: Optional[Dict[str, Any]] = None


class TimeSeries(BaseModel):
    """Time series data"""
    name: str
    data: List[TimeSeriesPoint]
    unit: Optional[str] = None
    description: Optional[str] = None


class MetricDefinition(BaseModel):
    """Metric definition for analytics"""
    name: str = Field(..., description="Metric name")
    display_name: str = Field(..., description="Human-readable metric name")
    description: Optional[str] = Field(None, description="Metric description")
    metric_type: MetricType
    unit: Optional[str] = Field(None, description="Metric unit (e.g., 'minutes', 'count', '%')")
    category: str = Field(..., description="Metric category")
    formula: Optional[str] = Field(None, description="Calculation formula")
    is_percentage: bool = Field(False, description="Whether metric is a percentage")
    decimal_places: int = Field(2, description="Number of decimal places to display")


class AnalyticsQuery(BaseModel):
    """Analytics query parameters"""
    metrics: List[str] = Field(..., min_items=1, description="List of metric names to query")
    date_range: DateRange
    granularity: TimeGranularity = Field(TimeGranularity.DAY, description="Time granularity")
    filters: Optional[Dict[str, Any]] = Field(None, description="Additional filters")
    group_by: Optional[List[str]] = Field(None, description="Fields to group by")
    limit: Optional[int] = Field(None, gt=0, le=10000, description="Maximum number of results")
    offset: Optional[int] = Field(None, ge=0, description="Offset for pagination")
    
    @validator('metrics')
    def validate_metrics(cls, v):
        # In practice, you'd validate against available metrics
        allowed_metrics = [
            'train_count', 'delay_minutes', 'section_utilization',
            'optimization_success_rate', 'energy_consumption',
            'passenger_satisfaction', 'on_time_performance'
        ]
        for metric in v:
            if metric not in allowed_metrics:
                raise ValueError(f'Invalid metric: {metric}')
        return v


class TrainAnalytics(BaseModel):
    """Train-specific analytics"""
    total_trains: int
    active_trains: int
    delayed_trains: int
    on_time_trains: int
    average_delay_minutes: float
    max_delay_minutes: float
    total_distance_km: float
    average_speed_kmh: float
    energy_consumption_kwh: float
    on_time_percentage: float


class SectionAnalytics(BaseModel):
    """Section-specific analytics"""
    total_sections: int
    available_sections: int
    occupied_sections: int
    maintenance_sections: int
    average_utilization_percentage: float
    max_utilization_percentage: float
    total_capacity: int
    throughput_trains_per_hour: float
    bottleneck_sections: List[str]


class OptimizationAnalytics(BaseModel):
    """Optimization-specific analytics"""
    total_runs: int
    successful_runs: int
    failed_runs: int
    average_runtime_seconds: float
    average_improvement_percentage: float
    best_objective_value: float
    worst_objective_value: float
    optimization_types: Dict[str, int]
    solver_performance: Dict[str, float]


class SystemPerformance(BaseModel):
    """Overall system performance metrics"""
    uptime_percentage: float
    response_time_ms: float
    throughput_requests_per_second: float
    error_rate_percentage: float
    resource_utilization: Dict[str, float]
    active_users: int
    system_load: float


class DashboardMetrics(BaseModel):
    """Dashboard summary metrics"""
    train_analytics: TrainAnalytics
    section_analytics: SectionAnalytics
    optimization_analytics: OptimizationAnalytics
    system_performance: SystemPerformance
    last_updated: datetime


class KPIMetric(BaseModel):
    """Key Performance Indicator metric"""
    name: str
    current_value: Union[int, float]
    target_value: Optional[Union[int, float]] = None
    previous_value: Optional[Union[int, float]] = None
    change_percentage: Optional[float] = None
    trend: str = Field(..., regex="^(up|down|stable)$")
    unit: Optional[str] = None
    status: str = Field(..., regex="^(good|warning|critical)$")
    description: Optional[str] = None


class ChartData(BaseModel):
    """Chart data structure"""
    chart_type: ChartType
    title: str
    subtitle: Optional[str] = None
    x_axis_label: Optional[str] = None
    y_axis_label: Optional[str] = None
    data: List[Dict[str, Any]]
    metadata: Optional[Dict[str, Any]] = None


class AnalyticsReport(BaseModel):
    """Complete analytics report"""
    title: str
    description: Optional[str] = None
    generated_at: datetime
    date_range: DateRange
    kpis: List[KPIMetric]
    charts: List[ChartData]
    summary: Dict[str, Any]
    recommendations: Optional[List[str]] = None


class DelayAnalysis(BaseModel):
    """Detailed delay analysis"""
    total_delays: int
    average_delay_minutes: float
    median_delay_minutes: float
    delay_distribution: Dict[str, int]  # Delay ranges and counts
    top_delay_causes: List[Dict[str, Any]]
    delay_trends: TimeSeries
    most_delayed_routes: List[Dict[str, Any]]
    delay_impact_cost: Optional[float] = None


class UtilizationAnalysis(BaseModel):
    """Section utilization analysis"""
    average_utilization: float
    peak_utilization: float
    utilization_distribution: Dict[str, int]
    underutilized_sections: List[Dict[str, Any]]
    overutilized_sections: List[Dict[str, Any]]
    utilization_trends: TimeSeries
    capacity_recommendations: List[str]


class OptimizationImpact(BaseModel):
    """Optimization impact analysis"""
    baseline_metrics: Dict[str, float]
    optimized_metrics: Dict[str, float]
    improvements: Dict[str, float]
    cost_savings: Optional[float] = None
    time_savings_minutes: Optional[float] = None
    efficiency_gains: Dict[str, float]
    implementation_rate: float


class PredictiveAnalytics(BaseModel):
    """Predictive analytics results"""
    model_type: str
    prediction_horizon_hours: int
    confidence_interval: float
    predictions: List[Dict[str, Any]]
    accuracy_metrics: Dict[str, float]
    feature_importance: Dict[str, float]
    alerts: List[Dict[str, Any]]


class AlertDefinition(BaseModel):
    """Analytics alert definition"""
    name: str
    description: str
    metric: str
    condition: str  # e.g., "greater_than", "less_than", "equals"
    threshold: Union[int, float]
    severity: str = Field(..., regex="^(low|medium|high|critical)$")
    is_active: bool = True
    notification_channels: List[str]


class Alert(BaseModel):
    """Active analytics alert"""
    id: int
    alert_definition: AlertDefinition
    current_value: Union[int, float]
    triggered_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    status: str = Field(..., regex="^(active|acknowledged|resolved)$")
    metadata: Optional[Dict[str, Any]] = None


class AnalyticsExport(BaseModel):
    """Analytics export configuration"""
    report_type: str
    date_range: DateRange
    metrics: List[str]
    format: str = Field(..., regex="^(csv|xlsx|pdf|json)$")
    include_charts: bool = True
    include_raw_data: bool = False
    email_recipients: Optional[List[str]] = None
    schedule: Optional[str] = None  # Cron expression for scheduled exports


class ComparisonAnalysis(BaseModel):
    """Comparison analysis between time periods"""
    period_1: DateRange
    period_2: DateRange
    metrics: List[str]
    comparison_results: Dict[str, Dict[str, Union[int, float]]]
    significant_changes: List[Dict[str, Any]]
    statistical_tests: Optional[Dict[str, Any]] = None


class PerformanceBenchmark(BaseModel):
    """Performance benchmarking results"""
    benchmark_name: str
    our_performance: Dict[str, float]
    industry_average: Dict[str, float]
    best_in_class: Dict[str, float]
    percentile_ranking: Dict[str, float]
    improvement_opportunities: List[str]


class RealTimeMetrics(BaseModel):
    """Real-time system metrics"""
    timestamp: datetime
    active_trains: int
    system_load: float
    response_time_ms: float
    throughput: float
    error_rate: float
    memory_usage_mb: float
    cpu_usage_percentage: float
    network_io_mbps: float
    database_connections: int


class HistoricalTrend(BaseModel):
    """Historical trend analysis"""
    metric_name: str
    time_series: TimeSeries
    trend_direction: str = Field(..., regex="^(increasing|decreasing|stable|volatile)$")
    trend_strength: float = Field(..., ge=0, le=1)
    seasonality_detected: bool
    anomalies: List[Dict[str, Any]]
    forecast: Optional[List[TimeSeriesPoint]] = None


# Export schemas
__all__ = [
    "TimeGranularity",
    "MetricType", 
    "ChartType",
    "DateRange",
    "TimeSeriesPoint",
    "TimeSeries",
    "MetricDefinition",
    "AnalyticsQuery",
    "TrainAnalytics",
    "SectionAnalytics", 
    "OptimizationAnalytics",
    "SystemPerformance",
    "DashboardMetrics",
    "KPIMetric",
    "ChartData",
    "AnalyticsReport",
    "DelayAnalysis",
    "UtilizationAnalysis",
    "OptimizationImpact",
    "PredictiveAnalytics",
    "AlertDefinition",
    "Alert",
    "AnalyticsExport",
    "ComparisonAnalysis",
    "PerformanceBenchmark",
    "RealTimeMetrics",
    "HistoricalTrend"
]