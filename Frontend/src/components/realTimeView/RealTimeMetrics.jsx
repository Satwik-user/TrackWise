import React from 'react';
import { motion } from 'framer-motion';
import {
  TrainIcon,
  MapIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ClockIcon,
  BoltIcon,
  SignalIcon,
  WifiIcon
} from '@heroicons/react/24/outline';

const RealTimeMetrics = ({
  trainsByStatus,
  sectionUtilization,
  activeAlerts,
  isConnected
}) => {
  const totalTrains = Object.values(trainsByStatus).reduce((sum, count) => sum + count, 0);
  const runningTrains = trainsByStatus.RUNNING || 0;
  const delayedTrains = trainsByStatus.DELAYED || 0;
  const stoppedTrains = trainsByStatus.STOPPED || 0;

  const metrics = [
    {
      id: 'connection',
      label: 'Connection',
      value: isConnected ? 'Live' : 'Offline',
      icon: isConnected ? WifiIcon : SignalIcon,
      color: isConnected ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100',
      trend: null
    },
    {
      id: 'total_trains',
      label: 'Total Trains',
      value: totalTrains,
      icon: TrainIcon,
      color: 'text-blue-600 bg-blue-100',
      trend: null
    },
    {
      id: 'running_trains',
      label: 'Running',
      value: runningTrains,
      icon: BoltIcon,
      color: 'text-green-600 bg-green-100',
      trend: runningTrains > 0 ? { value: ((runningTrains / totalTrains) * 100).toFixed(0), label: '% active' } : null
    },
    {
      id: 'delayed_trains',
      label: 'Delayed',
      value: delayedTrains,
      icon: ClockIcon,
      color: delayedTrains > 0 ? 'text-red-600 bg-red-100' : 'text-gray-600 bg-gray-100',
      trend: delayedTrains > 0 ? { value: ((delayedTrains / totalTrains) * 100).toFixed(0), label: '% delayed' } : null
    },
    {
      id: 'section_utilization',
      label: 'Utilization',
      value: `${sectionUtilization.toFixed(0)}%`,
      icon: ChartBarIcon,
      color: sectionUtilization > 80 ? 'text-orange-600 bg-orange-100' : 
             sectionUtilization > 60 ? 'text-yellow-600 bg-yellow-100' : 'text-green-600 bg-green-100',
      trend: { value: sectionUtilization > 50 ? 'High' : 'Normal', label: 'load' }
    },
    {
      id: 'active_alerts',
      label: 'Alerts',
      value: activeAlerts,
      icon: ExclamationTriangleIcon,
      color: activeAlerts > 0 ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100',
      trend: null
    }
  ];

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.id}
            metric={metric}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ metric, index }) => {
  const Icon = metric.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="bg-white rounded-lg border border-gray-200 p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-1.5 rounded-md ${metric.color.split(' ')[1]}`}>
          <Icon className={`h-4 w-4 ${metric.color.split(' ')[0]}`} />
        </div>
        
        {metric.trend && (
          <div className="text-right">
            <div className="text-xs font-medium text-gray-900">
              {metric.trend.value}
            </div>
            <div className="text-xs text-gray-500">
              {metric.trend.label}
            </div>
          </div>
        )}
      </div>
      
      <div>
        <div className="text-lg font-bold text-gray-900 mb-1">
          {metric.value}
        </div>
        <div className="text-xs text-gray-500">
          {metric.label}
        </div>
      </div>
    </motion.div>
  );
};

export default RealTimeMetrics;