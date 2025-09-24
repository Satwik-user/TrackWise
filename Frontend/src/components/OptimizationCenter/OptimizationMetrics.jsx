import React from 'react';
import {
  ClockIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  TruckIcon,
  CpuChipIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import SafeRenderer from '../Common/SafeRenderer';

const OptimizationMetrics = ({ currentMetrics, recentRuns = [], isOptimizing = false }) => {
  const getTrendDirection = (current, baseline) => {
    if (!current || !baseline) return 'stable';
    return current > baseline ? 'up' : 'down';
  };

  const getTrendIcon = (trend) => {
    return trend === 'up' ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  };

  const formatValue = (value, suffix = '') => {
    if (value === null || value === undefined) return '0' + suffix;
    return typeof value === 'number' ? value.toFixed(1) + suffix : value + suffix;
  };

  const metrics = [
    {
      label: 'Avg Delay',
      value: formatValue(currentMetrics?.average_delay, 'm'),
      trend: getTrendDirection(5, currentMetrics?.average_delay),
      icon: ClockIcon,
      color: (currentMetrics?.average_delay || 0) < 5 ? 'green' : 'orange'
    },
    {
      label: 'Throughput',
      value: formatValue(currentMetrics?.throughput, '/h'),
      trend: getTrendDirection(currentMetrics?.throughput, 20),
      icon: TruckIcon,
      color: (currentMetrics?.throughput || 0) > 20 ? 'green' : 'orange'
    },
    {
      label: 'Utilization',
      value: formatValue((currentMetrics?.utilization || 0) * 100, '%'),
      trend: getTrendDirection(currentMetrics?.utilization, 0.7),
      icon: ChartBarIcon,
      color: (currentMetrics?.utilization || 0) > 0.7 ? 'orange' : 'green'
    },
    {
      label: 'Efficiency',
      value: formatValue(currentMetrics?.efficiency_score, '/10'),
      trend: getTrendDirection(currentMetrics?.efficiency_score, 8),
      icon: ArrowTrendingUpIcon,
      color: (currentMetrics?.efficiency_score || 0) > 8 ? 'green' : 'orange'
    }
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Current Status */}
      <div className="bg-white rounded-lg p-4 border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Current Metrics</h3>
          {isOptimizing && (
            <div className="flex items-center space-x-2 text-blue-600">
              <CpuChipIcon className="h-4 w-4 animate-spin" />
              <span className="text-sm">Optimizing...</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            const TrendIcon = getTrendIcon(metric.trend);
            
            return (
              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600"><SafeRenderer>{metric.label}</SafeRenderer></p>
                    <p className="text-lg font-bold text-gray-900"><SafeRenderer>{metric.value}</SafeRenderer></p>
                  </div>
                  <div className="flex flex-col items-center space-y-1">
                    <Icon className={`h-4 w-4 text-${metric.color}-500`} />
                    <TrendIcon className="h-3 w-3 text-gray-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Runs */}
      <div className="bg-white rounded-lg p-4 border">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Runs</h3>
        <div className="space-y-2">
          {recentRuns.length > 0 ? (
            recentRuns.map((run, index) => (
              <div key={run.id || index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    <SafeRenderer>{run.scenario_name || `Run ${run.id}`}</SafeRenderer>
                  </p>
                  <p className="text-xs text-gray-500">
                    <SafeRenderer>{run.start_time ? new Date(run.start_time).toLocaleTimeString() : 'Unknown time'}</SafeRenderer>
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {run.status === 'completed' ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-xs font-medium text-gray-700">
                    <SafeRenderer>{formatValue(run.objective_value * 100, '%')}</SafeRenderer>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No recent runs</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptimizationMetrics;