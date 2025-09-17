import React from 'react';
import { motion } from 'framer-motion';
import {
  MapIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  WrenchScrewdriverIcon,
  TrainIcon,
  BoltIcon,
  ScaleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const SectionCard = ({ 
  section, 
  isSelected, 
  onToggleSelection, 
  onView, 
  onEdit, 
  onDelete,
  onToggleMaintenance 
}) => {
  const getStatusIcon = () => {
    if (section.maintenance_mode) return WrenchScrewdriverIcon;
    if (!section.is_active) return ExclamationTriangleIcon;
    if (section.current_occupancy >= section.max_occupancy) return TrainIcon;
    return CheckCircleIcon;
  };

  const getStatusColor = () => {
    if (section.maintenance_mode) return 'text-red-600 bg-red-100';
    if (!section.is_active) return 'text-gray-600 bg-gray-100';
    if (section.current_occupancy >= section.max_occupancy) return 'text-yellow-600 bg-yellow-100';
    
    const utilization = section.current_occupancy / section.max_occupancy;
    if (utilization >= 0.8) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'MAIN_LINE':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'BRANCH_LINE':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'SIDING':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'YARD':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'DEPOT':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getUtilizationColor = (utilization) => {
    if (utilization >= 1) return 'bg-red-500';
    if (utilization >= 0.8) return 'bg-yellow-500';
    if (utilization >= 0.6) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const calculateUtilization = () => {
    return section.max_occupancy > 0 ? section.current_occupancy / section.max_occupancy : 0;
  };

  const formatLength = (length) => {
    if (length >= 1000) return `${(length / 1000).toFixed(1)}km`;
    return `${length}m`;
  };

  const getTrafficLevel = () => {
    const utilization = calculateUtilization();
    if (utilization >= 0.8) return 'Heavy';
    if (utilization >= 0.5) return 'Moderate';
    if (utilization >= 0.2) return 'Light';
    return 'Minimal';
  };

  const StatusIcon = getStatusIcon();
  const statusColor = getStatusColor();
  const typeColor = getTypeColor(section.section_type);
  const utilization = calculateUtilization();
  const utilizationColor = getUtilizationColor(utilization);

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

      {/* Status indicator */}
      <div className="absolute top-3 right-3">
        <div className={`p-1.5 rounded-full ${statusColor}`}>
          <StatusIcon className="h-4 w-4" />
        </div>
      </div>

      {/* Card content */}
      <div className="p-4 pt-10">
        {/* Header */}
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-1">
            <MapIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {section.section_code}
            </h3>
          </div>
          <p className="text-sm text-gray-600 truncate" title={section.section_name}>
            {section.section_name}
          </p>
        </div>

        {/* Type Badge */}
        <div className="mb-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${typeColor}`}>
            {section.section_type.replace('_', ' ')}
          </span>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="text-center p-2 bg-gray-50 rounded">
            <ScaleIcon className="h-4 w-4 mx-auto mb-1 text-gray-400" />
            <p className="text-gray-500 text-xs">Length</p>
            <p className="font-medium text-gray-900">{formatLength(section.length)}</p>
          </div>

          <div className="text-center p-2 bg-gray-50 rounded">
            <BoltIcon className="h-4 w-4 mx-auto mb-1 text-gray-400" />
            <p className="text-gray-500 text-xs">Max Speed</p>
            <p className="font-medium text-gray-900">{section.max_speed} km/h</p>
          </div>

          <div className="text-center p-2 bg-gray-50 rounded">
            <TrainIcon className="h-4 w-4 mx-auto mb-1 text-gray-400" />
            <p className="text-gray-500 text-xs">Capacity</p>
            <p className="font-medium text-gray-900">{section.max_occupancy}</p>
          </div>

          <div className="text-center p-2 bg-gray-50 rounded">
            <ChartBarIcon className="h-4 w-4 mx-auto mb-1 text-gray-400" />
            <p className="text-gray-500 text-xs">Traffic</p>
            <p className="font-medium text-gray-900">{getTrafficLevel()}</p>
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Occupancy</span>
            <span>{section.current_occupancy}/{section.max_occupancy} ({(utilization * 100).toFixed(0)}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${utilizationColor}`}
              style={{ width: `${Math.min(100, utilization * 100)}%` }}
            />
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-2 mb-4 text-xs">
          {section.track_count && (
            <div className="flex justify-between">
              <span className="text-gray-500">Tracks:</span>
              <span className="font-medium text-gray-900">{section.track_count}</span>
            </div>
          )}
          
          {section.platform_count > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Platforms:</span>
              <span className="font-medium text-gray-900">{section.platform_count}</span>
            </div>
          )}

          {section.electrified !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-500">Electrified:</span>
              <span className="font-medium text-gray-900">{section.electrified ? 'Yes' : 'No'}</span>
            </div>
          )}

          {section.gradient !== undefined && section.gradient !== 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Gradient:</span>
              <span className="font-medium text-gray-900">{section.gradient.toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Status Indicators */}
        <div className="mb-4">
          {section.maintenance_mode && (
            <div className="flex items-center text-xs text-red-600 bg-red-50 px-2 py-1 rounded mb-2">
              <WrenchScrewdriverIcon className="h-3 w-3 mr-1" />
              <span>Under Maintenance</span>
            </div>
          )}
          
          {!section.is_active && (
            <div className="flex items-center text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded mb-2">
              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
              <span>Inactive</span>
            </div>
          )}

          {section.current_occupancy >= section.max_occupancy && !section.maintenance_mode && (
            <div className="flex items-center text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded mb-2">
              <TrainIcon className="h-3 w-3 mr-1" />
              <span>At Capacity</span>
            </div>
          )}
        </div>

        {/* Last Updated */}
        <div className="text-xs text-gray-500 mb-4">
          <div className="flex items-center">
            <ClockIcon className="h-3 w-3 mr-1" />
            <span>Updated: {new Date(section.updated_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
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
              title="Edit section"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleMaintenance();
              }}
              className={`p-1.5 rounded-md transition-colors ${
                section.maintenance_mode 
                  ? 'text-green-600 hover:bg-green-50' 
                  : 'text-orange-600 hover:bg-orange-50'
              }`}
              title={section.maintenance_mode ? 'Exit maintenance' : 'Enter maintenance'}
            >
              <WrenchScrewdriverIcon className="h-4 w-4" />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete section"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="text-xs text-gray-500">
            <span>ID: {section.id}</span>
          </div>
        </div>
      </div>

      {/* Status indicator bar */}
      <div className={`h-1 ${statusColor.split(' ')[1]}`} />
    </motion.div>
  );
};

export default SectionCard;