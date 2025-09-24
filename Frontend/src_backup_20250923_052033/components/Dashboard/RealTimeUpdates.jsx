import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TruckIcon,
  MapIcon,
  ClockIcon,
  ArrowRightIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';
import { useAppStore } from '../../store/appStore';
import { useWebSocket } from '../../context/WebSocketContext';

const RealTimeUpdates = () => {
  const [updates, setUpdates] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const { trains, sections } = useAppStore();
  const { isConnected } = useWebSocket();

  // Simulate real-time updates
  useEffect(() => {
    if (isPaused || !isConnected) return;

    const generateUpdate = () => {
      const updateTypes = ['train_moved', 'train_status_changed', 'optimization_completed', 'section_updated'];
      const type = updateTypes[Math.floor(Math.random() * updateTypes.length)];
      
      let update = {
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        type
      };

      switch (type) {
        case 'train_moved':
          const randomTrain = trains[Math.floor(Math.random() * trains.length)];
          if (randomTrain) {
            update = {
              ...update,
              message: `Train ${randomTrain.train_number} moved to position ${Math.floor(Math.random() * 1000)}m`,
              icon: TruckIcon,
              color: 'blue'
            };
          }
          break;
          
        case 'train_status_changed':
          const statuses = ['RUNNING', 'DELAYED', 'STOPPED'];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          const train = trains[Math.floor(Math.random() * trains.length)];
          if (train) {
            update = {
              ...update,
              message: `Train ${train.train_number} status changed to ${status}`,
              icon: TruckIcon,
              color: status === 'RUNNING' ? 'green' : status === 'DELAYED' ? 'red' : 'yellow'
            };
          }
          break;
          
        case 'optimization_completed':
          update = {
            ...update,
            message: `Optimization completed with ${Math.floor(Math.random() * 10) + 1} decisions`,
            icon: ClockIcon,
            color: 'purple'
          };
          break;
          
        case 'section_updated':
          const section = sections[Math.floor(Math.random() * sections.length)];
          if (section) {
            update = {
              ...update,
              message: `Section ${section.section_code} utilization updated`,
              icon: MapIcon,
              color: 'green'
            };
          }
          break;
          
        default:
          return;
      }

      setUpdates(prev => [update, ...prev.slice(0, 9)]); // Keep only 10 latest
    };

    const interval = setInterval(generateUpdate, 3000); // Every 3 seconds
    return () => clearInterval(interval);
  }, [trains, sections, isPaused, isConnected]);

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-100',
      green: 'text-green-600 bg-green-100',
      red: 'text-red-600 bg-red-100',
      yellow: 'text-yellow-600 bg-yellow-100',
      purple: 'text-purple-600 bg-purple-100'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Real-time Updates</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600"
            >
              {isPaused ? (
                <PlayIcon className="h-4 w-4" />
              ) : (
                <PauseIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        <AnimatePresence>
          {updates.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-gray-500"
            >
              <ClockIcon className="h-12 w-12 mx-auto mb-3" />
              <p className="text-sm font-medium">
                {isPaused ? 'Updates paused' : 'Waiting for updates...'}
              </p>
              <p className="text-xs mt-1">
                {!isConnected && 'Connection required for real-time updates'}
              </p>
            </motion.div>
          ) : (
            updates.map((update, index) => {
              const Icon = update.icon;
              const colorClasses = getColorClasses(update.color);
              
              return (
                <motion.div
                  key={update.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50"
                >
                  <div className={`rounded-full p-1 ${colorClasses}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 line-clamp-2">
                      {update.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTime(update.timestamp)}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {updates.length > 0 && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium">
            View detailed activity log
          </button>
        </div>
      )}
    </div>
  );
};

export default RealTimeUpdates;