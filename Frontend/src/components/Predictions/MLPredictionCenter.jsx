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
  const [modelsStatus, setModelsStatus] = useState({});
  const [predictions, setPredictions] = useState({
    delays: [],
    disruptions: [],
    demand: [],
    capacity: []
  });
  const [systemWideData, setSystemWideData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPredictions, setIsGeneratingPredictions] = useState(false);
  const [isTraining, setIsTraining] = useState(false);

  // Fetch models status
  const fetchModelsStatus = async () => {
    try {
      console.log('🔍 Fetching ML models status...');
      const status = await apiService.predictions.getModelStatus();
      setModelsStatus(status || {});
      console.log('✅ Models status:', status);
    } catch (error) {
      console.error('❌ Failed to fetch models status:', error);
      setModelsStatus({
        models_loaded: false,
        delay_predictor_trained: false,
        disruption_detector_available: false,
        last_updated: null,
        error: error.message
      });
      toast.error('Failed to fetch ML models status');
    }
  };

  // Generate system-wide predictions
  const generateSystemWidePredictions = async () => {
    try {
      setIsGeneratingPredictions(true);
      console.log('🔍 Generating system-wide predictions...');
      
      const assessment = await apiService.predictions.getSystemWideRiskAssessment();
      setSystemWideData(assessment);
      
      // Extract delay predictions
      const delayPredictions = assessment.predictions.map((p, index) => ({
        id: `delay_${p.train_id}_${p.section_id}`,
        train_id: p.train_id,
        section_id: p.section_id,
        predicted_delay: p.delay_prediction.delay_minutes,
        confidence: Math.round((1 - (p.delay_prediction.uncertainty || 0.3)) * 100),
        timestamp: assessment.timestamp,
        factors: p.delay_prediction.factors
      }));

      // Extract disruption predictions
      const disruptionPredictions = assessment.predictions.map((p, index) => ({
        id: `disruption_${p.train_id}_${p.section_id}`,
        train_id: p.train_id,
        section_id: p.section_id,
        probability: Math.round(p.disruption_prediction.disruption_probability * 100),
        risk_level: p.disruption_prediction.risk_level,
        factors: p.disruption_prediction.factors || [],
        recommended_actions: p.disruption_prediction.recommended_actions || [],
        timestamp: assessment.timestamp
      }));

      setPredictions(prev => ({
        ...prev,
        delays: delayPredictions,
        disruptions: disruptionPredictions
      }));
      
      console.log('✅ Generated predictions:', { delayPredictions, disruptionPredictions });
      toast.success(`Generated ${delayPredictions.length} delay and ${disruptionPredictions.length} disruption predictions`);
      
    } catch (error) {
      console.error('❌ Failed to generate system-wide predictions:', error);
      toast.error('Failed to generate system-wide predictions');
    } finally {
      setIsGeneratingPredictions(false);
    }
  };

  // Fetch demand and capacity forecasts
  const fetchForecasts = async () => {
    try {
      console.log('🔍 Fetching forecasts...');
      const [demand, capacity] = await Promise.all([
        apiService.predictions.getDemandForecast(),
        apiService.predictions.getCapacityForecast()
      ]);

      setPredictions(prev => ({
        ...prev,
        demand: demand || [],
        capacity: capacity || []
      }));
      console.log('✅ Forecasts loaded');
    } catch (error) {
      console.error('❌ Failed to fetch forecasts:', error);
    }
  };

  // Train models
  const trainModels = async () => {
    try {
      setIsTraining(true);
      console.log('🔍 Starting model training...');
      
      const result = await apiService.predictions.trainModels();
      console.log('✅ Training result:', result);
      
      toast.success('Model training completed successfully!');
      
      // Refresh models status after training
      await fetchModelsStatus();
      
    } catch (error) {
      console.error('❌ Model training failed:', error);
      toast.error('Model training failed');
    } finally {
      setIsTraining(false);
    }
  };

  // Load all data
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchModelsStatus(),
        generateSystemWidePredictions(),
        fetchForecasts()
      ]);
    } catch (error) {
      console.error('Failed to load ML Prediction Center data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(() => {
      loadAllData();
    }, 120000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    if (status === true) return 'text-green-500';
    if (status === false) return 'text-red-500';
    return 'text-yellow-500';
  };

  const getStatusIcon = (status) => {
    if (status === true) return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    if (status === false) return <StopIcon className="w-5 h-5 text-red-500" />;
    return <ClockIcon className="w-5 h-5 text-yellow-500" />;
  };

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'text-green-500 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-500 bg-red-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Loading ML Prediction Center...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <CpuChipIcon className="w-8 h-8 mr-3 text-blue-500" />
            ML Prediction Center
          </h1>
          <p className="text-gray-600 mt-1">Machine Learning powered railway predictions and analytics</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={generateSystemWidePredictions}
            disabled={isGeneratingPredictions}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {isGeneratingPredictions ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <LightBulbIcon className="w-4 h-4 mr-2" />
                Generate Predictions
              </>
            )}
          </button>
          
          <button
            onClick={trainModels}
            disabled={isTraining}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {isTraining ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Training...
              </>
            ) : (
              <>
                <AcademicCapIcon className="w-4 h-4 mr-2" />
                Train Models
              </>
            )}
          </button>
          
          <button
            onClick={loadAllData}
            className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Models Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CpuChipIcon className="w-5 h-5 mr-2 text-blue-500" />
          ML Models Status
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Models Loaded</p>
              <p className={`text-xs ${getStatusColor(modelsStatus.models_loaded)}`}>
                {modelsStatus.models_loaded ? 'Active' : 'Inactive'}
              </p>
            </div>
            {getStatusIcon(modelsStatus.models_loaded)}
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Delay Predictor</p>
              <p className={`text-xs ${getStatusColor(modelsStatus.delay_predictor_trained)}`}>
                {modelsStatus.delay_predictor_trained ? 'Trained' : 'Not Trained'}
              </p>
            </div>
            {getStatusIcon(modelsStatus.delay_predictor_trained)}
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Disruption Detector</p>
              <p className={`text-xs ${getStatusColor(modelsStatus.disruption_detector_available)}`}>
                {modelsStatus.disruption_detector_available ? 'Available' : 'Unavailable'}
              </p>
            </div>
            {getStatusIcon(modelsStatus.disruption_detector_available)}
          </div>
        </div>
        
        {modelsStatus.last_updated && (
          <p className="text-xs text-gray-500 mt-3">
            Last updated: {new Date(modelsStatus.last_updated).toLocaleString()}
          </p>
        )}
      </motion.div>

      {/* Predictions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Delay Predictions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ClockIcon className="w-5 h-5 mr-2 text-orange-500" />
            Delay Predictions
            <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded-full">
              {predictions.delays.length}
            </span>
          </h3>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {predictions.delays.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No delay predictions available. Click "Generate Predictions" to create new predictions.
              </p>
            ) : (
              predictions.delays.map((delay) => (
                <div key={delay.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Train {delay.train_id} - Section {delay.section_id}
                    </p>
                    <p className="text-xs text-gray-600">
                      Predicted delay: {delay.predicted_delay.toFixed(1)} minutes
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-orange-600">
                      {delay.confidence}% confidence
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(delay.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Disruption Predictions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-red-500" />
            Disruption Risk
            <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">
              {predictions.disruptions.length}
            </span>
          </h3>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {predictions.disruptions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No disruption predictions available. Click "Generate Predictions" to create new predictions.
              </p>
            ) : (
              predictions.disruptions.map((disruption) => (
                <div key={disruption.id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">
                      Train {disruption.train_id} - Section {disruption.section_id}
                    </p>
                    <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(disruption.risk_level)}`}>
                      {disruption.risk_level?.toUpperCase()} RISK
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    Disruption probability: {disruption.probability}%
                  </p>
                  {disruption.factors.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Factors: {disruption.factors.join(', ')}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Demand Forecast */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2 text-blue-500" />
            24h Demand Forecast
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
              {predictions.demand.length} hours
            </span>
          </h3>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {predictions.demand.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Loading demand forecast...</p>
            ) : (
              predictions.demand.slice(0, 8).map((item) => (
                <div key={item.hour} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <span className="text-sm text-gray-700">{item.hour}:00</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{item.demand}</span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(item.utilization * 100).toFixed(0)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{(item.utilization * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Capacity Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TruckIcon className="w-5 h-5 mr-2 text-green-500" />
            Capacity Analysis
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
              {predictions.capacity.length} sections
            </span>
          </h3>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {predictions.capacity.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Loading capacity analysis...</p>
            ) : (
              predictions.capacity.map((item) => (
                <div key={item.section_id} className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">
                      {item.section_name || `Section ${item.section_id}`}
                    </p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.bottleneck_risk === 'high' 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {item.bottleneck_risk?.toUpperCase()} RISK
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Utilization</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${(item.predicted_utilization * 100).toFixed(0)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium">
                        {(item.predicted_utilization * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* System-wide Summary */}
      {systemWideData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2 text-blue-500" />
            System-wide Risk Assessment
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{systemWideData.predictions.length}</p>
              <p className="text-sm text-gray-600">Total Predictions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {predictions.delays.filter(d => d.predicted_delay > 5).length}
              </p>
              <p className="text-sm text-gray-600">Significant Delays</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {predictions.disruptions.filter(d => d.risk_level === 'high').length}
              </p>
              <p className="text-sm text-gray-600">High Risk Disruptions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {new Date(systemWideData.timestamp).toLocaleTimeString()}
              </p>
              <p className="text-sm text-gray-600">Last Updated</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MLPredictionCenter;