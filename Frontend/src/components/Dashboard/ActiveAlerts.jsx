import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useAppStore } from '../../store/appStore';

const ActiveAlerts = ({ alerts }) => {
  const { removeAlert } = useAppStore();

  const getAlertIcon = (type) => {
    switch (type) {
      case 'ERROR':
        return XCircleIcon;
      case 'WARNING':
        return ExclamationTriangleIcon;
      case 'INFO':
        return InformationCircleIcon;
      case 'SUCCESS':
        return CheckCircleIcon;
      default:
        return InformationCircleIcon;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'ERROR':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-500',
          text: 'text-red-800',
          button: 'text-red-400 hover:text-red-600'
        };
      case 'WARNING':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-500',
          text: 'text-yellow-800',
          button: 'text-yellow-400 hover:text-yellow-600'
        };
      case 'INFO':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-500',
          text: 'text-blue-800',
          button: 'text-blue-400 hover:text-blue-600'
        };
      case 'SUCCESS':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-500',
          text: 'text-green-800',
          button: 'text-green-400 hover:text-green-600'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: 'text-gray-500',
          text: 'text-gray-800',
          button: 'text-gray-400 hover:text-gray-600'
        };
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Active Alerts</h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {alerts.length}
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {alerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-gray-500"
            >
              <CheckCircleIcon className="h-12 w-12 mx-auto mb-3 text-green-400" />
              <p className="text-sm font-medium">All systems normal</p>
              <p className="text-xs mt-1">No active alerts</p>
            </motion.div>
          ) : (
            alerts.slice(0, 5).map((alert, index) => {
              const Icon = getAlertIcon(alert.type);
              const colors = getAlertColor(alert.type);
              
              return (
                <motion.div
                  key={alert.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className={`rounded-lg border p-3 ${colors.bg} ${colors.border}`}
                >
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Icon className={`h-5 w-5 ${colors.icon}`} />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className={`text-sm font-medium ${colors.text}`}>
                        {alert.message}
                      </p>
                      {alert.data && (
                        <p className="text-xs mt-1 text-gray-600">
                          {typeof alert.data === 'object' 
                            ? JSON.stringify(alert.data, null, 2)
                            : alert.data}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <p className={`text-xs ${colors.text} opacity-75`}>
                          <ClockIcon className="h-3 w-3 inline mr-1" />
                          {formatTime(alert.timestamp)}
                        </p>
                        <button
                          onClick={() => removeAlert(alert.id)}
                          className={`text-xs ${colors.button} hover:underline`}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
        
        {alerts.length > 5 && (
          <div className="text-center pt-3 border-t border-gray-200">
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              View all {alerts.length} alerts
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveAlerts;