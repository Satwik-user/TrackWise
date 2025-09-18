import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';

const DelayAnalysisPanel = ({ timeRange = '7d', trainType = 'all', sectionId = 'all' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeChart, setActiveChart] = useState('overview');

  useEffect(() => {
    fetchDelayData();
  }, [timeRange, trainType, sectionId]);

  const fetchDelayData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/analytics/delays?timeRange=${timeRange}&trainType=${trainType}&sectionId=${sectionId}`
      );
      if (!response.ok) throw new Error('Failed to fetch delay data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!data) return <div>No data available</div>;

  const totalDelays = data.delay_summary?.total_delays || 0;
  const avgDelayTime = data.delay_summary?.average_delay_minutes || 0;
  const improvingCount = data.trends?.improving || 0;
  const worseningCount = data.trends?.worsening || 0;

  const chartTabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'causes', name: 'Delay Causes', icon: ExclamationTriangleIcon },
    { id: 'trends', name: 'Trends', icon: ArrowTrendingUpIcon },
    { id: 'timeline', name: 'Timeline', icon: ClockIcon }
  ];

  const trendData = [
    { 
      name: 'Improving', 
      value: improvingCount, 
      color: '#10B981', 
      icon: ArrowTrendingUpIcon 
    },
    { 
      name: 'Worsening', 
      value: worseningCount, 
      color: '#EF4444', 
      icon: ArrowTrendingDownIcon 
    }
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Delays</p>
              <p className="text-2xl font-bold text-gray-900">{totalDelays}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Delay Time</p>
              <p className="text-2xl font-bold text-gray-900">{avgDelayTime.toFixed(1)}m</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Performance</p>
              <p className="text-2xl font-bold text-gray-900">
                {((1 - totalDelays / (data.total_trains || 1)) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {chartTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveChart(tab.id)}
                  className={`${
                    activeChart === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeChart === 'overview' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Delay Overview</h3>
              {/* Chart content would go here */}
              <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
                <p className="text-gray-500">Delay overview chart</p>
              </div>
            </div>
          )}

          {activeChart === 'trends' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Delay Trends</h3>
              <div className="grid grid-cols-2 gap-4">
                {trendData.map((trend) => {
                  const Icon = trend.icon;
                  return (
                    <div key={trend.name} className="flex items-center p-4 bg-gray-50 rounded">
                      <Icon className="h-6 w-6 mr-3" style={{ color: trend.color }} />
                      <div>
                        <p className="font-medium">{trend.name}</p>
                        <p className="text-lg font-bold">{trend.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Other chart content */}
        </div>
      </div>
    </div>
  );
};

export default DelayAnalysisPanel;