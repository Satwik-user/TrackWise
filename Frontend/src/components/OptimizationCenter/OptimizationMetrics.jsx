import React from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline';

const OptimizationMetrics = ({ 
  currentMetrics, 
  recentRuns, 
  isOptimizing 
}) => {
  const getSuccessRate = () => {
    if (!recentRuns || recentRuns.length === 0) return 0;
    const successful = recentRuns.filter(run => 
      ['OPTIMAL', 'FEASIBLE'].includes(run.solution_status)
    ).length;
    return (successful / recentRuns.length) * 100;
  };

  const getAverageSolvingTime = () => {
    if (!recentRuns || recentRuns.length === 0) return 0;
    const totalTime = recentRuns.reduce((sum, run) => sum + (run.solving_time || 0), 0);
    return totalTime / recentRuns.length;
  };

  const getTrendDirection = (current, previous) => {
    if (!previous) return null;
    return current > previous ? 'up' : current < previous ? 'down' : 'stable';
  };

  const metrics = [
    {
      label: 'System Delay',
      value: `${currentMetrics?.total_delay?.toFixed(1) || 0}m`,
      trend: getTrendDirection(currentMetrics?.total_delay, 450),
      icon: ClockIcon,
      color: (currentMetrics?.total_delay || 0) < 300 ? 'green' : 'red'
    },
    {
      label: 'Throughput',
      value: `${currentMetrics?.throughput?.toFixed(1) || 0}/h`,
      trend: getTrendDirection(currentMetrics?.throughput, 15),
      icon: TrendingUpIcon,
      color: (currentMetrics?.throughput || 0) > 20 ? 'green' : 'orange'
    },
    {
      label: 'Success Rate',
      value: `${getSuccessRate().toFixed(0)}%`,
      trend: 'up',
      icon: CheckCircleIcon,
      color: getSuccessRate() > 80 ? 'green' : 'orange'
    },
    {
      label: 'Avg Solve Time',
      value: `${getAverageSolvingTime().toFixed(1)}s`,
      trend: getTrendDirection(getAverageSolvingTime(), 45),
      icon: CpuChipIcon,
      color: getAverageSolvingTime() < 30 ? 'green' : 'orange'
    }
  ];

  const getColorClasses = (color) => {
    const classes = {
      green: 'text-green-600 bg-green-100',
      orange: 'text-orange-600 bg-orange-100',
      red: 'text-red-600 bg-red-100',
      blue: 'text-blue-600 bg-blue-100'
    };
    return classes[color] || classes.blue;
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return TrendingUpIcon;
      case 'down':
        return TrendingDownIcon;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <ChartBarIcon className="h-5 w-5 mr-2" />
          Optimization Metrics
        </h2>
      </div>

      {/* Current Status */}
      {isOptimizing && (
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            <div>
              <p className="text-sm font-medium text-blue-900">Optimization Running</p>
              <p className="text-xs text-blue-700">Processing current scenario...</p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="p-4 space-y-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const TrendIcon = getTrendIcon(metric.trend);
          const colorClasses = getColorClasses(metric.color);

          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="border border-gray-200 rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 rounded-md ${colorClasses}`}>
                  <Icon className="h-4 w-4" />
                </div>
                {TrendIcon && (
                  <TrendIcon className={`h-4 w-4 ${
                    metric.trend === 'up' ? 'text-green-500' : 'text-red-500'
                  }`} />
                )}
              </div>
              
              <div>
                <p className="text-lg font-bold text-gray-900">{metric.value}</p>
                <p className="text-xs text-gray-500">{metric.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Runs */}
      <div className="flex-1 overflow-hidden">
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Runs</h3>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentRuns && recentRuns.length > 0 ? (
              recentRuns.map((run, index) => (
                <RecentRunItem key={run.run_id || index} run={run} />
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <CpuChipIcon className="h-8 w-8 mx-auto mb-2" />
                <p className="text-xs">No recent runs</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-900 mb-2">System Health</h3>
        
        <div className="space-y-2">
          <HealthIndicator
            label="Optimization Engine"
            status="healthy"
            uptime="99.8%"
          />
          <HealthIndicator
            label="ML Models"
            status="healthy"
            uptime="98.2%"
          />
          <HealthIndicator
            label="Data Pipeline"
            status={currentMetrics ? "healthy" : "warning"}
            uptime={currentMetrics ? "100%" : "95.4%"}
          />
        </div>
      </div>
    </div>
  );
};

// Recent Run Item Component
const RecentRunItem = ({ run }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'OPTIMAL':
        return 'bg-green-100 text-green-800';
      case 'FEASIBLE':
        return 'bg-blue-100 text-blue-800';
      case 'INFEASIBLE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-2 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-900 truncate">
          {run.scenario_name}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getStatusColor(run.solution_status)}`}>
          {run.solution_status}
        </span>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{formatTime(run.created_at)}</span>
        <span>{run.solving_time?.toFixed(1)}s</span>
      </div>
      
      {run.objective_value && (
        <div className="mt-1 text-xs text-gray-600">
          Objective: {run.objective_value.toFixed(1)}
        </div>
      )}
    </div>
  );
};

// Health Indicator Component
const HealthIndicator = ({ label, status, uptime }) => {
  const statusColors = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <span className="text-gray-700">{label}</span>
      </div>
      <span className="text-gray-500">{uptime}</span>
    </div>
  );
};

export default OptimizationMetrics;