import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  ClockIcon,
  TruckIcon,
  CpuChipIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';

const EnhancedKPIPanel = ({ className = '' }) => {
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchKPIData();
    const interval = setInterval(fetchKPIData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchKPIData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch multiple analytics endpoints for comprehensive KPIs
      const [performance, throughput, delays, utilization] = await Promise.all([
        apiService.analytics.getPerformanceOverview(24),
        apiService.analytics.getThroughputTrends(24),
        apiService.analytics.getDelayAnalysis(24),
        apiService.analytics.getSectionUtilization(24)
      ]);

      setKpiData({
        performance,
        throughput,
        delays,
        utilization,
        timestamp: new Date().toISOString()
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch KPI data:', err);
      setError('Unable to fetch KPI data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return 'neutral';
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 2) return 'neutral';
    return change > 0 ? 'up' : 'down';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return ArrowTrendingUpIcon;
      case 'down': return ArrowTrendingDownIcon;
      default: return MinusIcon;
    }
  };

  const getTrendColor = (trend, isGood = true) => {
    if (trend === 'neutral') return 'text-gray-500';
    const isPositive = (trend === 'up' && isGood) || (trend === 'down' && !isGood);
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (value, threshold, isHigherBetter = true) => {
    const isGood = isHigherBetter ? value >= threshold : value <= threshold;
    return isGood ? CheckCircleIcon : ExclamationTriangleIcon;
  };

  const getStatusColor = (value, threshold, isHigherBetter = true) => {
    const isGood = isHigherBetter ? value >= threshold : value <= threshold;
    return isGood ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-100 h-24 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center text-red-600 mb-4">
          <ExclamationTriangleIcon className="w-6 h-6 mr-2" />
          <h3 className="text-lg font-semibold">System KPIs</h3>
        </div>
        <p className="text-red-600 text-sm">{typeof error === 'string' ? error : JSON.stringify(error)}</p>
        <button
          onClick={fetchKPIData}
          className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!kpiData) return null;

  // Calculate KPI values
  const systemEfficiency = kpiData.performance?.overall_efficiency || 0;
  const avgDelay = kpiData.delays?.average_delay || 0;
  const punctualityRate = kpiData.performance?.punctuality_rate || 0;
  const throughputRate = kpiData.throughput?.current_throughput || 0;
  const sectionUtilization = kpiData.utilization?.average_utilization || 0;
  const energyEfficiency = kpiData.performance?.energy_efficiency || 0;
  const safetyScore = kpiData.performance?.safety_score || 0;
  const costEfficiency = kpiData.performance?.cost_efficiency || 0;

  // Calculate trends (mock previous values for demo)
  const systemEfficiencyTrend = calculateTrend(systemEfficiency, 0.82);
  const delayTrend = calculateTrend(avgDelay, 6.2);
  const punctualityTrend = calculateTrend(punctualityRate, 0.88);
  const throughputTrend = calculateTrend(throughputRate, 145);

  const kpis = [
    {
      name: 'System Efficiency',
      value: `${(systemEfficiency * 100).toFixed(1)}%`,
      target: '85%',
      icon: CpuChipIcon,
      trend: systemEfficiencyTrend,
      status: getStatusIcon(systemEfficiency, 0.85),
      statusColor: getStatusColor(systemEfficiency, 0.85),
      trendColor: getTrendColor(systemEfficiencyTrend, true),
      description: 'Overall operational efficiency'
    },
    {
      name: 'Average Delay',
      value: `${avgDelay.toFixed(1)}m`,
      target: '<5m',
      icon: ClockIcon,
      trend: delayTrend,
      status: getStatusIcon(avgDelay, 5, false),
      statusColor: getStatusColor(avgDelay, 5, false),
      trendColor: getTrendColor(delayTrend, false),
      description: 'Average delay per train'
    },
    {
      name: 'Punctuality Rate',
      value: `${(punctualityRate * 100).toFixed(1)}%`,
      target: '90%',
      icon: CheckCircleIcon,
      trend: punctualityTrend,
      status: getStatusIcon(punctualityRate, 0.90),
      statusColor: getStatusColor(punctualityRate, 0.90),
      trendColor: getTrendColor(punctualityTrend, true),
      description: 'On-time performance'
    },
    {
      name: 'Throughput',
      value: `${throughputRate.toFixed(0)}`,
      target: '150/hr',
      icon: TruckIcon,
      trend: throughputTrend,
      status: getStatusIcon(throughputRate, 150),
      statusColor: getStatusColor(throughputRate, 150),
      trendColor: getTrendColor(throughputTrend, true),
      description: 'Trains per hour'
    },
    {
      name: 'Section Utilization',
      value: `${(sectionUtilization * 100).toFixed(1)}%`,
      target: '70%',
      icon: ChartBarIcon,
      trend: 'neutral',
      status: getStatusIcon(sectionUtilization, 0.70),
      statusColor: getStatusColor(sectionUtilization, 0.70),
      trendColor: 'text-gray-500',
      description: 'Average track usage'
    },
    {
      name: 'Energy Efficiency',
      value: `${(energyEfficiency * 100).toFixed(1)}%`,
      target: '75%',
      icon: CpuChipIcon,
      trend: 'up',
      status: getStatusIcon(energyEfficiency, 0.75),
      statusColor: getStatusColor(energyEfficiency, 0.75),
      trendColor: 'text-green-600',
      description: 'Power consumption efficiency'
    },
    {
      name: 'Safety Score',
      value: `${(safetyScore * 100).toFixed(1)}%`,
      target: '95%',
      icon: CheckCircleIcon,
      trend: 'neutral',
      status: getStatusIcon(safetyScore, 0.95),
      statusColor: getStatusColor(safetyScore, 0.95),
      trendColor: 'text-gray-500',
      description: 'Safety compliance rate'
    },
    {
      name: 'Cost Efficiency',
      value: `${(costEfficiency * 100).toFixed(1)}%`,
      target: '80%',
      icon: ChartBarIcon,
      trend: 'down',
      status: getStatusIcon(costEfficiency, 0.80),
      statusColor: getStatusColor(costEfficiency, 0.80),
      trendColor: 'text-red-600',
      description: 'Operational cost optimization'
    }
  ];

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">System KPIs</h3>
            <p className="text-sm text-gray-500">Real-time performance indicators</p>
          </div>
          <div className="text-xs text-gray-500">
            Updated: {lastUpdated?.toLocaleTimeString()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const IconComponent = kpi.icon;
            const TrendIcon = getTrendIcon(kpi.trend);
            const StatusIcon = kpi.status;

            return (
              <div key={kpi.name} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <IconComponent className="w-5 h-5 text-gray-600" />
                  <div className="flex items-center space-x-1">
                    <StatusIcon className={`w-4 h-4 ${kpi.statusColor}`} />
                    <TrendIcon className={`w-4 h-4 ${kpi.trendColor}`} />
                  </div>
                </div>
                
                <div className="mb-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-gray-900">{kpi.value}</span>
                    <span className="text-sm text-gray-500">{kpi.target}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">{kpi.name}</h4>
                  <p className="text-xs text-gray-500">{kpi.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Auto-refresh: 30s</span>
            <button
              onClick={fetchKPIData}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Refresh Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedKPIPanel;