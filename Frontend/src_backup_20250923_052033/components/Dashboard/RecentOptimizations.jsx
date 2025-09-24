import React from 'react';
import { motion } from 'framer-motion';
import {
  CpuChipIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const RecentOptimizations = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <CpuChipIcon className="h-12 w-12 mx-auto mb-3" />
        <p className="text-sm font-medium">No recent optimizations</p>
        <p className="text-xs mt-1">Optimization results will appear here</p>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OPTIMAL':
      case 'FEASIBLE':
        return CheckCircleIcon;
      case 'INFEASIBLE':
      case 'ERROR':
        return XCircleIcon;
      default:
        return ClockIcon;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPTIMAL':
        return 'text-green-600 bg-green-100';
      case 'FEASIBLE':
        return 'text-blue-600 bg-blue-100';
      case 'INFEASIBLE':
      case 'ERROR':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-3">
      {data.slice(0, 5).map((run, index) => {
        const StatusIcon = getStatusIcon(run.solution_status);
        const statusColor = getStatusColor(run.solution_status);
        
        return (
          <motion.div
            key={run.run_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow bg-white"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`rounded-full p-1 ${statusColor}`}>
                  <StatusIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {run.scenario_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTime(run.created_at)} • {run.solving_time.toFixed(2)}s
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor}`}>
                  {run.solution_status}
                </p>
              </div>
            </div>
            
            {run.objective_value && (
              <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-gray-500">Objective</p>
                  <p className="font-medium">{run.objective_value.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Decisions</p>
                  <p className="font-medium">{run.decisions_count || 0}</p>
                </div>
                <div>
                  <p className="text-gray-500">Trains</p>
                  <p className="font-medium">{run.trains_affected || 0}</p>
                </div>
              </div>
            )}
            
            {run.improvements && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-green-600">
                  ↓ {run.improvements.delay_reduction || 0}% delay
                </span>
                <span className="text-blue-600">
                  ↑ {run.improvements.throughput_increase || 0}% throughput
                </span>
              </div>
            )}
          </motion.div>
        );
      })}
      
      <div className="text-center pt-3">
        <button className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium">
          View all optimizations
          <ArrowRightIcon className="ml-1 h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default RecentOptimizations;