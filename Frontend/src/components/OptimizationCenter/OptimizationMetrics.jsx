import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

const OptimizationMetrics = ({ optimizationId }) => {
  const [currentMetrics, setCurrentMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (optimizationId) {
      fetchMetrics();
    }
  }, [optimizationId]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/optimization/${optimizationId}/metrics`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setCurrentMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendDirection = (current, baseline) => {
    if (!current || !baseline) return 'stable';
    return current > baseline ? 'up' : 'down';
  };

  const getTrendIcon = (trend) => {
    return trend === 'up' ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  };

  if (loading) {
    return <div>Loading metrics...</div>;
  }

  const metrics = [
    {
      label: 'Throughput',
      value: `${currentMetrics?.throughput?.toFixed(1) || 0}/h`,
      trend: getTrendDirection(currentMetrics?.throughput, 15),
      icon: ArrowTrendingUpIcon,
      color: (currentMetrics?.throughput || 0) > 20 ? 'green' : 'orange'
    },
    {
      label: 'Avg Delay',
      value: `${currentMetrics?.avgDelay?.toFixed(1) || 0}m`,
      trend: getTrendDirection(5, currentMetrics?.avgDelay),
      icon: ArrowTrendingDownIcon,
      color: (currentMetrics?.avgDelay || 0) < 5 ? 'green' : 'red'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const TrendIcon = getTrendIcon(metric.trend);
        
        return (
          <div key={index} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{metric.label}</p>
                <p className="text-xl font-bold">{metric.value}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Icon className={`h-5 w-5 text-${metric.color}-500`} />
                <TrendIcon className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OptimizationMetrics;