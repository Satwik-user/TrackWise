import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const TrainStatusChart = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Transform data for chart
  const chartData = Object.entries(data || {}).map(([status, count]) => ({
    name: status.charAt(0) + status.slice(1).toLowerCase(),
    value: count,
    status: status
  }));

  const COLORS = {
    RUNNING: '#10b981', // green
    SCHEDULED: '#3b82f6', // blue
    DELAYED: '#ef4444', // red
    STOPPED: '#f59e0b', // yellow
    COMPLETED: '#6b7280' // gray
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium">{data.payload.name}</p>
          <p className="text-sm text-gray-600">
            Count: <span className="font-medium">{data.value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (!chartData.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <svg className="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No train data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.status] || '#8884d8'}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry) => (
              <span style={{ color: entry.color }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrainStatusChart;