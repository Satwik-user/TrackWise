import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayIcon,
  StopIcon,
  PauseIcon,
  BoltIcon,
  FunnelIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline';

const TrainListPanel = ({
  trains,
  selectedTrain,
  onTrainSelect,
  searchQuery,
  filters
}) => {
  const [sortBy, setSortBy] = useState('train_number');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('compact'); // 'compact', 'detailed'

  // Sort and filter trains
  const sortedTrains = useMemo(() => {
    let filtered = [...trains];

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [trains, sortBy, sortOrder]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'RUNNING':
        return PlayIcon;
      case 'STOPPED':
        return StopIcon;
      case 'DELAYED':
        return ExclamationTriangleIcon;
      case 'COMPLETED':
        return CheckCircleIcon;
      default:
        return PauseIcon;
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
        return 'text-blue-700 bg-blue-100';
      case 'FREIGHT':
        return 'text-orange-700 bg-orange-100';
      case 'SUBURBAN':
        return 'text-green-700 bg-green-100';
      case 'SPECIAL':
        return 'text-purple-700 bg-purple-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      1: 'text-red-700 bg-red-100',
      2: 'text-orange-700 bg-orange-100',
      3: 'text-yellow-700 bg-yellow-100',
      4: 'text-blue-700 bg-blue-100',
      5: 'text-gray-700 bg-gray-100'
    };
    return colors[priority] || colors[3];
  };

  const formatSpeed = (speed) => {
    return speed ? `${speed.toFixed(1)} km/h` : '0 km/h';
  };

  const formatPosition = (position) => {
    return position ? `${position.toFixed(0)}m` : '0m';
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <ListBulletIcon className="h-5 w-5 mr-2" />
            Trains ({sortedTrains.length})
          </h2>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'compact' ? 'detailed' : 'compact')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {viewMode === 'compact' ? 'Detailed' : 'Compact'}
            </button>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-500">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => handleSort(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="train_number">Train Number</option>
            <option value="status">Status</option>
            <option value="priority">Priority</option>
            <option value="current_speed">Speed</option>
            <option value="train_type">Type</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Train List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {sortedTrains.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <TruckIcon className="h-12 w-12 mx-auto mb-3" />
              <p className="text-sm font-medium">No trains found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedTrains.map((train, index) => (
                <TrainListItem
                  key={train.id}
                  train={train}
                  isSelected={selectedTrain?.id === train.id}
                  onClick={() => onTrainSelect(train)}
                  viewMode={viewMode}
                  index={index}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Running:</span>
            <span className="ml-1 font-medium text-green-600">
              {sortedTrains.filter(t => t.status === 'RUNNING').length}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Delayed:</span>
            <span className="ml-1 font-medium text-red-600">
              {sortedTrains.filter(t => t.status === 'DELAYED').length}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Stopped:</span>
            <span className="ml-1 font-medium text-yellow-600">
              {sortedTrains.filter(t => t.status === 'STOPPED').length}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Total:</span>
            <span className="ml-1 font-medium text-gray-900">
              {sortedTrains.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Train List Item Component
const TrainListItem = ({ train, isSelected, onClick, viewMode, index }) => {
  const StatusIcon = getStatusIcon(train.status);
  const statusColor = getStatusColor(train.status);
  const typeColor = getTypeColor(train.train_type);
  const priorityColor = getPriorityColor(train.priority);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      onClick={onClick}
      className={`p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
        isSelected ? 'bg-blue-50 border-r-4 border-blue-500' : ''
      }`}
    >
      {viewMode === 'compact' ? (
        <CompactTrainView train={train} />
      ) : (
        <DetailedTrainView train={train} />
      )}
    </motion.div>
  );
};

// Compact Train View
const CompactTrainView = ({ train }) => {
  const StatusIcon = getStatusIcon(train.status);
  const statusColor = getStatusColor(train.status);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <div className={`p-1.5 rounded-full ${statusColor.split(' ')[1]}`}>
          <StatusIcon className={`h-4 w-4 ${statusColor.split(' ')[0]}`} />
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-gray-900 truncate">
              {train.train_number}
            </p>
            <span className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(train.train_type)}`}>
              {train.train_type}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">
            {train.train_name}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="text-right">
          <p className="text-xs text-gray-500">Speed</p>
          <p className="text-sm font-medium text-gray-900">
            {formatSpeed(train.current_speed)}
          </p>
        </div>
        
        <div className="text-right">
          <p className="text-xs text-gray-500">Section</p>
          <p className="text-sm font-medium text-gray-900">
            {train.current_section_id || 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
};

// Detailed Train View
const DetailedTrainView = ({ train }) => {
  const StatusIcon = getStatusIcon(train.status);
  const statusColor = getStatusColor(train.status);
  const typeColor = getTypeColor(train.train_type);
  const priorityColor = getPriorityColor(train.priority);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${statusColor.split(' ')[1]}`}>
            <StatusIcon className={`h-5 w-5 ${statusColor.split(' ')[0]}`} />
          </div>
          
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {train.train_number}
              </h3>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${typeColor}`}>
                {train.train_type}
              </span>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor}`}>
                P{train.priority}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {train.train_name}
            </p>
          </div>
        </div>

        <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
          {train.status}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="text-center p-2 bg-gray-50 rounded">
          <BoltIcon className="h-4 w-4 mx-auto mb-1 text-gray-400" />
          <p className="text-gray-500">Speed</p>
          <p className="font-medium text-gray-900">
            {formatSpeed(train.current_speed)}
          </p>
        </div>

        <div className="text-center p-2 bg-gray-50 rounded">
          <MapPinIcon className="h-4 w-4 mx-auto mb-1 text-gray-400" />
          <p className="text-gray-500">Position</p>
          <p className="font-medium text-gray-900">
            {formatPosition(train.current_position)}
          </p>
        </div>

        <div className="text-center p-2 bg-gray-50 rounded">
          <TruckIcon className="h-4 w-4 mx-auto mb-1 text-gray-400" />
          <p className="text-gray-500">Section</p>
          <p className="font-medium text-gray-900">
            {train.current_section_id || 'N/A'}
          </p>
        </div>
      </div>

      {/* Schedule Info */}
      {(train.scheduled_arrival || train.scheduled_departure) && (
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          {train.scheduled_arrival && (
            <div>
              <span>Arr: </span>
              <span className="font-medium">
                {new Date(train.scheduled_arrival).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
          
          {train.scheduled_departure && (
            <div>
              <span>Dep: </span>
              <span className="font-medium">
                {new Date(train.scheduled_departure).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper functions (moved outside component for reuse)
const getStatusIcon = (status) => {
  switch (status) {
    case 'RUNNING':
      return PlayIcon;
    case 'STOPPED':
      return StopIcon;
    case 'DELAYED':
      return ExclamationTriangleIcon;
    case 'COMPLETED':
      return CheckCircleIcon;
    default:
      return PauseIcon;
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
      return 'text-blue-700 bg-blue-100';
    case 'FREIGHT':
      return 'text-orange-700 bg-orange-100';
    case 'SUBURBAN':
      return 'text-green-700 bg-green-100';
    case 'SPECIAL':
      return 'text-purple-700 bg-purple-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
};

const getPriorityColor = (priority) => {
  const colors = {
    1: 'text-red-700 bg-red-100',
    2: 'text-orange-700 bg-orange-100',
    3: 'text-yellow-700 bg-yellow-100',
    4: 'text-blue-700 bg-blue-100',
    5: 'text-gray-700 bg-gray-100'
  };
  return colors[priority] || colors[3];
};

const formatSpeed = (speed) => {
  return speed ? `${speed.toFixed(1)} km/h` : '0 km/h';
};

const formatPosition = (position) => {
  return position ? `${position.toFixed(0)}m` : '0m';
};

export default TrainListPanel;