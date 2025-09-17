import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  MapIcon,
  TrainIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

import { useAppStore } from '../store/appStore';
import { useWebSocket } from '../context/WebSocketContext';
import { apiService } from '../services/apiService';
import TrainPositionMap from '../components/RealTimeView/TrainPositionMap';
import SectionStatusPanel from '../components/RealTimeView/SectionStatusPanel';
import TrainListPanel from '../components/RealTimeView/TrainListPanel';
import AlertsPanel from '../components/RealTimeView/AlertsPanel';
import RealTimeMetrics from '../components/RealTimeView/RealTimeMetrics';

const RealTimeView = () => {
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [viewMode, setViewMode] = useState('map'); // 'map', 'list', 'both'
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    priority: ''
  });
  const [showAlerts, setShowAlerts] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  const intervalRef = useRef(null);

  const {
    trains,
    sections,
    alerts,
    metrics,
    getActiveAlerts,
    getTrainsByStatus,
    getSectionUtilization
  } = useAppStore();

  const { isConnected, subscribe, unsubscribe } = useWebSocket();

  // Auto-refresh functionality
  useEffect(() => {
    if (isAutoRefresh && isConnected) {
      // Subscribe to real-time updates
      subscribe('train_positions');
      subscribe('system_metrics');
      subscribe('alerts');

      // Set up interval for manual refresh as backup
      intervalRef.current = setInterval(() => {
        refreshData();
      }, refreshInterval);
    } else {
      // Unsubscribe and clear interval
      unsubscribe('train_positions');
      unsubscribe('system_metrics');
      unsubscribe('alerts');
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoRefresh, isConnected, refreshInterval, subscribe, unsubscribe]);

  const refreshData = async () => {
    try {
      // Fetch latest train positions
      await apiService.trains.getLivePositions();
      
      // Fetch current metrics
      await apiService.optimization.getCurrentMetrics();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  const handleTrainSelect = (train) => {
    setSelectedTrain(train);
    setSelectedSection(null);
  };

  const handleSectionSelect = (section) => {
    setSelectedSection(section);
    setSelectedTrain(null);
  };

  const handleManualRefresh = () => {
    refreshData();
  };

  const toggleAutoRefresh = () => {
    setIsAutoRefresh(!isAutoRefresh);
  };

  // Filter trains based on search and filters
  const filteredTrains = trains.filter(train => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!train.train_number.toLowerCase().includes(query) &&
          !train.train_name.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Status filter
    if (filters.status && train.status !== filters.status) {
      return false;
    }

    // Type filter
    if (filters.type && train.train_type !== filters.type) {
      return false;
    }

    // Priority filter
    if (filters.priority && train.priority.toString() !== filters.priority) {
      return false;
    }

    return true;
  });

  const activeAlerts = getActiveAlerts();
  const trainsByStatus = getTrainsByStatus();
  const sectionUtilization = getSectionUtilization();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <MapIcon className="h-7 w-7 mr-2 text-blue-600" />
              Real-time View
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Live monitoring of train positions and system status
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>

            {/* Auto-refresh toggle */}
            <button
              onClick={toggleAutoRefresh}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isAutoRefresh
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isAutoRefresh ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
              <span>{isAutoRefresh ? 'Pause' : 'Resume'}</span>
            </button>

            {/* Manual refresh */}
            <button
              onClick={handleManualRefresh}
              className="flex items-center space-x-2 btn-secondary"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span>Refresh</span>
            </button>

            {/* View mode selector */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Map
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('both')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'both' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Both
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-4 flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search trains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center space-x-2">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="text-sm border border-gray-300 rounded-md px-3 py-1"
            >
              <option value="">All Status</option>
              <option value="RUNNING">Running</option>
              <option value="DELAYED">Delayed</option>
              <option value="STOPPED">Stopped</option>
              <option value="SCHEDULED">Scheduled</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="text-sm border border-gray-300 rounded-md px-3 py-1"
            >
              <option value="">All Types</option>
              <option value="EXPRESS">Express</option>
              <option value="FREIGHT">Freight</option>
              <option value="SUBURBAN">Suburban</option>
              <option value="SPECIAL">Special</option>
            </select>

            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors ${
                showAlerts
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <ExclamationTriangleIcon className="h-4 w-4" />
              <span>Alerts ({activeAlerts.length})</span>
            </button>
          </div>
        </div>

        {/* Real-time Metrics */}
        <RealTimeMetrics 
          trainsByStatus={trainsByStatus}
          sectionUtilization={sectionUtilization}
          activeAlerts={activeAlerts.length}
          isConnected={isConnected}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Alerts Panel */}
        <AnimatePresence>
          {showAlerts && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="w-80 bg-white border-r border-gray-200 overflow-hidden"
            >
              <AlertsPanel 
                alerts={activeAlerts}
                onClose={() => setShowAlerts(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main View Area */}
        <div className="flex-1 flex">
          {/* Map View */}
          {(viewMode === 'map' || viewMode === 'both') && (
            <div className={`${viewMode === 'both' ? 'flex-1' : 'w-full'} relative`}>
              <TrainPositionMap
                trains={filteredTrains}
                sections={sections}
                selectedTrain={selectedTrain}
                selectedSection={selectedSection}
                onTrainSelect={handleTrainSelect}
                onSectionSelect={handleSectionSelect}
                isAutoRefresh={isAutoRefresh}
              />
            </div>
          )}

          {/* List View */}
          {(viewMode === 'list' || viewMode === 'both') && (
            <div className={`${viewMode === 'both' ? 'w-96' : 'w-full'} bg-white border-l border-gray-200 overflow-hidden`}>
              <TrainListPanel
                trains={filteredTrains}
                selectedTrain={selectedTrain}
                onTrainSelect={handleTrainSelect}
                searchQuery={searchQuery}
                filters={filters}
              />
            </div>
          )}
        </div>

        {/* Section Status Panel */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-hidden">
          <SectionStatusPanel
            sections={sections}
            selectedSection={selectedSection}
            onSectionSelect={handleSectionSelect}
            trains={trains}
          />
        </div>
      </div>

      {/* Footer Info Bar */}
      <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-6">
            <span>Trains: {filteredTrains.length}/{trains.length}</span>
            <span>Sections: {sections.length}</span>
            <span>Active Alerts: {activeAlerts.length}</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span>Auto-refresh: {isAutoRefresh ? 'ON' : 'OFF'}</span>
            <span>
              Last update: {new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeView;