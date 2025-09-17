import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  BellIcon,
  FunnelIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAppStore } from '../../store/appStore';

const AlertsPanel = ({ alerts, onClose }) => {
  const [filter, setFilter] = useState('all'); // 'all', 'error', 'warning', 'info'
  const [sortBy, setSortBy] = useState('timestamp'); // 'timestamp', 'type', 'severity'
  const { removeAlert, clearAlerts } = useAppStore();

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
        return BellIcon;
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

  const getAlertPriority = (type) => {
    const priorities = {
      'ERROR': 4,
      'WARNING': 3,
      'INFO': 2,
      'SUCCESS': 1
    };
    return priorities[type] || 0;
  };

  const filteredAlerts = alerts
    .filter(alert => filter === 'all' || alert.type.toLowerCase() === filter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'type':
          return getAlertPriority(b.type) - getAlertPriority(a.type);
        case 'severity':
          return getAlertPriority(b.type) - getAlertPriority(a.type);
        case 'timestamp':
        default:
          return new Date(b.timestamp) - new Date(a.timestamp);
      }
    });

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getAlertCounts = () => {
    return {
      total: alerts.length,
      error: alerts.filter(a => a.type === 'ERROR').length,
      warning: alerts.filter(a => a.type === 'WARNING').length,
      info: alerts.filter(a => a.type === 'INFO').length,
      success: alerts.filter(a => a.type === 'SUCCESS').length
    };
  };

  const counts = getAlertCounts();

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <BellIcon className="h-5 w-5 mr-2" />
            Alerts ({counts.total})
          </h2>
          
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Alert Summary */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">{counts.error}</div>
            <div className="text-xs text-gray-500">Errors</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">{counts.warning}</div>
            <div className="text-xs text-gray-500">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{counts.info}</div>
            <div className="text-xs text-gray-500">Info</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{counts.success}</div>
            <div className="text-xs text-gray-500">Success</div>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
            >
              <option value="all">All Alerts</option>
              <option value="error">Errors Only</option>
              <option value="warning">Warnings Only</option>
              <option value="info">Info Only</option>
              <option value="success">Success Only</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="timestamp">Recent First</option>
              <option value="type">By Type</option>
              <option value="severity">By Severity</option>
            </select>
            
            {alerts.length > 0 && (
              <button
                onClick={clearAlerts}
                className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center space-x-1"
              >
                <TrashIcon className="h-3 w-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {filteredAlerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 text-center text-gray-500"
            >
              <CheckCircleIcon className="h-12 w-12 mx-auto mb-3 text-green-400" />
              <p className="text-sm font-medium">
                {filter === 'all' ? 'No active alerts' : `No ${filter} alerts`}
              </p>
              <p className="text-xs mt-1">
                All systems operating normally
              </p>
            </motion.div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAlerts.map((alert, index) => (
                <AlertItem
                  key={alert.id || index}
                  alert={alert}
                  onDismiss={() => removeAlert(alert.id)}
                  index={index}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {filteredAlerts.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </div>
        </div>
      )}
    </div>
  );
};

// Alert Item Component
const AlertItem = ({ alert, onDismiss, index }) => {
  const [expanded, setExpanded] = useState(false);
  
  const Icon = getAlertIcon(alert.type);
  const colors = getAlertColor(alert.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={`p-4 ${colors.bg} ${colors.border} border-l-4`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-0.5">
            <Icon className={`h-5 w-5 ${colors.icon}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                {alert.type}
              </span>
              <span className="text-xs text-gray-500">
                {formatTime(alert.timestamp)}
              </span>
            </div>
            
            <p className={`text-sm font-medium ${colors.text} mb-1`}>
              {alert.message}
            </p>
            
            {alert.data && (
              <div className="mt-2">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className={`text-xs ${colors.button} hover:underline`}
                >
                  {expanded ? 'Hide details' : 'Show details'}
                </button>
                
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs overflow-hidden"
                    >
                      <pre className="whitespace-pre-wrap text-gray-700">
                        {typeof alert.data === 'object' 
                          ? JSON.stringify(alert.data, null, 2)
                          : alert.data}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <ClockIcon className="h-3 w-3" />
                <span>{formatTime(alert.timestamp)}</span>
              </div>
              
              <button
                onClick={onDismiss}
                className={`text-xs ${colors.button} hover:underline font-medium`}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Helper functions (moved outside for reuse)
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
      return BellIcon;
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

export default AlertsPanel;