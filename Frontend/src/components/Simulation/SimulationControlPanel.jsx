import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  CogIcon,
  ChartBarIcon,
  ClockIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { apiService } from '../../services/apiService';

const SimulationControlPanel = () => {
  const [simulationStatus, setSimulationStatus] = useState({
    status: 'not_running',
    message: 'No simulation is currently running',
    progress_percentage: 0,
    active_trains: 0,
    active_sections: 0,
    current_time: null,
    start_time: null,
    end_time: null
  });

  const [simulationConfig, setSimulationConfig] = useState({
    name: 'Railway Simulation',
    duration_hours: 24,
    speed: 'real_time',
    scenario_config: {
      traffic_density: 'normal',
      weather_conditions: 'clear',
      include_disruptions: false,
      optimization_enabled: true
    }
  });

  const [metrics, setMetrics] = useState({
    average_delay: 0,
    throughput: 0,
    efficiency_score: 0,
    total_trains: 0,
    active_trains: 0
  });

  const [trainPositions, setTrainPositions] = useState({
    timestamp: null,
    positions: {},
    total_trains: 0
  });

  const [isLoading, setIsLoading] = useState(false);

  // Speed options for simulation
  const speedOptions = [
    { value: 'real_time', label: 'Real Time (1x)', icon: ClockIcon },
    { value: 'fast_2x', label: 'Fast (2x)', icon: ChartBarIcon },
    { value: 'fast_5x', label: 'Very Fast (5x)', icon: ChartBarIcon },
    { value: 'fast_10x', label: 'Ultra Fast (10x)', icon: ChartBarIcon },
    { value: 'instant', label: 'Instant', icon: ChartBarIcon }
  ];

  // Fetch simulation status
  const fetchSimulationStatus = async () => {
    try {
      const status = await apiService.simulation.getStatus();
      setSimulationStatus(status);
    } catch (error) {
      console.error('Failed to fetch simulation status:', error);
    }
  };

  // Fetch simulation metrics
  const fetchSimulationMetrics = async () => {
    try {
      const metricsData = await apiService.simulation.getMetrics();
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to fetch simulation metrics:', error);
    }
  };

  // Fetch train positions
  const fetchTrainPositions = async () => {
    try {
      const positions = await apiService.simulation.getTrainPositions();
      setTrainPositions(positions);
    } catch (error) {
      console.error('Failed to fetch train positions:', error);
    }
  };

  // Start simulation
  const handleStartSimulation = async () => {
    setIsLoading(true);
    try {
      const result = await apiService.simulation.start(simulationConfig);
      toast.success(result.message || 'Simulation started successfully');
      await fetchSimulationStatus();
    } catch (error) {
      toast.error(`Failed to start simulation: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Pause simulation
  const handlePauseSimulation = async () => {
    setIsLoading(true);
    try {
      const result = await apiService.simulation.pause();
      toast.success(result.message || 'Simulation paused');
      await fetchSimulationStatus();
    } catch (error) {
      toast.error(`Failed to pause simulation: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Resume simulation
  const handleResumeSimulation = async () => {
    setIsLoading(true);
    try {
      const result = await apiService.simulation.resume();
      toast.success(result.message || 'Simulation resumed');
      await fetchSimulationStatus();
    } catch (error) {
      toast.error(`Failed to resume simulation: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Stop simulation
  const handleStopSimulation = async () => {
    setIsLoading(true);
    try {
      const result = await apiService.simulation.stop();
      toast.success(result.message || 'Simulation stopped');
      await fetchSimulationStatus();
    } catch (error) {
      toast.error(`Failed to stop simulation: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Update simulation configuration
  const updateConfig = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setSimulationConfig(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setSimulationConfig(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Auto-refresh data when simulation is running
  useEffect(() => {
    const interval = setInterval(() => {
      if (simulationStatus.status === 'running') {
        fetchSimulationStatus();
        fetchSimulationMetrics();
        fetchTrainPositions();
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [simulationStatus.status]);

  // Initial data fetch
  useEffect(() => {
    fetchSimulationStatus();
    fetchSimulationMetrics();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'green';
      case 'paused': return 'yellow';
      case 'completed': return 'blue';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return PlayIcon;
      case 'paused': return PauseIcon;
      case 'completed': return CheckCircleIcon;
      case 'failed': return ExclamationTriangleIcon;
      default: return StopIcon;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BeakerIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Simulation Control Center</h1>
              <p className="text-sm text-gray-500">Real-time railway simulation management</p>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full bg-${getStatusColor(simulationStatus.status)}-100`}>
            {React.createElement(getStatusIcon(simulationStatus.status), {
              className: `h-5 w-5 text-${getStatusColor(simulationStatus.status)}-600`
            })}
            <span className={`font-medium text-${getStatusColor(simulationStatus.status)}-800 capitalize`}>
              {simulationStatus.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Control Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Simulation Controls</h2>
            
            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              {simulationStatus.status === 'not_running' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartSimulation}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  <PlayIcon className="h-5 w-5" />
                  <span>{isLoading ? 'Starting...' : 'Start Simulation'}</span>
                </motion.button>
              )}

              {simulationStatus.status === 'running' && (
                <div className="space-y-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePauseSimulation}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 bg-yellow-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-yellow-700 disabled:opacity-50"
                  >
                    <PauseIcon className="h-5 w-5" />
                    <span>{isLoading ? 'Pausing...' : 'Pause Simulation'}</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStopSimulation}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    <StopIcon className="h-5 w-5" />
                    <span>{isLoading ? 'Stopping...' : 'Stop Simulation'}</span>
                  </motion.button>
                </div>
              )}

              {simulationStatus.status === 'paused' && (
                <div className="space-y-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleResumeSimulation}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    <PlayIcon className="h-5 w-5" />
                    <span>{isLoading ? 'Resuming...' : 'Resume Simulation'}</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStopSimulation}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    <StopIcon className="h-5 w-5" />
                    <span>{isLoading ? 'Stopping...' : 'Stop Simulation'}</span>
                  </motion.button>
                </div>
              )}
            </div>

            {/* Configuration */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Configuration</h3>
              
              {/* Simulation Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={simulationConfig.name}
                  onChange={(e) => updateConfig('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={simulationStatus.status === 'running'}
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={simulationConfig.duration_hours}
                  onChange={(e) => updateConfig('duration_hours', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={simulationStatus.status === 'running'}
                />
              </div>

              {/* Speed */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Speed</label>
                <select
                  value={simulationConfig.speed}
                  onChange={(e) => updateConfig('speed', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={simulationStatus.status === 'running'}
                >
                  {speedOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Traffic Density */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Traffic Density</label>
                <select
                  value={simulationConfig.scenario_config.traffic_density}
                  onChange={(e) => updateConfig('scenario_config.traffic_density', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={simulationStatus.status === 'running'}
                >
                  <option value="light">Light</option>
                  <option value="normal">Normal</option>
                  <option value="heavy">Heavy</option>
                  <option value="peak">Peak</option>
                </select>
              </div>

              {/* Weather Conditions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weather</label>
                <select
                  value={simulationConfig.scenario_config.weather_conditions}
                  onChange={(e) => updateConfig('scenario_config.weather_conditions', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={simulationStatus.status === 'running'}
                >
                  <option value="clear">Clear</option>
                  <option value="rain">Rain</option>
                  <option value="snow">Snow</option>
                  <option value="fog">Fog</option>
                  <option value="storm">Storm</option>
                </select>
              </div>

              {/* Include Disruptions */}
              <div className="flex items-center">
                <input
                  id="include_disruptions"
                  type="checkbox"
                  checked={simulationConfig.scenario_config.include_disruptions}
                  onChange={(e) => updateConfig('scenario_config.include_disruptions', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={simulationStatus.status === 'running'}
                />
                <label htmlFor="include_disruptions" className="ml-2 block text-sm text-gray-700">
                  Include Random Disruptions
                </label>
              </div>

              {/* Optimization Enabled */}
              <div className="flex items-center">
                <input
                  id="optimization_enabled"
                  type="checkbox"
                  checked={simulationConfig.scenario_config.optimization_enabled}
                  onChange={(e) => updateConfig('scenario_config.optimization_enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={simulationStatus.status === 'running'}
                />
                <label htmlFor="optimization_enabled" className="ml-2 block text-sm text-gray-700">
                  Enable Optimization
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Status and Metrics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress and Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Simulation Status</h2>
            
            {simulationStatus.status !== 'not_running' && (
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{simulationStatus.progress_percentage || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      className="bg-blue-600 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${simulationStatus.progress_percentage || 0}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Time Information */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Start Time:</span>
                    <p className="font-medium">{simulationStatus.start_time ? new Date(simulationStatus.start_time).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Current Time:</span>
                    <p className="font-medium">{simulationStatus.current_time ? new Date(simulationStatus.current_time).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-gray-600 mt-4">{simulationStatus.message}</p>
          </div>

          {/* Metrics Dashboard */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Real-time Metrics</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{metrics.active_trains}</div>
                <div className="text-sm text-gray-600">Active Trains</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{(metrics.efficiency_score || 0).toFixed(1)}</div>
                <div className="text-sm text-gray-600">Efficiency Score</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{(metrics.average_delay || 0).toFixed(1)}m</div>
                <div className="text-sm text-gray-600">Avg Delay</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{(metrics.throughput || 0).toFixed(1)}</div>
                <div className="text-sm text-gray-600">Throughput</div>
              </div>
            </div>
          </div>

          {/* Train Positions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Train Positions</h2>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total Trains: {trainPositions.total_trains}</span>
                <span>Last Updated: {trainPositions.timestamp ? new Date(trainPositions.timestamp).toLocaleTimeString() : 'N/A'}</span>
              </div>
              
              {Object.keys(trainPositions.positions).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {Object.entries(trainPositions.positions).map(([trainId, position]) => (
                    <div key={trainId} className="p-2 bg-gray-50 rounded text-sm">
                      <div className="font-medium">{trainId}</div>
                      <div className="text-gray-600">Position: {JSON.stringify(position)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No train position data available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationControlPanel;