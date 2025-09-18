import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import {
  XMarkIcon,
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  BoltIcon,
  CogIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  StopIcon,
  PauseIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';

const TrainDetailModal = ({ train, onClose, onEdit, onDelete }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch additional train data
  const { data: trainPosition } = useQuery(
    ['train-position', train.id],
    () => apiService.trains.getPosition(train.id),
    {
      refetchInterval: 5000, // Refresh every 5 seconds
      enabled: !!train.id
    }
  );

  const { data: trainSchedule } = useQuery(
    ['train-schedule', train.id],
    () => apiService.trains.getSchedule(train.id),
    {
      enabled: !!train.id
    }
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: InformationCircleIcon },
    { id: 'position', label: 'Position', icon: MapPinIcon },
    { id: 'schedule', label: 'Schedule', icon: ClockIcon },
    { id: 'performance', label: 'Performance', icon: ChartBarIcon },
    { id: 'technical', label: 'Technical', icon: CogIcon }
  ];

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

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'Not set';
    return new Date(dateTime).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDelay = () => {
    if (!train.scheduled_arrival || !train.actual_arrival) return null;
    
    const scheduled = new Date(train.scheduled_arrival);
    const actual = new Date(train.actual_arrival);
    const delayMinutes = Math.max(0, (actual - scheduled) / (1000 * 60));
    
    return delayMinutes;
  };

  const StatusIcon = getStatusIcon(train.status);
  const statusColor = getStatusColor(train.status);
  const delay = calculateDelay();

  return (
    <div className="modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="modal-content max-w-6xl max-h-screen overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${statusColor.split(' ')[1]}`}>
                <TruckIcon className="h-6 w-6 text-gray-700" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {train.train_number}
                </h2>
                <p className="text-sm text-gray-500">{train.train_name}</p>
              </div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
                <StatusIcon className="h-4 w-4 mr-1" />
                {train.status}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={onEdit}
                className="btn-secondary flex items-center space-x-1"
              >
                <PencilIcon className="h-4 w-4" />
                <span>Edit</span>
              </button>
              
              <button
                onClick={onDelete}
                className="btn-danger flex items-center space-x-1"
              >
                <TrashIcon className="h-4 w-4" />
                <span>Delete</span>
              </button>
              
              <button
                onClick={onClose}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

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
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <OverviewTab train={train} delay={delay} />
          )}
          
          {activeTab === 'position' && (
            <PositionTab train={train} positionData={trainPosition} />
          )}
          
          {activeTab === 'schedule' && (
            <ScheduleTab train={train} scheduleData={trainSchedule} />
          )}
          
          {activeTab === 'performance' && (
            <PerformanceTab train={train} delay={delay} />
          )}
          
          {activeTab === 'technical' && (
            <TechnicalTab train={train} />
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ train, delay }) => {
  const getPriorityLabel = (priority) => {
    const labels = {
      1: 'Highest',
      2: 'High',
      3: 'Normal',
      4: 'Low',
      5: 'Lowest'
    };
    return labels[priority] || 'Unknown';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      1: 'text-red-600 bg-red-100',
      2: 'text-orange-600 bg-orange-100',
      3: 'text-yellow-600 bg-yellow-100',
      4: 'text-blue-600 bg-blue-100',
      5: 'text-gray-600 bg-gray-100'
    };
    return colors[priority] || 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Speed</p>
              <p className="text-2xl font-bold text-gray-900">
                {train.current_speed?.toFixed(1) || '0.0'} <span className="text-sm font-normal">km/h</span>
              </p>
            </div>
            <BoltIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Position</p>
              <p className="text-2xl font-bold text-gray-900">
                {train.current_position?.toFixed(0) || '0'} <span className="text-sm font-normal">m</span>
              </p>
            </div>
            <MapPinIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Priority</p>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-gray-900">{train.priority}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(train.priority)}`}>
                  {getPriorityLabel(train.priority)}
                </span>
              </div>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Train Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Train Number:</span>
              <span className="text-sm font-medium text-gray-900">{train.train_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Train Name:</span>
              <span className="text-sm font-medium text-gray-900">{train.train_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Type:</span>
              <span className="text-sm font-medium text-gray-900">{train.train_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Operator:</span>
              <span className="text-sm font-medium text-gray-900">{train.operator || 'Not specified'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Service Class:</span>
              <span className="text-sm font-medium text-gray-900">{train.service_class || 'Regular'}</span>
            </div>
          </div>
        </div>

        {/* Current Status */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Status:</span>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${getStatusColor(train.status)}`}>
                {train.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Current Section:</span>
              <span className="text-sm font-medium text-gray-900">
                {train.current_section_id ? `Section ${train.current_section_id}` : 'Not assigned'}
              </span>
            </div>
            {delay !== null && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Delay:</span>
                <span className={`text-sm font-medium ${delay > 5 ? 'text-red-600' : 'text-green-600'}`}>
                  {delay > 0 ? `+${delay.toFixed(0)} minutes` : 'On time'}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Last Updated:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatDateTime(train.updated_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Capacity Information */}
      {(train.passenger_capacity || train.cargo_capacity) && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Capacity Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {train.passenger_capacity && (
              <div>
                <span className="text-sm text-gray-500">Passenger Capacity:</span>
                <p className="text-lg font-medium text-gray-900">{train.passenger_capacity} passengers</p>
              </div>
            )}
            {train.cargo_capacity && (
              <div>
                <span className="text-sm text-gray-500">Cargo Capacity:</span>
                <p className="text-lg font-medium text-gray-900">{train.cargo_capacity} tons</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Position Tab Component
const PositionTab = ({ train, positionData }) => {
  return (
    <div className="space-y-6">
      {/* Current Position */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Current Position</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">Section ID</label>
              <p className="text-lg font-medium text-gray-900">
                {train.current_section_id || 'Not assigned'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Position within Section</label>
              <p className="text-lg font-medium text-gray-900">
                {train.current_position?.toFixed(1) || 0} meters
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Current Speed</label>
              <p className="text-lg font-medium text-gray-900">
                {train.current_speed?.toFixed(1) || 0} km/h
              </p>
            </div>
          </div>

          {/* Position Visualization */}
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500 mb-2 block">Section Progress</label>
              {train.current_section_id && (
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                    style={{ 
                      width: `${Math.min(100, (train.current_position / 1000) * 100)}%` 
                    }}
                  >
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              )}
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Start</span>
                <span>End</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Position History */}
      {positionData && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Position Updates</h3>
          <div className="space-y-3">
            {positionData.slice(0, 5).map((position, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Section {position.section_id} - Position {position.position}m
                  </p>
                  <p className="text-xs text-gray-500">
                    Speed: {position.speed} km/h
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDateTime(position.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Route Information */}
      {train.planned_route && train.planned_route.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Planned Route</h3>
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {train.planned_route.map((sectionId, index) => (
              <div key={index} className="flex items-center space-x-2 flex-shrink-0">
                <div className={`
                  px-3 py-2 rounded-lg border-2 text-sm font-medium
                  ${index === train.current_route_index 
                    ? 'border-blue-500 bg-blue-100 text-blue-700'
                    : index < train.current_route_index 
                    ? 'border-green-500 bg-green-100 text-green-700'
                    : 'border-gray-300 bg-gray-100 text-gray-700'
                  }
                `}>
                  Section {sectionId}
                </div>
                {index < train.planned_route.length - 1 && (
                  <div className="text-gray-400">→</div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Current: Section {train.planned_route[train.current_route_index]} 
            ({train.current_route_index + 1}/{train.planned_route.length})
          </div>
        </div>
      )}
    </div>
  );
};

// Schedule Tab Component
const ScheduleTab = ({ train, scheduleData }) => {
  return (
    <div className="space-y-6">
      {/* Current Schedule */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Current Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">Scheduled Arrival</label>
              <p className="text-lg font-medium text-gray-900">
                {formatDateTime(train.scheduled_arrival)}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Actual Arrival</label>
              <p className="text-lg font-medium text-gray-900">
                {formatDateTime(train.actual_arrival)}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">Scheduled Departure</label>
              <p className="text-lg font-medium text-gray-900">
                {formatDateTime(train.scheduled_departure)}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Actual Departure</label>
              <p className="text-lg font-medium text-gray-900">
                {formatDateTime(train.actual_departure)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Details */}
      {scheduleData && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule Details</h3>
          <div className="space-y-3">
            {scheduleData.map((schedule, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {schedule.station_name || `Station ${schedule.station_id}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    Distance: {schedule.distance_km} km
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-900">
                    {formatDateTime(schedule.scheduled_time)}
                  </p>
                  {schedule.actual_time && (
                    <p className="text-xs text-gray-500">
                      Actual: {formatDateTime(schedule.actual_time)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Performance Tab Component
const PerformanceTab = ({ train, delay }) => {
  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Punctuality Score</h4>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${(train.punctuality_score || 0) * 100}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {((train.punctuality_score || 0) * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="card">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Energy Efficiency</h4>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${(train.energy_efficiency || 0) * 100}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {((train.energy_efficiency || 0) * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="card">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Current Delay</h4>
          <p className={`text-lg font-bold ${delay && delay > 5 ? 'text-red-600' : 'text-green-600'}`}>
            {delay !== null 
              ? delay > 0 
                ? `+${delay.toFixed(0)}m` 
                : 'On time'
              : 'N/A'
            }
          </p>
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Trends</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center text-gray-500">
            <ChartBarIcon className="h-12 w-12 mx-auto mb-2" />
            <p>Performance charts will be displayed here</p>
            <p className="text-sm">Historical data visualization coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Technical Tab Component
const TechnicalTab = ({ train }) => {
  return (
    <div className="space-y-6">
      {/* Physical Specifications */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Physical Specifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-500">Length</label>
            <p className="text-lg font-medium text-gray-900">{train.length} meters</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Weight</label>
            <p className="text-lg font-medium text-gray-900">{train.weight} tons</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Max Speed</label>
            <p className="text-lg font-medium text-gray-900">{train.max_speed} km/h</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Acceleration</label>
            <p className="text-lg font-medium text-gray-900">{train.acceleration} m/s²</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Deceleration</label>
            <p className="text-lg font-medium text-gray-900">{train.deceleration} m/s²</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Min Dwell Time</label>
            <p className="text-lg font-medium text-gray-900">{train.min_dwell_time || 120} seconds</p>
          </div>
        </div>
      </div>

      {/* Operational Parameters */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Operational Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Energy Efficiency</label>
            <p className="text-lg font-medium text-gray-900">
              {((train.energy_efficiency || 0) * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Punctuality Score</label>
            <p className="text-lg font-medium text-gray-900">
              {((train.punctuality_score || 0) * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Requires Platform</label>
            <p className="text-lg font-medium text-gray-900">
              {train.requires_platform ? 'Yes' : 'No'}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Crew Change Required</label>
            <p className="text-lg font-medium text-gray-900">
              {train.crew_change_required ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Train ID:</span>
            <span className="text-sm font-medium text-gray-900">{train.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Created:</span>
            <span className="text-sm font-medium text-gray-900">
              {formatDateTime(train.created_at)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Last Updated:</span>
            <span className="text-sm font-medium text-gray-900">
              {formatDateTime(train.updated_at)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Current Route Index:</span>
            <span className="text-sm font-medium text-gray-900">
              {train.current_route_index || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatDateTime = (dateTime) => {
  if (!dateTime) return 'Not set';
  return new Date(dateTime).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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

export default TrainDetailModal;