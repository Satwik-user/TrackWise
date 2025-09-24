import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CpuChipIcon,
  PlayIcon,
  StopIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';

import { apiService } from '../services/apiService';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';
import SafeRenderer from '../components/Common/SafeRenderer';
import ValidationErrorBoundary from '../components/Common/ValidationErrorBoundary';

// Components
import OptimizationForm from '../components/OptimizationCenter/OptimizationForm';
import OptimizationResults from '../components/OptimizationCenter/OptimizationResults';
import OptimizationHistory from '../components/OptimizationCenter/OptimizationHistory';
import DecisionPanel from '../components/OptimizationCenter/DecisionPanel';
import OptimizationMetrics from '../components/OptimizationCenter/OptimizationMetrics';
import QuickOptimization from '../components/OptimizationCenter/QuickOptimization';

const OptimizationCenter = () => {
  console.log('🚀 OptimizationCenter rendering...'); // Debug log
  
  const [activeTab, setActiveTab] = useState('optimize');
  const [currentOptimization, setCurrentOptimization] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const {
    trains,
    sections,
    optimizationRuns,
    addOptimizationRun,
    updateMetrics
  } = useAppStore();

  const queryClient = useQueryClient();

  // Fetch optimization runs
  const { data: optimizationHistory, isLoading: historyLoading } = useQuery(
    ['optimization-runs'],
    () => apiService.optimization.getRuns({ limit: 20 }),
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      onSuccess: (data) => {
        // Sanitize data before updating store
        const sanitizedData = Array.isArray(data) ? data.map(run => {
          if (typeof run === 'object' && run !== null) {
            // Check if this is a validation error object
            if (run.type && run.loc && run.msg && typeof run.input !== 'undefined') {
              console.warn('🚨 Validation error in optimization runs:', run);
              return null; // Filter out validation errors
            }
          }
          return run;
        }).filter(Boolean) : [];
        
        sanitizedData.forEach(run => addOptimizationRun(run));
      }
    }
  );

  // Fetch current metrics
  const { data: currentMetrics } = useQuery(
    ['optimization-metrics'],
    () => apiService.optimization.getCurrentMetrics(),
    {
      refetchInterval: 15000, // Refresh every 15 seconds
      onSuccess: (data) => {
        // Sanitize metrics data
        if (data && typeof data === 'object') {
          // Check if data contains validation errors
          const sanitizedData = { ...data };
          Object.keys(sanitizedData).forEach(key => {
            const value = sanitizedData[key];
            if (value && typeof value === 'object' && value.type && value.loc && value.msg) {
              console.warn('🚨 Validation error in metrics:', key, value);
              sanitizedData[key] = { error: value.msg }; // Replace with safe object
            }
          });
          updateMetrics(sanitizedData);
        } else {
          updateMetrics(data);
        }
      }
    }
  );

  // Fetch recent decisions
  const { data: recentDecisions } = useQuery(
    ['recent-decisions'],
    () => apiService.optimization.getDecisions({ limit: 10 }),
    {
      refetchInterval: 20000 // Refresh every 20 seconds
    }
  );

  // Run optimization mutation
  const runOptimizationMutation = useMutation(
    (optimizationRequest) => apiService.optimization.runOptimization(optimizationRequest),
    {
      onMutate: () => {
        setIsOptimizing(true);
        setOptimizationProgress(0);
        
        // Simulate progress
        const progressInterval = setInterval(() => {
          setOptimizationProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + Math.random() * 10;
          });
        }, 500);
      },
      onSuccess: (result) => {
        setCurrentOptimization(result);
        setOptimizationProgress(100);
        addOptimizationRun(result);
        toast.success(`Optimization completed: ${result.solution_status}`);
        
        // Invalidate related queries
        queryClient.invalidateQueries(['optimization-runs']);
        queryClient.invalidateQueries(['optimization-metrics']);
        queryClient.invalidateQueries(['recent-decisions']);
        
        setTimeout(() => {
          setIsOptimizing(false);
          setOptimizationProgress(0);
        }, 1000);
      },
      onError: (error) => {
        setIsOptimizing(false);
        setOptimizationProgress(0);
        toast.error(`Optimization failed: ${error.message}`);
      }
    }
  );

  // Simulation mutation
  const runSimulationMutation = useMutation(
    (scenarioData) => apiService.optimization.simulate(scenarioData),
    {
      onSuccess: (result) => {
        toast.success('Simulation completed successfully');
        // Handle simulation results
      },
      onError: (error) => {
        toast.error(`Simulation failed: ${error.message}`);
      }
    }
  );

  const tabs = [
    {
      id: 'optimize',
      label: 'Optimize',
      icon: CpuChipIcon,
      description: 'Run traffic optimization'
    },
    {
      id: 'results',
      label: 'Results',
      icon: ChartBarIcon,
      description: 'View optimization results'
    },
    {
      id: 'history',
      label: 'History',
      icon: ClockIcon,
      description: 'Optimization history'
    },
    {
      id: 'decisions',
      label: 'Decisions',
      icon: DocumentTextIcon,
      description: 'Review decisions'
    },
    {
      id: 'simulate',
      label: 'Simulate',
      icon: BeakerIcon,
      description: 'Run scenarios'
    }
  ];

  const handleOptimizationSubmit = (optimizationRequest) => {
    runOptimizationMutation.mutate(optimizationRequest);
  };

  const handleSimulationSubmit = (scenarioData) => {
    runSimulationMutation.mutate(scenarioData);
  };

  const handleQuickOptimize = async (type = 'real_time') => {
    const activeTrains = trains.filter(t => t.status === 'RUNNING').slice(0, 10);
    const activeSections = sections.filter(s => s.is_active).slice(0, 8);

    if (activeTrains.length === 0) {
      toast.error('No active trains available for optimization');
      return;
    }

    const quickRequest = {
      scenario_name: `Quick ${type.replace('_', ' ')} Optimization - ${new Date().toLocaleTimeString()}`,
      optimization_type: type.toUpperCase(),
      train_ids: activeTrains.map(t => t.id),
      section_ids: activeSections.map(s => s.id),
      time_horizon: type === 'real_time' ? 1800 : 3600, // 30 min or 1 hour
      objective_weights: {
        delay: 0.6,
        throughput: 0.4
      },
      use_ml_predictions: true,
      solver_timeout: type === 'real_time' ? 5 : 30
    };

    handleOptimizationSubmit(quickRequest);
  };

  return (
    <ValidationErrorBoundary>
      <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <CpuChipIcon className="h-7 w-7 mr-2 text-blue-600" />
              Optimization Center
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              AI-powered railway traffic optimization and decision support
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-3">
            <QuickOptimization
              onOptimize={handleQuickOptimize}
              isOptimizing={isOptimizing}
              trainsCount={trains.filter(t => t.status === 'RUNNING').length}
              sectionsCount={sections.filter(s => s.is_active).length}
            />
            
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className={`btn-secondary flex items-center space-x-2 ${
                showAdvancedSettings ? 'bg-blue-100 text-blue-700' : ''
              }`}
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
              <span>Advanced</span>
            </button>
          </div>
        </div>

        {/* Current Status */}
        {(isOptimizing || currentOptimization) && (
          <div className="mt-4">
            <OptimizationStatusBar
              isOptimizing={isOptimizing}
              progress={optimizationProgress}
              currentOptimization={currentOptimization}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="mt-4">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'optimize' && (
                <motion.div
                  key="optimize"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <OptimizationForm
                    onSubmit={handleOptimizationSubmit}
                    isOptimizing={isOptimizing}
                    trains={trains}
                    sections={sections}
                    showAdvanced={showAdvancedSettings}
                  />
                </motion.div>
              )}

              {activeTab === 'results' && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <OptimizationResults
                    result={currentOptimization}
                    isLoading={isOptimizing}
                    onRerun={(result) => {
                      // Create a new optimization request based on previous result
                      const rerunRequest = {
                        ...result.request_data,
                        scenario_name: `Rerun: ${result.scenario_name}`,
                      };
                      handleOptimizationSubmit(rerunRequest);
                    }}
                  />
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <OptimizationHistory
                    runs={optimizationHistory || []}
                    isLoading={historyLoading}
                    onSelectRun={setCurrentOptimization}
                    onRerunOptimization={(run) => {
                      const rerunRequest = {
                        ...run.request_data,
                        scenario_name: `Rerun: ${run.scenario_name}`,
                      };
                      handleOptimizationSubmit(rerunRequest);
                    }}
                  />
                </motion.div>
              )}

              {activeTab === 'decisions' && (
                <motion.div
                  key="decisions"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <DecisionPanel
                    decisions={recentDecisions || []}
                    onUpdateDecision={(decisionId, updates) => {
                      // Handle decision updates
                      toast.success('Decision updated successfully');
                    }}
                  />
                </motion.div>
              )}

              {activeTab === 'simulate' && (
                <motion.div
                  key="simulate"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <SimulationPanel
                    onSubmit={handleSimulationSubmit}
                    isSimulating={runSimulationMutation.isLoading}
                    trains={trains}
                    sections={sections}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-hidden">
          <OptimizationMetrics
            currentMetrics={currentMetrics}
            recentRuns={optimizationHistory?.slice(0, 5) || []}
            isOptimizing={isOptimizing}
          />
        </div>
      </div>
    </div>
    </ValidationErrorBoundary>
  );
};

// Optimization Status Bar Component
const OptimizationStatusBar = ({ isOptimizing, progress, currentOptimization }) => {
  if (isOptimizing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="text-sm font-medium text-blue-900">
              Optimization in progress...
            </span>
          </div>
          <span className="text-sm text-blue-700">
            {progress.toFixed(0)}%
          </span>
        </div>
        
        <div className="w-full bg-blue-200 rounded-full h-2">
          <motion.div
            className="bg-blue-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        
        <p className="text-xs text-blue-700 mt-2">
          Running AI-powered optimization algorithms...
        </p>
      </motion.div>
    );
  }

  if (currentOptimization) {
    const isSuccessful = ['OPTIMAL', 'FEASIBLE'].includes(currentOptimization.solution_status);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`border rounded-lg p-4 ${
          isSuccessful 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isSuccessful ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            )}
            <div>
              <span className={`text-sm font-medium ${
                isSuccessful ? 'text-green-900' : 'text-red-900'
              }`}>
                {currentOptimization.scenario_name}
              </span>
              <p className={`text-xs ${
                isSuccessful ? 'text-green-700' : 'text-red-700'
              }`}>
                Status: {currentOptimization.solution_status} • 
                Solved in {currentOptimization.solving_time?.toFixed(2)}s
              </p>
            </div>
          </div>
          
          {currentOptimization.objective_value && (
            <div className="text-right">
              <div className={`text-lg font-bold ${
                isSuccessful ? 'text-green-900' : 'text-red-900'
              }`}>
                {(currentOptimization.objective_value || 0).toFixed(1)}
              </div>
              <div className={`text-xs ${
                isSuccessful ? 'text-green-700' : 'text-red-700'
              }`}>
                Objective Value
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return null;
};

// Simulation Panel Component (placeholder)
const SimulationPanel = ({ onSubmit, isSimulating, trains, sections }) => {
  const [scenarioData, setScenarioData] = useState({
    scenario_name: '',
    duration: 3600,
    disruptions: [],
    trains_data: [],
    sections_data: []
  });

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Traffic Simulation
        </h2>
        <p className="text-gray-600 mb-6">
          Run simulation scenarios to test optimization strategies and system performance.
        </p>
        
        <div className="text-center py-12 text-gray-500">
          <BeakerIcon className="h-12 w-12 mx-auto mb-3" />
          <p className="text-sm font-medium">Simulation Interface</p>
          <p className="text-xs mt-1">Coming soon - advanced scenario testing capabilities</p>
        </div>
      </div>
    </div>
  );
};

export default OptimizationCenter;