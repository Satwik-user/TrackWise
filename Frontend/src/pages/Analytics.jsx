import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  ClockIcon,
  TrendingUpIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  AdjustmentsHorizontalIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

import { apiService } from '../services/apiService';
import { useAppStore } from '../store/appStore';

// Components
import PerformanceOverviewPanel from '../components/Analytics/PerformanceOverviewPanel';
import DelayAnalysisPanel from '../components/Analytics/DelayAnalysisPanel';
import ThroughputTrendsPanel from '../components/Analytics/ThroughputTrendsPanel';
import OptimizationEffectivenessPanel from '../components/Analytics/OptimizationEffectivenessPanel';
import SectionUtilizationPanel from '../components/Analytics/SectionUtilizationPanel';
import AnalyticsFilters from '../components/Analytics/AnalyticsFilters';
import ExportPanel from '../components/Analytics/ExportPanel';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState(24); // hours
  const [filters, setFilters] = useState({
    trainType: '',
    sectionIds: [],
    priority: '',
    dateRange: null
  });
  const [activePanel, setActivePanel] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { updateMetrics } = useAppStore();

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Fetch performance overview
  const { 
    data: performanceData, 
    isLoading: performanceLoading,
    error: performanceError 
  } = useQuery(
    ['analytics-performance', timeRange, filters.sectionIds, refreshKey],
    () => apiService.analytics.getPerformanceOverview(
      timeRange, 
      filters.sectionIds.length > 0 ? filters.sectionIds : undefined
    ),
    {
      onSuccess: (data) => {
        updateMetrics(data);
      },
      onError: (error) => {
        console.error('Failed to fetch performance data:', error);
      }
    }
  );

  // Fetch delay analysis
  const { 
    data: delayData, 
    isLoading: delayLoading 
  } = useQuery(
    ['analytics-delays', timeRange, filters.trainType, filters.priority, refreshKey],
    () => apiService.analytics.getDelayAnalysis(
      timeRange,
      filters.trainType || undefined,
      filters.priority || undefined
    ),
    {
      enabled: activePanel === 'delays' || activePanel === 'overview'
    }
  );

  // Fetch throughput trends
  const { 
    data: throughputData, 
    isLoading: throughputLoading 
  } = useQuery(
    ['analytics-throughput', timeRange, filters.sectionIds, refreshKey],
    () => apiService.analytics.getThroughputTrends(
      timeRange,
      filters.sectionIds.length > 0 ? filters.sectionIds : undefined,
      timeRange > 48 ? 'day' : 'hour'
    ),
    {
      enabled: activePanel === 'throughput' || activePanel === 'overview'
    }
  );

  // Fetch optimization effectiveness
  const { 
    data: optimizationData, 
    isLoading: optimizationLoading 
  } = useQuery(
    ['analytics-optimization', timeRange, refreshKey],
    () => apiService.analytics.getOptimizationEffectiveness(timeRange),
    {
      enabled: activePanel === 'optimization' || activePanel === 'overview'
    }
  );

  // Fetch section utilization
  const { 
    data: sectionData, 
    isLoading: sectionLoading 
  } = useQuery(
    ['analytics-sections', timeRange, refreshKey],
    () => apiService.analytics.getSectionUtilization(timeRange, false),
    {
      enabled: activePanel === 'sections' || activePanel === 'overview'
    }
  );

  const panels = [
    {
      id: 'overview',
      label: 'Overview',
      icon: ChartBarIcon,
      description: 'System performance overview'
    },
    {
      id: 'delays',
      label: 'Delay Analysis',
      icon: ClockIcon,
      description: 'Detailed delay analysis'
    },
    {
      id: 'throughput',
      label: 'Throughput',
      icon: TrendingUpIcon,
      description: 'Traffic throughput trends'
    },
    {
      id: 'optimization',
      label: 'Optimization',
      icon: AdjustmentsHorizontalIcon,
      description: 'Optimization effectiveness'
    },
    {
      id: 'sections',
      label: 'Sections',
      icon: FunnelIcon,
      description: 'Section utilization analysis'
    }
  ];

  const handleManualRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleExport = async (format) => {
    try {
      const reportData = await apiService.analytics.exportPerformanceReport(timeRange, format);
      
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

  const getLoadingState = () => {
    return performanceLoading || delayLoading || throughputLoading || 
           optimizationLoading || sectionLoading;
  };

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
                onChange={(e) => setTimeRange(parseInt(e.target.value))}
                className="input-field text-sm"
              >
                <option value={1}>Last Hour</option>
                <option value={6}>Last 6 Hours</option>
                <option value={24}>Last 24 Hours</option>
                <option value={72}>Last 3 Days</option>
                <option value={168}>Last Week</option>
                <option value={720}>Last Month</option>
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
              disabled={getLoadingState()}
              className="btn-secondary flex items-center space-x-2"
            >
              <ArrowPathIcon className={`h-4 w-4 ${getLoadingState() ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Export */}
            <ExportPanel onExport={handleExport} />
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${performanceError ? 'bg-red-500' : 'bg-green-500'}`} />
              <span className="text-gray-600">
                Data Status: {performanceError ? 'Error' : 'Healthy'}
              </span>
            </div>
            
            <div className="text-gray-500">
              Last Updated: {new Date().toLocaleTimeString()}
            </div>
            
            <div className="text-gray-500">
              Time Range: {timeRange}h
            </div>
          </div>

          {/* Panel Navigation */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            {panels.map((panel) => {
              const Icon = panel.icon;
              return (
                <button
                  key={panel.id}
                  onClick={() => setActivePanel(panel.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activePanel === panel.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title={panel.description}
                >
                  <div className="flex items-center space-x-1">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{panel.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4">
          <AnalyticsFilters
            filters={filters}
            onFiltersChange={setFilters}
            timeRange={timeRange}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          {/* Error State */}
          {performanceError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Data Loading Error</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Failed to load analytics data. Please try refreshing or check your connection.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Panel Content */}
          <AnimatePresence mode="wait">
            {activePanel === 'overview' && (
              <OverviewPanel
                key="overview"
                performanceData={performanceData}
                delayData={delayData}
                throughputData={throughputData}
                optimizationData={optimizationData}
                sectionData={sectionData}
                isLoading={getLoadingState()}
                timeRange={timeRange}
              />
            )}

            {activePanel === 'delays' && (
              <motion.div
                key="delays"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <DelayAnalysisPanel
                  data={delayData}
                  isLoading={delayLoading}
                  timeRange={timeRange}
                  filters={filters}
                />
              </motion.div>
            )}

            {activePanel === 'throughput' && (
              <motion.div
                key="throughput"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ThroughputTrendsPanel
                  data={throughputData}
                  isLoading={throughputLoading}
                  timeRange={timeRange}
                  filters={filters}
                />
              </motion.div>
            )}

            {activePanel === 'optimization' && (
              <motion.div
                key="optimization"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <OptimizationEffectivenessPanel
                  data={optimizationData}
                  isLoading={optimizationLoading}
                  timeRange={timeRange}
                />
              </motion.div>
            )}

            {activePanel === 'sections' && (
              <motion.div
                key="sections"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <SectionUtilizationPanel
                  data={sectionData}
                  isLoading={sectionLoading}
                  timeRange={timeRange}
                  filters={filters}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// Overview Panel Component
const OverviewPanel = ({
  performanceData,
  delayData,
  throughputData,
  optimizationData,
  sectionData,
  isLoading,
  timeRange
}) => {
  if (isLoading) {
    return <AnalyticsLoadingSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Key Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryMetricCard
          title="Total Trains"
          value={performanceData?.train_metrics?.total_trains || 0}
          change={5}
          icon={ChartBarIcon}
          color="blue"
        />
        
        <SummaryMetricCard
          title="Average Delay"
          value={`${performanceData?.train_metrics?.average_delay_minutes?.toFixed(1) || 0}m`}
          change={-12}
          icon={ClockIcon}
          color="orange"
        />
        
        <SummaryMetricCard
          title="On-Time Rate"
          value={`${performanceData?.train_metrics?.on_time_percentage?.toFixed(1) || 0}%`}
          change={8}
          icon={CheckCircleIcon}
          color="green"
        />
        
        <SummaryMetricCard
          title="System Utilization"
          value={`${performanceData?.capacity_metrics?.utilization_percentage?.toFixed(1) || 0}%`}
          change={-3}
          icon={TrendingUpIcon}
          color="purple"
        />
      </div>

      {/* Overview Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceOverviewPanel
          data={performanceData}
          isLoading={false}
          timeRange={timeRange}
        />
        
        <DelayAnalysisPanel
          data={delayData}
          isLoading={false}
          timeRange={timeRange}
          compact={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ThroughputTrendsPanel
          data={throughputData}
          isLoading={false}
          timeRange={timeRange}
          compact={true}
        />
        
        <OptimizationEffectivenessPanel
          data={optimizationData}
          isLoading={false}
          timeRange={timeRange}
          compact={true}
        />
      </div>
    </motion.div>
  );
};

// Summary Metric Card Component
const SummaryMetricCard = ({ title, value, change, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    orange: 'text-orange-600 bg-orange-100',
    purple: 'text-purple-600 bg-purple-100',
    red: 'text-red-600 bg-red-100'
  };

  const isPositive = change > 0;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${changeColor}`}>
              <TrendingUpIcon 
                className={`h-4 w-4 mr-1 ${!isPositive ? 'transform rotate-180' : ''}`} 
              />
              <span>{Math.abs(change)}%</span>
              <span className="text-gray-500 ml-1">vs last period</span>
            </div>
          )}
        </div>
        
        <div className={`p-3 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

// Analytics Loading Skeleton
const AnalyticsLoadingSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Metrics skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Analytics;