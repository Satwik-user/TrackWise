import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import { apiService } from '../services/apiService';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('last_24_hours');
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // State for analytics data
  const [kpisData, setKpisData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [metricsData, setMetricsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching analytics data...');
      
      // Fetch data from working endpoints
      const [kpis, dashboard, metrics] = await Promise.all([
        apiService.analytics.getKPIs(timeRange),
        apiService.analytics.getDashboard(),
        apiService.analytics.getMetrics('performance', timeRange)
      ]);
      
      console.log('Analytics data fetched successfully:', { kpis, dashboard, metrics });
      
      setKpisData(kpis);
      setDashboardData(dashboard);
      setMetricsData(metrics);
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
      setError(err.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and refresh
  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, refreshKey]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleManualRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleExport = async (format) => {
    try {
      const reportData = await apiService.analytics.exportData('performance', format);
      
      // Create and download file
      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_report_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Helper function to render KPI cards
  const renderKPICard = (title, value, target, unit = '', trend = null) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toFixed(1) : value}{unit}
          </p>
          {target !== undefined && (
            <p className="text-xs text-gray-500">Target: {target}{unit}</p>
          )}
        </div>
        {trend && (
          <div className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '↗' : '↙'} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <ChartBarIcon className="h-7 w-7 mr-2 text-blue-600" />
              Analytics Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Comprehensive performance analytics and insights
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-4">
            {/* Time Range Selector */}
            <div className="flex items-center space-x-2">
              <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="last_hour">Last Hour</option>
                <option value="last_24_hours">Last 24 Hours</option>
                <option value="last_week">Last Week</option>
                <option value="last_month">Last Month</option>
              </select>
            </div>

            {/* Auto-refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                autoRefresh
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span>{autoRefresh ? 'Auto' : 'Manual'}</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Export */}
            <button
              onClick={() => handleExport('json')}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`} />
              <span className="text-gray-600">
                Data Status: {error ? 'Error' : 'Healthy'}
              </span>
            </div>
            
            <div className="text-gray-500">
              Last Updated: {new Date().toLocaleTimeString()}
            </div>
            
            <div className="text-gray-500">
              Time Range: {timeRange.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Data Loading Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading analytics data...</span>
            </div>
          )}

          {/* Data Display */}
          {!loading && !error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* KPIs Section */}
              {kpisData && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {kpisData.operational_kpis && Object.entries(kpisData.operational_kpis).map(([key, kpi]) => (
                      <div key={key}>
                        {renderKPICard(
                          key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                          kpi.value,
                          kpi.target,
                          kpi.unit || ''
                        )}
                      </div>
                    ))}
                    
                    {kpisData.efficiency_kpis && Object.entries(kpisData.efficiency_kpis).map(([key, kpi]) => (
                      <div key={key}>
                        {renderKPICard(
                          key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                          kpi.value,
                          kpi.target,
                          kpi.unit || ''
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dashboard Overview */}
              {dashboardData && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {dashboardData.train_analytics && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-sm font-medium text-gray-600 mb-2">Train Analytics</h3>
                        <p className="text-2xl font-bold text-gray-900">
                          {dashboardData.train_analytics.total_trains}
                        </p>
                        <p className="text-xs text-gray-500">
                          Active: {dashboardData.train_analytics.active_trains}
                        </p>
                      </div>
                    )}
                    
                    {dashboardData.section_analytics && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-sm font-medium text-gray-600 mb-2">Section Analytics</h3>
                        <p className="text-2xl font-bold text-gray-900">
                          {dashboardData.section_analytics.total_sections}
                        </p>
                        <p className="text-xs text-gray-500">
                          Available: {dashboardData.section_analytics.available_sections}
                        </p>
                      </div>
                    )}
                    
                    {dashboardData.performance_metrics && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-sm font-medium text-gray-600 mb-2">Performance</h3>
                        <p className="text-2xl font-bold text-gray-900">
                          {(dashboardData.performance_metrics.overall_efficiency * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">Overall Efficiency</p>
                      </div>
                    )}
                    
                    {dashboardData.system_health && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-sm font-medium text-gray-600 mb-2">System Health</h3>
                        <p className="text-2xl font-bold text-green-600">
                          {dashboardData.system_health.status || 'OK'}
                        </p>
                        <p className="text-xs text-gray-500">All Systems Operational</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Performance Metrics */}
              {metricsData && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h2>
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <pre className="text-sm text-gray-700 overflow-x-auto">
                      {JSON.stringify(metricsData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;