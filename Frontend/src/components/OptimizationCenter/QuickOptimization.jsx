import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BoltIcon,
  ClockIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline';

const QuickOptimization = ({ 
  onOptimize, 
  isOptimizing, 
  trainsCount, 
  sectionsCount 
}) => {
  const [selectedType, setSelectedType] = useState('real_time');

  const quickTypes = [
    {
      id: 'real_time',
      label: 'Real-time',
      description: 'Immediate optimization',
      duration: '< 30s',
      icon: BoltIcon,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'strategic',
      label: 'Strategic',
      description: 'Comprehensive planning',
      duration: '1-2 min',
      icon: CpuChipIcon,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'emergency',
      label: 'Emergency',
      description: 'Crisis response',
      duration: '< 15s',
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500 hover:bg-red-600'
    }
  ];

  const handleQuickOptimize = () => {
    if (trainsCount === 0) {
      alert('No active trains available for optimization');
      return;
    }
    onOptimize(selectedType);
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Quick Type Selector */}
      <div className="flex items-center bg-gray-100 rounded-lg p-1">
        {quickTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              disabled={isOptimizing}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedType === type.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              } ${isOptimizing ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={`${type.description} (${type.duration})`}
            >
              <div className="flex items-center space-x-1">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{type.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Optimize Button */}
      <motion.button
        whileHover={{ scale: isOptimizing ? 1 : 1.02 }}
        whileTap={{ scale: isOptimizing ? 1 : 0.98 }}
        onClick={handleQuickOptimize}
        disabled={isOptimizing}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-lg text-white font-medium
          transition-all duration-200 shadow-sm hover:shadow-md
          ${isOptimizing 
            ? 'bg-gray-400 cursor-not-allowed' 
            : quickTypes.find(t => t.id === selectedType)?.color || 'bg-blue-500 hover:bg-blue-600'
          }
        `}
      >
        {isOptimizing ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Optimizing...</span>
          </>
        ) : (
          <>
            <PlayIcon className="h-4 w-4" />
            <span>Quick Optimize</span>
          </>
        )}
      </motion.button>

      {/* Status Info */}
      <div className="hidden lg:flex items-center text-xs text-gray-500 space-x-2">
        <span>{trainsCount} trains</span>
        <span>•</span>
        <span>{sectionsCount} sections</span>
      </div>
    </div>
  );
};

export default QuickOptimization;