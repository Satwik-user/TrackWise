import React, { useState, useEffect } from 'react';
import { 
  TruckIcon, 
  MapIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowArrowTrendingUpIcon,
  ArrowArrowTrendingDownIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import MetricCard from './MetricCard';
import QuickActions from './QuickActions';
import RecentOptimizations from './RecentOptimizations';
import ActiveAlerts from './ActiveAlerts';
import RealTimeUpdates from './RealTimeUpdates';
import TrainStatusChart from './TrainStatusChart';
import SectionUtilizationChart from './SectionUtililizationChart';
import PerformanceCharts from './PerformanceCharts';
import LoadingSpinner from '../Common/LoadingSpinner';
import { useWebSocket } from '../../context/WebSocketContext';

const DashboardOverview = () => {
  const [metrics, setMetrics] = useState({
    totalTrains: 0,
    activeTrains: 0,
    delayedTrains: 0,
    totalSections: 0,
    occupiedSections: 0,
    maintenanceSections: 0,
    systemEfficiency: 0,
    avgDelay: 0,
    throughput: 0,
    punctualityRate: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const { wsData, isConnected } = useWebSocket();

  // Fetch initial dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/v1/analytics/dashboard');
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        
        const data = await response.json();
        setMetrics(data.metrics);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update metrics from WebSocket data
  useEffect(() => {
    if (wsData && wsData.type === 'metrics_update') {
      setMetrics(prev => ({
        ...prev,
        ...wsData.data
      }));
      setLastUpdated(new Date());
    }
  }, [wsData]);

  const getMetricChange = (current, previous) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="large" message="Loading dashboard..." centered />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading dashboard
              </h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Railway traffic optimization system overview
          </p>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          <span>•</span>
          <span>Updated {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Trains"
          value={metrics.totalTrains}
          change={getMetricChange(metrics.totalTrains, metrics.previousTotalTrains)}
          icon={TruckIcon}
          color="blue"
          subtitle={`${metrics.activeTrains} active`}
        />
        
        <MetricCard
          title="Delayed Trains"
          value={metrics.delayedTrains}
          change={getMetricChange(metrics.delayedTrains, metrics.previousDelayedTrains)}
          icon={ClockIcon}
          color="yellow"
          subtitle={`${metrics.avgDelay}min avg delay`}
        />
        
        <MetricCard
          title="Section Utilization"
          value={`${Math.round((metrics.occupiedSections / metrics.totalSections) * 100)}%`}
          change={getMetricChange(metrics.occupiedSections, metrics.previousOccupiedSections)}
          icon={MapIcon}
          color="green"
          subtitle={`${metrics.occupiedSections}/${metrics.totalSections} occupied`}
        />
        
        <MetricCard
          title="System Efficiency"
          value={`${Math.round(metrics.systemEfficiency)}%`}
          change={getMetricChange(metrics.systemEfficiency, metrics.previousSystemEfficiency)}
          icon={ChartBarIcon}
          color="purple"
          subtitle={`${Math.round(metrics.punctualityRate)}% punctuality`}
        />
      </div>

      {/* Real-time Updates and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RealTimeUpdates />
        <ActiveAlerts />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrainStatusChart />
        <SectionUtilizationChart />
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentOptimizations />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Performance Charts */}
      <PerformanceCharts />
    </div>
  );
};

export default DashboardOverview;