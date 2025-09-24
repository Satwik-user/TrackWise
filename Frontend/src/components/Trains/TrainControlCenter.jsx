import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TruckIcon,
  MapIcon,
  CogIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ForwardIcon,
  BackwardIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BoltIcon,
  SignalIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { apiService } from '../../services/apiService';

const TrainControlCenter = () => {
  const [trains, setTrains] = useState([]);
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [sections, setSections] = useState([]);
  const [realTimeData, setRealTimeData] = useState({});
  const [controlMode, setControlMode] = useState('automatic'); // automatic, manual, emergency
  const [filters, setFilters] = useState({
    status: 'all',
    section: 'all',
    type: 'all'
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch trains data
  const fetchTrains = async () => {
    try {
      const trainsData = await apiService.trains.getAll();
      setTrains(trainsData || []);
    } catch (error) {
      console.error('Failed to fetch trains:', error);
    }
  };

  // Fetch sections data
  const fetchSections = async () => {
    try {
      const sectionsData = await apiService.sections.getAll();
      setSections(sectionsData || []);
    } catch (error) {
      console.error('Failed to fetch sections:', error);
    }
  };

  // Fetch real-time data
  const fetchRealTimeData = async () => {
    try {
      const data = await apiService.trains.getRealTimeData();
      setRealTimeData(data || {});
    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
    }
  };

  // Control train operations
  const controlTrain = async (trainId, action, params = {}) => {
    setIsLoading(true);
    try {
      const result = await apiService.trains.control(trainId, action, params);
      toast.success(result.message || `Train ${action} command sent`);
      await fetchTrains();
      await fetchRealTimeData();
    } catch (error) {
      toast.error(`Failed to ${action} train: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Update train speed
  const updateTrainSpeed = async (trainId, speed) => {
    await controlTrain(trainId, 'set_speed', { speed });
  };

  // Emergency stop all trains
  const emergencyStopAll = async () => {
    setIsLoading(true);
    try {
      const result = await apiService.trains.emergencyStopAll();
      toast.success('Emergency stop activated for all trains');
      setControlMode('emergency');
      await fetchTrains();
    } catch (error) {
      toast.error(`Emergency stop failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Resume normal operations
  const resumeOperations = async () => {
    setIsLoading(true);
    try {
      const result = await apiService.trains.resumeOperations();
      toast.success('Normal operations resumed');
      setControlMode('automatic');
      await fetchTrains();
    } catch (error) {
      toast.error(`Failed to resume operations: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh data
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchTrains(),
        fetchSections(),
        fetchRealTimeData()
      ]);
    };

    fetchData();

    const interval = setInterval(() => {
      fetchRealTimeData();
      fetchTrains();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Filter trains
  const filteredTrains = trains.filter(train => {
    if (filters.status !== 'all' && train.status !== filters.status) return false;
    if (filters.section !== 'all' && train.current_section !== filters.section) return false;
    if (filters.type !== 'all' && train.type !== filters.type) return false;
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'green';
      case 'stopped': return 'red';
      case 'maintenance': return 'yellow';
      case 'delayed': return 'orange';
      case 'emergency': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return PlayIcon;
      case 'stopped': return StopIcon;
      case 'maintenance': return CogIcon;
      case 'delayed': return ClockIcon;
      case 'emergency': return ExclamationTriangleIcon;
      default: return TruckIcon;
    }
  };

  const getSpeedColor = (speed, maxSpeed) => {
    const ratio = speed / maxSpeed;
    if (ratio > 0.8) return 'red';
    if (ratio > 0.6) return 'yellow';
    return 'green';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TruckIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Train Control Center</h1>
              <p className="text-sm text-gray-500">Real-time train monitoring and control</p>
            </div>
          </div>
          
          {/* Control Mode & Emergency Controls */}
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
              controlMode === 'automatic' ? 'bg-green-100' : 
              controlMode === 'emergency' ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              <div className={`w-3 h-3 rounded-full ${
                controlMode === 'automatic' ? 'bg-green-500' : 
                controlMode === 'emergency' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <span className={`font-medium ${
                controlMode === 'automatic' ? 'text-green-800' : 
                controlMode === 'emergency' ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {controlMode.charAt(0).toUpperCase() + controlMode.slice(1)} Mode
              </span>
            </div>

            {controlMode !== 'emergency' && (
              <button
                onClick={emergencyStopAll}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <ExclamationTriangleIcon className="h-5 w-5" />
                <span>Emergency Stop</span>
              </button>
            )}

            {controlMode === 'emergency' && (
              <button
                onClick={resumeOperations}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircleIcon className="h-5 w-5" />
                <span>Resume Operations</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters & Overview */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="running">Running</option>
                  <option value="stopped">Stopped</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="delayed">Delayed</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select
                  value={filters.section}
                  onChange={(e) => setFilters(prev => ({ ...prev, section: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Sections</option>
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="passenger">Passenger</option>
                  <option value="freight">Freight</option>
                  <option value="express">Express</option>
                  <option value="local">Local</option>
                </select>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Quick Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Trains:</span>
                  <span className="font-medium">{trains.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Running:</span>
                  <span className="font-medium text-green-600">
                    {trains.filter(t => t.status === 'running').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stopped:</span>
                  <span className="font-medium text-red-600">
                    {trains.filter(t => t.status === 'stopped').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delayed:</span>
                  <span className="font-medium text-yellow-600">
                    {trains.filter(t => t.status === 'delayed').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Train List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Trains ({filteredTrains.length})
            </h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredTrains.map((train, index) => {
                const StatusIcon = getStatusIcon(train.status);
                const statusColor = getStatusColor(train.status);
                const realTime = realTimeData[train.id] || {};
                
                return (
                  <motion.div
                    key={train.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-lg border-l-4 border-${statusColor}-500 bg-${statusColor}-50 cursor-pointer hover:bg-${statusColor}-100 transition-colors ${
                      selectedTrain?.id === train.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedTrain(train)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <StatusIcon className={`h-5 w-5 text-${statusColor}-600`} />
                        <div>
                          <h3 className={`font-medium text-${statusColor}-900`}>
                            {train.name || `Train ${train.id}`}
                          </h3>
                          <p className={`text-sm text-${statusColor}-700`}>
                            {train.type || 'Unknown'} • Section: {train.current_section || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-sm font-medium text-${statusColor}-800`}>
                          {realTime.speed || train.current_speed || 0} km/h
                        </p>
                        <p className="text-xs text-gray-500">
                          Max: {train.max_speed || 120} km/h
                        </p>
                      </div>
                    </div>

                    {/* Progress bar for speed */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Speed</span>
                        <span>{((realTime.speed || train.current_speed || 0) / (train.max_speed || 120) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <motion.div
                          className={`h-1 rounded-full bg-${getSpeedColor(
                            realTime.speed || train.current_speed || 0,
                            train.max_speed || 120
                          )}-500`}
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${((realTime.speed || train.current_speed || 0) / (train.max_speed || 120) * 100)}%`
                          }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>

                    {/* Real-time info */}
                    {realTime.last_update && (
                      <p className="text-xs text-gray-500 mt-2">
                        Last update: {new Date(realTime.last_update).toLocaleTimeString()}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Train Control Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Train Control</h2>
            
            {selectedTrain ? (
              <div className="space-y-4">
                {/* Train Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900">
                    {selectedTrain.name || `Train ${selectedTrain.id}`}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedTrain.type} • {selectedTrain.status}
                  </p>
                </div>

                {/* Speed Control */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Speed Control
                  </label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max={selectedTrain.max_speed || 120}
                      value={realTimeData[selectedTrain.id]?.speed || selectedTrain.current_speed || 0}
                      onChange={(e) => updateTrainSpeed(selectedTrain.id, parseInt(e.target.value))}
                      disabled={controlMode === 'emergency' || isLoading}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0</span>
                      <span>{realTimeData[selectedTrain.id]?.speed || selectedTrain.current_speed || 0} km/h</span>
                      <span>{selectedTrain.max_speed || 120}</span>
                    </div>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Quick Actions</h4>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => controlTrain(selectedTrain.id, 'start')}
                      disabled={isLoading || controlMode === 'emergency' || selectedTrain.status === 'running'}
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      <PlayIcon className="h-4 w-4" />
                      <span>Start</span>
                    </button>

                    <button
                      onClick={() => controlTrain(selectedTrain.id, 'stop')}
                      disabled={isLoading || selectedTrain.status === 'stopped'}
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      <StopIcon className="h-4 w-4" />
                      <span>Stop</span>
                    </button>

                    <button
                      onClick={() => controlTrain(selectedTrain.id, 'pause')}
                      disabled={isLoading || controlMode === 'emergency' || selectedTrain.status !== 'running'}
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
                    >
                      <PauseIcon className="h-4 w-4" />
                      <span>Pause</span>
                    </button>

                    <button
                      onClick={() => controlTrain(selectedTrain.id, 'maintenance')}
                      disabled={isLoading}
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50"
                    >
                      <CogIcon className="h-4 w-4" />
                      <span>Maint.</span>
                    </button>
                  </div>
                </div>

                {/* Real-time Metrics */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Real-time Data</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Position:</span>
                      <span className="font-medium">
                        {realTimeData[selectedTrain.id]?.position || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Stop:</span>
                      <span className="font-medium">
                        {selectedTrain.next_station || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ETA:</span>
                      <span className="font-medium">
                        {selectedTrain.eta || 'Calculating...'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Passengers:</span>
                      <span className="font-medium">
                        {realTimeData[selectedTrain.id]?.passenger_count || selectedTrain.passenger_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <TruckIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p>Select a train to control</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainControlCenter;