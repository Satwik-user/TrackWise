import React, { useState, useEffect } from 'react';
import {
  CpuChipIcon,
  ServerIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowArrowTrendingUpIcon,
  ArrowArrowTrendingDownIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const SystemMetrics = ({ timeRange = '1h', refreshInterval = 5000 }) => {
  const [metrics, setMetrics] = useState({
    cpu: { current: 0, history: [] },
    memory: { current: 0, history: [] },
    database: { connections: 0, responseTime: 0, history: [] },
    optimization: { activeSessions: 0, avgSolvingTime: 0, history: [] },
    api: { requestsPerMinute: 0, responseTime: 0, history: [] },
    websocket: { connections: 0, messagesPerSecond: 0 }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(`/api/v1/metrics/system?timeRange=${timeRange}`);
        if (!response.ok) throw new Error('Failed to fetch system metrics');
        
        const data = await response.json();
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [timeRange, refreshInterval]);

  const getStatusColor = (value, thresholds) => {
    if (value >= thresholds.critical) return 'text-red-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusBg = (value, thresholds) => {
    if (value >= thresholds.critical) return 'bg-red-50 border-red-200';
    if (value >= thresholds.warning) return 'bg-yellow-50 border-yellow-200';
    return 'bg-green-50 border-green-200';
  };

  const MetricCard = ({ title, value, unit, icon: Icon, history, thresholds, subtitle }) => {
    const statusColor = getStatusColor(value, thresholds);
    const statusBg = getStatusBg(value, thresholds);

    return (
      <div className={`p-6 rounded-lg border ${statusBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Icon className={`h-8 w-8 ${statusColor}`} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <div className="flex items-baseline">
                <p className={`text-2xl font-semibold ${statusColor}`}>
                  {typeof value === 'number' ? value.toFixed(1) : value}
                </p>
                <p className="ml-2 text-sm text-gray-500">{unit}</p>
              </div>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        {history && history.length > 0 && (
          <div className="mt-4 h-16">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={value >= thresholds.critical ? "#dc2626" : value >= thresholds.warning ? "#d97706" : "#059669"}
                  fill={value >= thresholds.critical ? "#fecaca" : value >= thresholds.warning ? "#fed7aa" : "#a7f3d0"}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-32"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading system metrics</h3>
            <p className="text-sm text-red-700 mt-1">{typeof error === 'string' ? error : JSON.stringify(error)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">System Performance</h2>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1"
          >
            <option value="15m">Last 15 minutes</option>
            <option value="1h">Last hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
          </select>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="CPU Usage"
          value={metrics.cpu.current}
          unit="%"
          icon={CpuChipIcon}
          history={metrics.cpu.history}
          thresholds={{ warning: 70, critical: 90 }}
        />

        <MetricCard
          title="Memory Usage"
          value={metrics.memory.current}
          unit="%"
          icon={ServerIcon}
          history={metrics.memory.history}
          thresholds={{ warning: 80, critical: 95 }}
        />

        <MetricCard
          title="Database Response"
          value={metrics.database.responseTime}
          unit="ms"
          icon={ServerIcon}
          history={metrics.database.history}
          thresholds={{ warning: 100, critical: 500 }}
          subtitle={`${metrics.database.connections} connections`}
        />

        <MetricCard
          title="API Response Time"
          value={metrics.api.responseTime}
          unit="ms"
          icon={ChartBarIcon}
          history={metrics.api.history}
          thresholds={{ warning: 200, critical: 1000 }}
          subtitle={`${metrics.api.requestsPerMinute} req/min`}
        />

        <MetricCard
          title="Optimization Engine"
          value={metrics.optimization.avgSolvingTime}
          unit="s"
          icon={CpuChipIcon}
          history={metrics.optimization.history}
          thresholds={{ warning: 30, critical: 60 }}
          subtitle={`${metrics.optimization.activeSessions} active sessions`}
        />

        <MetricCard
          title="WebSocket Connections"
          value={metrics.websocket.connections}
          unit=""
          icon={ServerIcon}
          thresholds={{ warning: 800, critical: 950 }}
          subtitle={`${metrics.websocket.messagesPerSecond} msg/s`}
        />
      </div>

      {/* Detailed Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU and Memory Chart */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Resource Usage</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.cpu.history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value, name) => [`${value.toFixed(1)}%`, name]}
                />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="CPU Usage"
                />
                <Line 
                  type="monotone" 
                  dataKey="memory" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Memory Usage"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Response Times Chart */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Response Times</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.api.history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value, name) => [`${value}ms`, name]}
                />
                <Line 
                  type="monotone" 
                  dataKey="api" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="API Response Time"
                />
                <Line 
                  type="monotone" 
                  dataKey="database" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Database Response Time"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* System Health Indicators */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Health Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { name: 'Database', status: 'healthy', uptime: '99.9%' },
            { name: 'Redis Cache', status: 'healthy', uptime: '99.8%' },
            { name: 'Optimization Engine', status: 'warning', uptime: '98.5%' },
            { name: 'WebSocket Service', status: 'healthy', uptime: '99.7%' }
          ].map((service) => (
            <div key={service.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div>
                <p className="text-sm font-medium text-gray-900">{service.name}</p>
                <p className="text-xs text-gray-500">Uptime: {service.uptime}</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                service.status === 'healthy' ? 'bg-green-500' :
                service.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemMetrics;