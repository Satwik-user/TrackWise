import React, { useState, useEffect } from 'react';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard');
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Active Trains',
      value: dashboardData?.train_analytics?.active_trains || 0,
      total: dashboardData?.train_analytics?.total_trains || 0,
      icon: '🚂',
      color: 'bg-blue-500',
    },
    {
      name: 'Available Sections',
      value: dashboardData?.section_analytics?.available_sections || 0,
      total: dashboardData?.section_analytics?.total_sections || 0,
      icon: '🛤️',
      color: 'bg-green-500',
    },
    {
      name: 'Avg Delay',
      value: `${dashboardData?.performance_metrics?.average_delay_minutes || 0}m`,
      total: 'target: <5m',
      icon: '⏰',
      color: 'bg-yellow-500',
    },
    {
      name: 'System Efficiency',
      value: `${Math.round((dashboardData?.performance_metrics?.overall_efficiency || 0) * 100)}%`,
      total: 'target: 85%',
      icon: '📈',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Railway System Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${stat.color} rounded-md p-3`}>
                    <span className="text-white text-2xl">{stat.icon}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                      {stat.total && (
                        <span className="text-sm text-gray-500 ml-2">/ {stat.total}</span>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">System Status</h3>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500">
            <p className="text-lg">🚂 TrackWise Railway System is operational</p>
            <p className="mt-2 text-sm">Real-time monitoring active</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;