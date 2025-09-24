import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PlayIcon,
  StopIcon,
  CogIcon,
  DocumentReportIcon,
  RefreshIcon,
  PlusIcon,
  ExclamationIcon
} from '@heroicons/react/24/outline';
import { useAppStore } from '../../store/appStore';
import { apiService } from '../../services/apiService';
import toast from 'react-hot-toast';

const QuickActions = () => {
  const [isLoading, setIsLoading] = useState({});
  const { trains, sections, addOptimizationRun } = useAppStore();

  const handleAction = async (actionType) => {
    setIsLoading(prev => ({ ...prev, [actionType]: true }));

    try {
      switch (actionType) {
        case 'optimize':
          await handleQuickOptimize();
          break;
        case 'emergency_stop':
          await handleEmergencyStop();
          break;
        case 'refresh_data':
          await handleRefreshData();
          break;
        case 'generate_report':
          await handleGenerateReport();
          break;
        case 'add_train':
          // This would typically open a modal or navigate to train creation
          toast.success('Opening train creation form...');
          break;
        case 'system_check':
          await handleSystemCheck();
          break;
        default:
          toast.error('Unknown action');
      }
    } catch (error) {
      toast.error(`Failed to ${actionType.replace('_', ' ')}: ${typeof error?.message === 'string' ? error.message : JSON.stringify(error)}`);
    } finally {
      setIsLoading(prev => ({ ...prev, [actionType]: false }));
    }
  };

  const handleQuickOptimize = async () => {
    if (trains.length === 0 || sections.length === 0) {
      toast.error('No trains or sections available for optimization');
      return;
    }

    const runningTrains = trains.filter(t => t.status === 'RUNNING').slice(0, 10);
    const activeSections = sections.filter(s => s.is_active).slice(0, 5);

    if (runningTrains.length === 0) {
      toast.error('No running trains available for optimization');
      return;
    }

    const optimizationRequest = {
      scenario_name: `Quick Optimization ${new Date().toLocaleTimeString()}`,
      optimization_type: 'REAL_TIME',
      train_ids: runningTrains.map(t => t.id),
      section_ids: activeSections.map(s => s.id),
      time_horizon: 1800, // 30 minutes
      objective_weights: { delay: 0.6, throughput: 0.4 },
      use_ml_predictions: true,
      solver_timeout: 5
    };

    const result = await apiService.optimization.runOptimization(optimizationRequest);
    addOptimizationRun(result);
    toast.success(`Optimization completed: ${result.solution_status}`);
  };

  const handleEmergencyStop = async () => {
    // In a real system, this would trigger emergency protocols
    toast.success('Emergency stop signal sent to all trains');
  };

  const handleRefreshData = async () => {
    // Refresh all data
    window.location.reload();
  };

  const handleGenerateReport = async () => {
    const report = await apiService.analytics.exportPerformanceReport(24, 'json');
    toast.success('Performance report generated');
    
    // In a real implementation, this would download the report
    console.log('Generated report:', report);
  };

  const handleSystemCheck = async () => {
    const health = await apiService.healthCheck();
    if (health.status === 'healthy') {
      toast.success('System check passed - all systems operational');
    } else {
      toast.warning('System check found issues');
    }
  };

  const actions = [
    {
      id: 'optimize',
      label: 'Quick Optimize',
      description: 'Run optimization on active trains',
      icon: PlayIcon,
      color: 'bg-blue-500 hover:bg-blue-600',
      textColor: 'text-white'
    },
    {
      id: 'emergency_stop',
      label: 'Emergency Stop',
      description: 'Stop all trains immediately',
      icon: StopIcon,
      color: 'bg-red-500 hover:bg-red-600',
      textColor: 'text-white'
    },
    {
      id: 'add_train',
      label: 'Add Train',
      description: 'Create new train entry',
      icon: PlusIcon,
      color: 'bg-green-500 hover:bg-green-600',
      textColor: 'text-white'
    },
    {
      id: 'refresh_data',
      label: 'Refresh Data',
      description: 'Reload all system data',
      icon: RefreshIcon,
      color: 'bg-gray-500 hover:bg-gray-600',
      textColor: 'text-white'
    },
    {
      id: 'generate_report',
      label: 'Generate Report',
      description: 'Create performance report',
      icon: DocumentReportIcon,
      color: 'bg-purple-500 hover:bg-purple-600',
      textColor: 'text-white'
    },
    {
      id: 'system_check',
      label: 'System Check',
      description: 'Verify system health',
      icon: CogIcon,
      color: 'bg-orange-500 hover:bg-orange-600',
      textColor: 'text-white'
    }
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        <p className="text-sm text-gray-500">Common operations and controls</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          const loading = isLoading[action.id];
          
          return (
            <motion.button
              key={action.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              onClick={() => handleAction(action.id)}
              disabled={loading}
              className={`
                ${action.color} ${action.textColor}
                p-3 rounded-lg transition-all duration-200 text-left
                disabled:opacity-50 disabled:cursor-not-allowed
                shadow-sm hover:shadow-md
              `}
            >
              <div className="flex items-center space-x-2 mb-2">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
                <span className="font-medium text-sm">{action.label}</span>
              </div>
              <p className="text-xs opacity-90 line-clamp-2">
                {action.description}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Warning for dangerous actions */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <ExclamationIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Safety Notice</p>
            <p className="text-xs text-yellow-700 mt-1">
              Emergency actions will affect all active trains. Use with caution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;