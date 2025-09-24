import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  ChartBarIcon,
  ClockIcon,
  TruckIcon,
  ArrowArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

const PerformanceCharts = ({ timeRange = '24h' }) => {
  const [data, setData] = useState({
    throughput: [],
    delays: [],
    efficiency: [],
    trainTypes: [],
    sectionUtilization: []
  });
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('throughput');

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/v1/analytics/performance?timeRange=${timeRange}`);
        if (!response.ok) throw new Error('Failed to fetch performance data');
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Performance data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, [timeRange]);

  const chartTabs = [
    { id: 'throughput', name: 'Throughput', icon: ArrowArrowTrendingUpIcon },
    { id: 'delays', name: 'Delays', icon: ClockIcon },
    { id: 'efficiency', name: 'Efficiency', icon: ChartBarIcon },
    { id: 'types', name: 'Train Types', icon: TruckIcon }
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {new Date(label).toLocaleString()}
          </p>
          {payload.map((item, index) => (
            <p key={index} className="text-sm" style={{ color: item.color }}>
              {`${item.name}: ${item.value}${item.unit || ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const ThroughputChart = () => (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.throughput}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="trainsPerHour"
            stackId="1"
            stroke="#3b82f6"
            fill="#93c5fd"
            name="Trains per Hour"
          />
          <Area
            type="monotone"
            dataKey="passengersPerHour"
            stackId="2"
            stroke="#10b981"
            fill="#86efac"
            name="Passengers per Hour"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const DelaysChart = () => (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.delays}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="avgDelay"
            stroke="#f59e0b"
            strokeWidth={2}
            name="Average Delay (min)"
          />
          <Line
            type="monotone"
            dataKey="maxDelay"
            stroke="#ef4444"
            strokeWidth={2}
            name="Maximum Delay (min)"
          />
          <Line
            type="monotone"
            dataKey="onTimePercentage"
            stroke="#10b981"
            strokeWidth={2}
            name="On-Time Percentage (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const EfficiencyChart = () => (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.efficiency}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <YAxis domain={[0, 100]} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="systemEfficiency" fill="#3b82f6" name="System Efficiency (%)" />
          <Bar dataKey="capacityUtilization" fill="#10b981" name="Capacity Utilization (%)" />
          <Bar dataKey="energyEfficiency" fill="#8b5cf6" name="Energy Efficiency (%)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const TrainTypesChart = () => (
    <div className="h-80 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data.trainTypes}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="count"
          >
            {data.trainTypes.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  const renderChart = () => {
    switch (activeChart) {
      case 'throughput':
        return <ThroughputChart />;
      case 'delays':
        return <DelaysChart />;
      case 'efficiency':
        return <EfficiencyChart />;
      case 'types':
        return <TrainTypesChart />;
      default:
        return <ThroughputChart />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Performance Analytics</h3>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1"
          >
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Chart Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {chartTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id)}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                activeChart === tab.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Chart Content */}
      <div className="mb-4">
        {renderChart()}
      </div>

      {/* Chart Description */}
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-md">
        {activeChart === 'throughput' && (
          <p>
            System throughput showing trains and passengers processed per hour. 
            Higher values indicate better system capacity utilization.
          </p>
        )}
        {activeChart === 'delays' && (
          <p>
            Train delay analysis showing average and maximum delays over time. 
            Lower values and higher on-time percentages indicate better performance.
          </p>
        )}
        {activeChart === 'efficiency' && (
          <p>
            Overall system efficiency metrics including system performance, 
            capacity utilization, and energy efficiency percentages.
          </p>
        )}
        {activeChart === 'types' && (
          <p>
            Distribution of train types in the system showing the proportion of 
            express, freight, suburban, and special trains.
          </p>
        )}
      </div>

      {/* Key Performance Indicators */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-md">
          <p className="text-sm font-medium text-blue-900">Peak Throughput</p>
          <p className="text-2xl font-bold text-blue-700">
            {Math.max(...(data.throughput?.map(d => d.trainsPerHour) || [0]))} trains/hr
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-md">
          <p className="text-sm font-medium text-green-900">Best On-Time Rate</p>
          <p className="text-2xl font-bold text-green-700">
            {Math.max(...(data.delays?.map(d => d.onTimePercentage) || [0]))}%
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-md">
          <p className="text-sm font-medium text-yellow-900">Avg Efficiency</p>
          <p className="text-2xl font-bold text-yellow-700">
            {(data.efficiency?.reduce((sum, d) => sum + d.systemEfficiency, 0) / (data.efficiency?.length || 1) || 0).toFixed(1)}%
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-md">
          <p className="text-sm font-medium text-purple-900">Total Trains</p>
          <p className="text-2xl font-bold text-purple-700">
            {data.trainTypes?.reduce((sum, type) => sum + type.count, 0) || 0}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceCharts;