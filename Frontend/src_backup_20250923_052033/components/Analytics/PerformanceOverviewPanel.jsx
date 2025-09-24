import React, { useState, useEffect } from 'react';
import {
  TruckIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';

const PerformanceOverviewPanel = ({ timeRange = '24h' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPerformanceData();
  }, [timeRange]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/performance?timeRange=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch performance data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend) => {
    return trend === 'up' ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  };

  const getTrendColor = (trend) => {
    return trend === 'up' ? 'text-green-500' : 'text-red-500';
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!data) return <div>No data available</div>;

  const metrics = [
    {
      id: 'throughput',
      label: 'Trains/Hour',
      value: data.throughput_metrics?.trains_per_hour?.toFixed(1) || '0',
      target: '> 20/h',
      status: (data.throughput_metrics?.trains_per_hour || 0) > 20 ? 'good' : 'warning',
      icon: TruckIcon,
      trend: data.throughput_metrics?.trend || 'stable'
    },
    {
      id: 'delays',
      label: 'Avg Delay',
      value: `${data.delay_metrics?.average_delay_minutes?.toFixed(1) || '0'}m`,
      target: '< 5m',
      status: (data.delay_metrics?.average_delay_minutes || 0) < 5 ? 'good' : 'warning',
      icon: ClockIcon,
      trend: data.delay_metrics?.trend || 'stable'
    },
    {
      id: 'ontime',
      label: 'On-Time %',
      value: `${data.punctuality_metrics?.on_time_percentage?.toFixed(1) || '0'}%`,
      target: '> 95%',
      status: (data.punctuality_metrics?.on_time_percentage || 0) > 95 ? 'good' : 'warning',
      icon: ChartBarIcon,
      trend: data.punctuality_metrics?.trend || 'stable'
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const TrendIcon = getTrendIcon(metric.trend);
          
          return (
            <div key={metric.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Icon className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    <p className="text-xs text-gray-500">Target: {metric.target}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <TrendIcon className={`h-5 w-5 ${getTrendColor(metric.trend)}`} />
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    metric.status === 'good' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {metric.status === 'good' ? 'Good' : 'Warning'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Performance Trends</h3>
          <button className="flex items-center text-sm text-blue-600 hover:text-blue-500">
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>
        <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
          <p className="text-gray-500">Performance trends chart</p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceOverviewPanel;