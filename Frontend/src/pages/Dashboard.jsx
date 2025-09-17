import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { 
  TrainIcon, 
  MapIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

import { apiService } from '../services/apiService';
import { useAppStore } from '../store/appStore';
import { useWebSocket } from '../context/WebSocketContext';

// Components
import MetricCard from '../components/Dashboard/MetricCard';
import TrainStatusChart from '../components/Dashboard/TrainStatusChart';
import SectionUtilizationChart from '../components/Dashboard/SectionUtilizationChart';
import RecentOptimizations from '../components/Dashboard/RecentOptimizations';
import ActiveAlerts from '../components/Dashboard/ActiveAlerts';
import QuickActions from '../components/Dashboard/QuickActions';
import RealTimeUpdates from '../components/Dashboard/RealTimeUpdates';

const Dashboard = () => {
  const { 
    trains, 
    sections, 
    alerts, 
    metrics,
    getTrainsByStatus,
    getSectionUtilization,
    getActiveAlerts 
  } = useAppStore();
  
  const { isConnected } = useWebSocket();
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch performance overview
  const { data: performanceData, isLoading: performanceLoading } = useQuery(
    ['performance-overview', refreshKey],
    () => apiService.analytics.getPerformanceOverview(24),
    {
      refetchInterval: 30000, // 30 seconds
      onError: (error) => {
        console.error('Failed to fetch performance data:', error);
      }
    }
  );

  // Fetch current metrics
  const { data: currentMetrics, isLoading: metricsLoading } = useQuery(
    ['current-metrics', refreshKey],
    () => apiService.optimization.getCurrentMetrics(),
    {
      refetchInterval: 15000, // 15 seconds
    }
  );

  // Fetch recent optimizations
  const { data: recentOptimizations } = useQuery(
    ['recent-optimizations'],
    () => apiService.optimization.getRuns({ limit: 5 }),
    {
      refetchInterval: 60000, // 1 minute
    }
  );

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate derived metrics
  const trainsByStatus = getTrainsByStatus();
  const sectionUtilization = getSectionUtilization();
  const activeAlerts = getActiveAlerts();

  const totalTrains = trains.length;
  const totalSections = sections.length;
  const avgDelay = performanceData?.train_metrics?.average_delay_minutes || 0;
  const onTimePercentage = performanceData?.train_metrics?.on_time_percentage || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time overview of railway traffic optimization system
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <ConnectionIndicator isConnected={isConnected} />
          <RefreshButton onClick={() => setRefreshKey(prev => prev + 1)} />
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Trains"
          value={totalTrains}
          icon={TrainIcon}
          trend={performanceData ? { value: 5, isPositive: true } : null}
          subtitle="Active in system"
          color="blue"
        />
        
        <MetricCard
          title="Sections"
          value={totalSections}
          icon={MapIcon}
          subtitle={`${Math.round(sectionUtilization)}% utilized`}
          color="green"
        />
        
        <MetricCard
          title="Avg Delay"
          value={`${avgDelay.toFixed(1)}m`}
          icon={ClockIcon}
          trend={avgDelay > 0 ? { value: avgDelay, isPositive: false } : null}
          subtitle="Current average"
          color="orange"
        />
        
        <MetricCard
          title="On-Time"
          value={`${onTimePercentage.toFixed(1)}%`}
          icon={ChartBarIcon}
          trend={{ value: onTimePercentage, isPositive: onTimePercentage > 80 }}
          subtitle="Performance rate"
          color="purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts and Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Train Status Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="card"
          >
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Train Status Distribution</h3>
              <p className="text-sm text-gray-500">Current status of all trains in the system</p>
            </div>
            <TrainStatusChart data={trainsByStatus} loading={performanceLoading} />
          </motion.div>

          {/* Section Utilization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="card"
          >
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Section Utilization</h3>
              <p className="text-sm text-gray-500">Capacity usage across railway sections</p>
            </div>
            <SectionUtilizationChart sections={sections} />
          </motion.div>

          {/* Recent Optimizations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="card"
          >
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Recent Optimizations</h3>
              <p className="text-sm text-gray-500">Latest optimization runs and results</p>
            </div>
            <RecentOptimizations data={recentOptimizations} />
          </motion.div>
        </div>

        {/* Right Column - Sidebar Content */}
        <div className="space-y-6">
          {/* Active Alerts */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ActiveAlerts alerts={activeAlerts} />
          </motion.div>

          {/* Real-time Updates */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <RealTimeUpdates />
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <QuickActions />
          </motion.div>

          {/* System Performance Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="card"
          >
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">System Performance</h3>
            </div>
            <SystemPerformanceSummary 
              metrics={currentMetrics}
              loading={metricsLoading}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Connection Indicator Component
const ConnectionIndicator = ({ isConnected }) => {
  return (
    <div className="flex items-center text-sm">
      <div 
        className={`w-2 h-2 rounded-full mr-2 ${
          isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'
        }`}
      />
      <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
};

// Refresh Button Component
const RefreshButton = ({ onClick }) => {
  const [isRotating, setIsRotating] = useState(false);

  const handleClick = () => {
    setIsRotating(true);
    onClick();
    setTimeout(() => setIsRotating(false), 1000);
  };

  return (
    <button
      onClick={handleClick}
      className="btn-secondary flex items-center space-x-2"
      disabled={isRotating}
    >
      <svg
        className={`w-4 h-4 ${isRotating ? 'animate-spin' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <span>Refresh</span>
    </button>
  );
};

// System Performance Summary Component
const SystemPerformanceSummary = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-4 text-gray-500">
        <CpuChipIcon className="h-8 w-8 mx-auto mb-2" />
        <p>No metrics data available</p>
      </div>
    );
  }

  const performanceItems = [
    {
      label: 'Average Delay',
      value: `${metrics.avg_delay?.toFixed(1) || 0}m`,
      status: (metrics.avg_delay || 0) < 5 ? 'good' : (metrics.avg_delay || 0) < 10 ? 'warning' : 'critical'
    },
    {
      label: 'Throughput',
      value: `${metrics.total_throughput?.toFixed(1) || 0}/h`,
      status: 'good'
    },
    {
      label: 'Capacity Utilization',
      value: `${((metrics.capacity_utilization || 0) * 100).toFixed(0)}%`,
      status: (metrics.capacity_utilization || 0) < 0.8 ? 'good' : 'warning'
    },
    {
      label: 'Safety Score',
      value: `${((metrics.safety_score || 0) * 100).toFixed(0)}%`,
      status: (metrics.safety_score || 0) > 0.95 ? 'good' : 'warning'
    }
  ];

  return (
    <div className="space-y-3">
      {performanceItems.map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{item.label}</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">{item.value}</span>
            <div 
              className={`w-2 h-2 rounded-full ${
                item.status === 'good' ? 'bg-green-500' :
                item.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;