import React from 'react';
import { motion } from 'framer-motion';
import {
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayCircleIcon,
  StopCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const TrainCard = ({ 
  train, 
  isSelected, 
  onToggleSelection, 
  onView, 
  onEdit, 
  onDelete 
}) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'RUNNING':
        return PlayCircleIcon;
      case 'STOPPED':
        return StopCircleIcon;
      case 'DELAYED':
        return ExclamationTriangleIcon;
      case 'COMPLETED':
        return CheckCircleIcon;
      default:
        return ClockIcon;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'RUNNING':
        return 'text-green-600 bg-green-100';
      case 'STOPPED':
        return 'text-yellow-600 bg-yellow-100';
      case 'DELAYED':
        return 'text-red-600 bg-red-100';
      case 'COMPLETED':
        return 'text-gray-600 bg-gray-100';
      case 'SCHEDULED':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'EXPRESS':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'FREIGHT':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'SUBURBAN':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'SPECIAL':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      1: 'bg-red-500',
      2: 'bg-orange-500',
      3: 'bg-yellow-500',
      4: 'bg-blue-500',
      5: 'bg-gray-500'
    };
    
    return colors[priority] || colors[3];
  };

  const formatSpeed = (speed) => {
    return speed ? `${speed.toFixed(1)} km/h` : '0 km/h';
  };

  const formatDelay = () => {
    if (!train.scheduled_arrival || !train.actual_arrival) return null;
    
    const scheduled = new Date(train.scheduled_arrival);
    const actual = new Date(train.actual_arrival);
    const delayMinutes = Math.max(0, (actual - scheduled) / (1000 * 60));
    
    if (delayMinutes === 0) return null;
    return `+${delayMinutes.toFixed(0)}m`;
  };

  const StatusIcon = getStatusIcon(train.status);
  const statusColor = getStatusColor(train.status);
  const typeColor = getTypeColor(train.train_type);
  const priorityColor = getPriorityBadge(train.priority);
  const delay = formatDelay();

  return (
    <motion.div
      whileHover={{ y: -2, shadow: "0 8px 25px rgba(0,0,0,0.1)" }}
      className={`
        relative bg-white rounded-xl border-2 transition-all duration-200 overflow-hidden
        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
      `}
    >
      {/* Selection checkbox */}
      <div className="absolute top-3 left-3 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelection}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 shadow-sm"
        />
      </div>

      {/* Priority indicator */}
      <div className="absolute top-3 right-3">
        <div className={`w-3 h-3 rounded-full ${priorityColor}`} title={`Priority ${train.priority}`} />
      </div>

      {/* Card content */}
      <div className="p-4 pt-10">
        {/* Header */}
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-1">
            <TruckIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {train.train_number}
            </h3>
          </div>
          <p className="text-sm text-gray-600 truncate" title={train.train_name}>
            {train.train_name}
          </p>
        </div>

        {/* Type and Status */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${typeColor}`}>
            {train.train_type}
          </span>
          
          <div className="flex items-center space-x-1">
            <StatusIcon className={`h-4 w-4 ${statusColor.split(' ')[0]}`} />
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
              {train.status}
            </span>
          </div>
        </div>

        {/* Current metrics */}
        <div className="space-y-2 mb-4">
          {/* Speed */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Current Speed:</span>
            <span className="font-medium text-gray-900">
              {formatSpeed(train.current_speed)}
            </span>
          </div>

          {/* Position */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Section:</span>
            <span className="font-medium text-gray-900">
              {train.current_section_id ? `SEC-${train.current_section_id}` : 'N/A'}
            </span>
          </div>

          {/* Position within section */}
          {train.current_position !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Position:</span>
              <span className="font-medium text-gray-900">
                {train.current_position.toFixed(0)}m
              </span>
            </div>
          )}

          {/* Delay indicator */}
          {delay && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Delay:</span>
              <span className="font-medium text-red-600">
                {delay}
              </span>
            </div>
          )}
        </div>

        {/* Schedule info */}
        {(train.scheduled_arrival || train.scheduled_departure) && (
          <div className="border-t border-gray-100 pt-3 mb-4">
            <div className="text-xs text-gray-500 space-y-1">
              {train.scheduled_arrival && (
                <div className="flex items-center justify-between">
                  <span>Scheduled Arrival:</span>
                  <span>{new Date(train.scheduled_arrival).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              )}
              {train.scheduled_departure && (
                <div className="flex items-center justify-between">
                  <span>Scheduled Departure:</span>
                  <span>{new Date(train.scheduled_departure).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Updated: {new Date(train.updated_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="View details"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Edit train"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete train"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Status indicator bar */}
      <div className={`h-1 ${statusColor.split(' ')[1]}`} />
    </motion.div>
  );
};

export default TrainCard;