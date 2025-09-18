import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SectionUtilizationChart = ({ sections }) => {
  // Transform sections data for chart
  const chartData = sections.map(section => ({
    name: section.section_code,
    utilization: ((section.current_occupancy / section.max_occupancy) * 100).toFixed(1),
    occupancy: section.current_occupancy,
    capacity: section.max_occupancy,
    isActive: section.is_active,
    inMaintenance: section.maintenance_mode
  })).slice(0, 10); // Show only first 10 sections

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-gray-600">
            Utilization: <span className="font-medium">{data.utilization}%</span>
          </p>
          <p className="text-sm text-gray-600">
            Occupancy: <span className="font-medium">{data.occupancy}/{data.capacity}</span>
          </p>
          {data.inMaintenance && (
            <p className="text-sm text-orange-600 font-medium">Under Maintenance</p>
          )}
          {!data.isActive && (
            <p className="text-sm text-red-600 font-medium">Inactive</p>
          )}
        </div>
      );
    }
    return null;
  };

  const getBarColor = (entry) => {
    if (!entry.isActive) return '#ef4444'; // red for inactive
    if (entry.inMaintenance) return '#f59e0b'; // yellow for maintenance
    if (entry.utilization > 80) return '#ef4444'; // red for high utilization
    if (entry.utilization > 60) return '#f59e0b'; // yellow for medium utilization
    return '#10b981'; // green for normal utilization
  };

  if (!chartData.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <svg className="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No section data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            fontSize={12}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={[0, 100]}
            fontSize={12}
            tick={{ fontSize: 12 }}
            label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="utilization" 
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SectionUtilizationChart;