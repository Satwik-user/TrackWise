import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  TruckIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';

// Remove granularity from function parameters since it's declared as state
const ThroughputTrendsPanel = ({ timeRange = '7d' }) => {
  const [data, setData] = useState({
    throughputTrends: [],
    hourlyPattern: [],
    sectionBreakdown: [],
    trainTypeBreakdown: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeChart, setActiveChart] = useState('trends');
  const [granularity, setGranularity] = useState('hourly'); // Keep this state variable

  useEffect(() => {
    fetchThroughputData();
  }, [timeRange, granularity]);

  const fetchThroughputData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/analytics/throughput?timeRange=${timeRange}&granularity=${granularity}`
      );
      if (!response.ok) throw new Error('Failed to fetch throughput data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error: {typeof error === 'string' ? error : JSON.stringify(error)}</div>;

  const chartTabs = [
    { id: 'trends', name: 'Throughput Trends', icon: ArrowTrendingUpIcon },
    { id: 'hourly', name: 'Hourly Pattern', icon: ClockIcon },
    { id: 'sections', name: 'By Section', icon: ChartBarIcon },
    { id: 'types', name: 'By Train Type', icon: TruckIcon }
  ];

  const totalThroughput = data.throughputTrends?.reduce((sum, item) => sum + (item.value || 0), 0) || 0;
  const avgThroughput = data.throughputTrends?.length ? (totalThroughput / data.throughputTrends.length) : 0;
  const peakThroughput = Math.max(...(data.throughputTrends?.map(item => item.value || 0) || [0]));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <ArrowTrendingUpIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Throughput</p>
              <p className="text-2xl font-bold text-gray-900">
                {avgThroughput.toFixed(1)}/h
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Peak Throughput</p>
              <p className="text-2xl font-bold text-gray-900">
                {peakThroughput.toFixed(1)}/h
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TruckIcon className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Trains</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalThroughput.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Granularity:</label>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
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
          {activeChart === 'trends' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Throughput Trends</h3>
              <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
                <p className="text-gray-500">Throughput trends chart</p>
              </div>
            </div>
          )}

          {activeChart === 'hourly' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Hourly Pattern</h3>
              <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
                <p className="text-gray-500">Hourly pattern chart</p>
              </div>
            </div>
          )}

          {activeChart === 'sections' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Throughput by Section</h3>
              <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
                <p className="text-gray-500">Section breakdown chart</p>
              </div>
            </div>
          )}

          {activeChart === 'types' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Throughput by Train Type</h3>
              <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
                <p className="text-gray-500">Train type breakdown chart</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThroughputTrendsPanel;