import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  TrainIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const PerformanceOverviewPanel = ({ data, isLoading, timeRange, compact = false }) => {
  const [selectedMetric, setSelectedMetric] = useState('delay');

  if (isLoading) {
    return <LoadingSkeleton compact={compact} />;
  }

  if (!data) {
    return <EmptyState />;
  }

  // Generate sample time series data for visualization
  const timeSeriesData = generateTimeSeriesData(timeRange);
  
  const metrics = [
    {
      id: 'delay',
      label: 'Average Delay',
      value: `${data.train_metrics?.average_delay_minutes?.toFixed(1) || 0}m`,
      change: -12.5,
      target: '< 15m',
      status: (data.train_metrics?.average_delay_minutes || 0) < 15 ? 'good' : 'warning',
      icon: ClockIcon
    },
    {
      id: 'punctuality',
      label: 'On-Time Performance',
      value: `${data.train_metrics?.on_time_percentage?.toFixed(1) || 0}%`,
      change: 8.3,
      target: '> 85%',
      status: (data.train_metrics?.on_time_percentage || 0) > 85 ? 'good' : 'warning',
      icon: CheckCircleIcon
    },
    {
      id: 'throughput',
      label: 'System Throughput',
      value: `${data.throughput_metrics?.trains_per_hour || 0}/h`,
      change: 15.2,
      target: '> 20/h',
      status: (data.throughput_metrics?.trains_per_hour || 0) > 20 ? 'good' : 'warning',
      icon: TrainIcon
    },
    {
      id: 'utilization',
      label: 'Capacity Utilization',
      value: `${data.capacity_metrics?.utilization_percentage?.toFixed(1) || 0}%`,
      change: -4.1,
      target: '70-85%',
      status: 'good',
      icon: ChartBarIcon
    }
  ];

  const distributionData = [
    { name: 'On Time', value: data.train_metrics?.on_time_percentage || 0, color: '#10b981' },
    { name: 'Minor Delay', value: 15, color: '#f59e0b' },
    { name: 'Major Delay', value: 10, color: '#ef4444' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card ${compact ? 'h-96' : ''}`}
    >
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Performance Overview
          </h3>
          {!compact && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Last {timeRange}h</span>
              <ArrowPathIcon className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      <div className={`space-y-6 ${compact ? 'max-h-80 overflow-y-auto' : ''}`}>
        {/* Key Metrics */}
        <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'} gap-4`}>
          {metrics.map((metric, index) => (
            <MetricCard
              key={metric.id}
              metric={metric}
              onClick={() => setSelectedMetric(metric.id)}
              isSelected={selectedMetric === metric.id}
              compact={compact}
            />
          ))}
        </div>

        {!compact && (
          <>
            {/* Trend Chart */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Performance Trends - {metrics.find(m => m.id === selectedMetric)?.label}
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={selectedMetric}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Train Status Distribution</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Performance Targets</h4>
                <div className="space-y-3">
                  {metrics.map((metric) => (
                    <TargetIndicator key={metric.id} metric={metric} />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

// Metric Card Component
const MetricCard = ({ metric, onClick, isSelected, compact }) => {
  const Icon = metric.icon;
  const isPositive = metric.change > 0;

  const statusColors = {
    good: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    critical: 'border-red-200 bg-red-50'
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      } ${statusColors[metric.status] || ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className={`h-4 w-4 ${
          metric.status === 'good' ? 'text-green-600' :
          metric.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
        }`} />
        {!compact && (
          <div className={`flex items-center text-xs ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositive ? (
              <TrendingUpIcon className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDownIcon className="h-3 w-3 mr-1" />
            )}
            {Math.abs(metric.change).toFixed(1)}%
          </div>
        )}
      </div>
      
      <div>
        <p className={`font-bold ${compact ? 'text-lg' : 'text-xl'} text-gray-900 mb-1`}>
          {metric.value}
        </p>
        <p className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'}`}>
          {metric.label}
        </p>
        {!compact && (
          <p className="text-xs text-gray-500 mt-1">
            Target: {metric.target}
          </p>
        )}
      </div>
    </div>
  );
};

// Target Indicator Component
const TargetIndicator = ({ metric }) => {
  const getProgressWidth = () => {
    // Simple calculation for demo - in real app, this would be more sophisticated
    switch (metric.id) {
      case 'delay':
        return Math.max(0, 100 - parseFloat(metric.value));
      case 'punctuality':
        return parseFloat(metric.value);
      case 'throughput':
        return Math.min(100, (parseFloat(metric.value) / 25) * 100);
      case 'utilization':
        return parseFloat(metric.value);
      default:
        return 75;
    }
  };

  const progress = getProgressWidth();
  const isOnTarget = metric.status === 'good';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700">{metric.label}</span>
        <span className={`font-medium ${isOnTarget ? 'text-green-600' : 'text-red-600'}`}>
          {metric.value}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            isOnTarget ? 'bg-green-500' : 'bg-red-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Target: {metric.target}</span>
        <span className={isOnTarget ? 'text-green-600' : 'text-red-600'}>
          {isOnTarget ? 'On Target' : 'Below Target'}
        </span>
      </div>
    </div>
  );
};

// Helper function to generate time series data
const generateTimeSeriesData = (hours) => {
  const data = [];
  const now = new Date();
  
  for (let i = hours; i >= 0; i -= Math.max(1, Math.floor(hours / 20))) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      delay: Math.max(0, 15 + Math.sin(i / 5) * 8 + Math.random() * 5),
      punctuality: Math.max(70, 85 + Math.cos(i / 7) * 10 + Math.random() * 5),
      throughput: Math.max(10, 20 + Math.sin(i / 3) * 5 + Math.random() * 3),
      utilization: Math.max(50, 75 + Math.sin(i / 4) * 15 + Math.random() * 8)
    });
  }
  
  return data;
};

// Loading Skeleton Component
const LoadingSkeleton = ({ compact }) => {
  return (
    <div className={`card ${compact ? 'h-96' : ''}`}>
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        
        <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-4'} gap-4 mb-6`}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-3 border border-gray-200 rounded-lg">
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-2/3 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
        
        {!compact && (
          <div className="h-64 bg-gray-200 rounded"></div>
        )}
      </div>
    </div>
  );
};

// Empty State Component
const EmptyState = () => {
  return (
    <div className="card">
      <div className="text-center py-12 text-gray-500">
        <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Data</h3>
        <p className="text-sm">Performance data will appear here once trains start operating.</p>
      </div>
    </div>
  );
};

export default PerformanceOverviewPanel;