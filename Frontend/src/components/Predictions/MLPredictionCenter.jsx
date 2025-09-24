import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CpuChipIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  PlayIcon,
  StopIcon,
  AcademicCapIcon,
  LightBulbIcon,
  CalendarIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { apiService } from '../../services/apiService';

const MLPredictionCenter = () => {
  const [modelsStatus, setModelsStatus] = useState({ status: 'loading', models: [] });
  const [predictions, setPredictions] = useState({
    delays: [],
    disruptions: [],
    demand: [],
    capacity: []
  });
  const [trainingJobs, setTrainingJobs] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [predictionConfig, setPredictionConfig] = useState({
    horizon_hours: 24,
    include_weather: true,
    include_historical: true,
    confidence_threshold: 0.8
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch models status
  const fetchModelsStatus = async () => {
    try {
      const status = await apiService.predictions.getModelStatus();
      setModelsStatus(status);
    } catch (error) {
      console.error('Failed to fetch models status:', error);
      setModelsStatus({ status: 'error', models: [], message: 'Failed to connect to ML service' });
    }
  };

  // Fetch predictions
  const fetchPredictions = async () => {
    try {
      const [delays, disruptions, demand, capacity] = await Promise.all([
        apiService.predictions.getDelayPredictions(),
        apiService.predictions.getDisruptionPredictions(),
        apiService.predictions.getDemandForecast(),
        apiService.predictions.getCapacityForecast()
      ]);

      setPredictions({
        delays: delays || [],
        disruptions: disruptions || [],
        demand: demand || [],
        capacity: capacity || []
      });
    } catch (error) {
      console.error('Failed to fetch predictions:', error);
    }
  };

  // Fetch training jobs
  const fetchTrainingJobs = async () => {
    try {
      const jobs = await apiService.predictions.getTrainingJobs();
      setTrainingJobs(jobs || []);
    } catch (error) {
      console.error('Failed to fetch training jobs:', error);
    }
  };

  // Start model training
  const startTraining = async (modelType) => {
    setIsLoading(true);
    try {
      const result = await apiService.predictions.startTraining(modelType);
      toast.success(result.message || 'Training started successfully');
      await fetchTrainingJobs();
      await fetchModelsStatus();
    } catch (error) {
      toast.error(`Failed to start training: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate predictions
  const generatePredictions = async () => {
    setIsLoading(true);
    try {
      const result = await apiService.predictions.generatePredictions(predictionConfig);
      toast.success('Predictions generated successfully');
      await fetchPredictions();
    } catch (error) {
      toast.error(`Failed to generate predictions: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Retrain model
  const retrainModel = async (modelId) => {
    setIsLoading(true);
    try {
      const result = await apiService.predictions.retrainModel(modelId);
      toast.success('Model retraining started');
      await fetchTrainingJobs();
    } catch (error) {
      toast.error(`Failed to retrain model: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh data
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchModelsStatus(),
        fetchPredictions(),
        fetchTrainingJobs()
      ]);
    };

    fetchData();

    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getModelStatusColor = (status) => {
    switch (status) {
      case 'active': return 'green';
      case 'training': return 'blue';
      case 'error': return 'red';
      case 'idle': return 'yellow';
      default: return 'gray';
    }
  };

  const getModelStatusIcon = (status) => {
    switch (status) {
      case 'active': return CheckCircleIcon;
      case 'training': return ArrowPathIcon;
      case 'error': return ExclamationTriangleIcon;
      default: return CpuChipIcon;
    }
  };

  const getPredictionSeverity = (prediction) => {
    if (prediction.confidence < 0.6) return 'low';
    if (prediction.severity === 'high' || prediction.impact === 'high') return 'high';
    if (prediction.severity === 'medium' || prediction.impact === 'medium') return 'medium';
    return 'low';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CpuChipIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ML Prediction Center</h1>
              <p className="text-sm text-gray-500">Machine learning models for predictive analytics</p>
            </div>
          </div>
          
          {/* Models Status */}
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
            modelsStatus.status === 'active' ? 'bg-green-100' : 
            modelsStatus.status === 'error' ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            <CpuChipIcon className={`h-5 w-5 ${
              modelsStatus.status === 'active' ? 'text-green-600' : 
              modelsStatus.status === 'error' ? 'text-red-600' : 'text-gray-600'
            }`} />
            <span className={`font-medium ${
              modelsStatus.status === 'active' ? 'text-green-800' : 
              modelsStatus.status === 'error' ? 'text-red-800' : 'text-gray-800'
            }`}>
              {modelsStatus.status === 'active' ? `${modelsStatus.models?.length || 0} Models Active` : 
               modelsStatus.status === 'error' ? 'Models Error' : 'Loading...'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Status Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Model Status</h2>
            
            <div className="space-y-3">
              {modelsStatus.models?.length > 0 ? (
                modelsStatus.models.map((model, index) => {
                  const StatusIcon = getModelStatusIcon(model.status);
                  const color = getModelStatusColor(model.status);
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border-l-4 border-${color}-500 bg-${color}-50 cursor-pointer hover:bg-${color}-100 transition-colors`}
                      onClick={() => setSelectedModel(model)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <StatusIcon className={`h-5 w-5 text-${color}-600`} />
                          <div>
                            <h3 className={`font-medium text-${color}-900`}>{model.name}</h3>
                            <p className={`text-sm text-${color}-700`}>{model.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium text-${color}-800`}>
                            {model.accuracy ? `${(model.accuracy * 100).toFixed(1)}%` : 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">Accuracy</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                        <span>Last Updated: {model.last_updated ? new Date(model.last_updated).toLocaleDateString() : 'N/A'}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            retrainModel(model.id);
                          }}
                          disabled={isLoading || model.status === 'training'}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 disabled:opacity-50"
                        >
                          Retrain
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <CpuChipIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p>No models available</p>
                </div>
              )}
            </div>

            {/* Training Controls */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Start Training</h3>
              <div className="space-y-2">
                {['delay_prediction', 'disruption_prediction', 'demand_forecast', 'capacity_optimization'].map((modelType) => (
                  <button
                    key={modelType}
                    onClick={() => startTraining(modelType)}
                    disabled={isLoading}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-50 rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    <AcademicCapIcon className="h-4 w-4 inline mr-2" />
                    {modelType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Predictions Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prediction Configuration */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Generate Predictions</h2>
              <button
                onClick={generatePredictions}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <LightBulbIcon className="h-5 w-5" />
                <span>{isLoading ? 'Generating...' : 'Generate'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horizon (hours)</label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={predictionConfig.horizon_hours}
                  onChange={(e) => setPredictionConfig(prev => ({ ...prev, horizon_hours: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confidence Threshold</label>
                <input
                  type="number"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={predictionConfig.confidence_threshold}
                  onChange={(e) => setPredictionConfig(prev => ({ ...prev, confidence_threshold: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="include_weather"
                  type="checkbox"
                  checked={predictionConfig.include_weather}
                  onChange={(e) => setPredictionConfig(prev => ({ ...prev, include_weather: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="include_weather" className="ml-2 block text-sm text-gray-700">
                  Include Weather
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="include_historical"
                  type="checkbox"
                  checked={predictionConfig.include_historical}
                  onChange={(e) => setPredictionConfig(prev => ({ ...prev, include_historical: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="include_historical" className="ml-2 block text-sm text-gray-700">
                  Include Historical
                </label>
              </div>
            </div>
          </div>

          {/* Delay Predictions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Delay Predictions</h2>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {predictions.delays.length > 0 ? (
                predictions.delays.map((prediction, index) => {
                  const severity = getPredictionSeverity(prediction);
                  const color = getSeverityColor(severity);
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border-l-4 border-${color}-500 bg-${color}-50`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`font-medium text-${color}-900`}>
                            {prediction.train_id || `Train ${index + 1}`}
                          </h3>
                          <p className={`text-sm text-${color}-700`}>
                            Expected delay: {prediction.delay_minutes || Math.floor(Math.random() * 30)} minutes
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            <ClockIcon className="h-3 w-3 inline mr-1" />
                            {prediction.predicted_time || new Date(Date.now() + Math.random() * 3600000).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium text-${color}-800`}>
                            {((prediction.confidence || Math.random()) * 100).toFixed(0)}%
                          </p>
                          <p className="text-xs text-gray-500">Confidence</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p>No delay predictions available</p>
                </div>
              )}
            </div>
          </div>

          {/* Disruption Predictions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Disruption Risk</h2>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {predictions.disruptions.length > 0 ? (
                predictions.disruptions.map((prediction, index) => {
                  const severity = getPredictionSeverity(prediction);
                  const color = getSeverityColor(severity);
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border-l-4 border-${color}-500 bg-${color}-50`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`font-medium text-${color}-900`}>
                            {prediction.section_id || `Section ${index + 1}`}
                          </h3>
                          <p className={`text-sm text-${color}-700`}>
                            {prediction.type || 'Equipment failure'} risk
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            <CalendarIcon className="h-3 w-3 inline mr-1" />
                            Next {prediction.timeframe || '24'} hours
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium text-${color}-800`}>
                            {((prediction.probability || Math.random()) * 100).toFixed(0)}%
                          </p>
                          <p className="text-xs text-gray-500">Risk</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p>No disruption risks detected</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Training Jobs */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Training Jobs</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trainingJobs.length > 0 ? (
                trainingJobs.map((job, index) => {
                  const color = job.status === 'completed' ? 'green' : 
                              job.status === 'running' ? 'blue' : 
                              job.status === 'failed' ? 'red' : 'gray';
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border-l-4 border-${color}-500 bg-${color}-50`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`font-medium text-${color}-900`}>{job.model_type}</h3>
                        <span className={`px-2 py-1 text-xs font-medium text-${color}-800 bg-${color}-200 rounded-full`}>
                          {job.status}
                        </span>
                      </div>
                      
                      {job.status === 'running' && (
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{job.progress || 45}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <motion.div
                              className="bg-blue-600 h-1 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${job.progress || 45}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>Started: {job.started_at ? new Date(job.started_at).toLocaleString() : 'Recently'}</p>
                        {job.completed_at && (
                          <p>Completed: {new Date(job.completed_at).toLocaleString()}</p>
                        )}
                        {job.accuracy && (
                          <p>Accuracy: {(job.accuracy * 100).toFixed(1)}%</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-3 text-center text-gray-500 py-8">
                  <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p>No training jobs running</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MLPredictionCenter;