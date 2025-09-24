import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  BoltIcon,
  ChartBarIcon,
  EyeIcon,
  CogIcon
} from '@heroicons/react/24/outline';

const SectionStatusPanel = ({
  sections,
  selectedSection,
  onSectionSelect,
  trains
}) => {
  const [sortBy, setSortBy] = useState('section_code');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'available', 'busy', 'maintenance'

  // Calculate trains per section
  const trainsPerSection = useMemo(() => {
    const trainCounts = {};
    trains.forEach(train => {
      if (train.current_section_id) {
        trainCounts[train.current_section_id] = (trainCounts[train.current_section_id] || 0) + 1;
      }
    });
    return trainCounts;
  }, [trains]);

  // Filter and sort sections
  const filteredSections = useMemo(() => {
    let filtered = [...sections];

    // Apply filters
    if (filterBy !== 'all') {
      filtered = filtered.filter(section => {
        switch (filterBy) {
          case 'available':
            return section.is_active && !section.maintenance_mode && section.current_occupancy < section.max_occupancy;
          case 'busy':
            return section.current_occupancy >= section.max_occupancy;
          case 'maintenance':
            return section.maintenance_mode;
          default:
            return true;
        }
      });
    }

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
  }, [sections, sortBy, sortOrder, filterBy]);

  const getSectionStatusIcon = (section) => {
    if (section.maintenance_mode) return WrenchScrewdriverIcon;
    if (!section.is_active) return ExclamationTriangleIcon;
    if (section.current_occupancy >= section.max_occupancy) return TruckIcon;
    return CheckCircleIcon;
  };

  const getSectionStatusColor = (section) => {
    if (section.maintenance_mode) return 'text-red-600 bg-red-100';
    if (!section.is_active) return 'text-gray-600 bg-gray-100';
    if (section.current_occupancy >= section.max_occupancy) return 'text-yellow-600 bg-yellow-100';
    
    const utilization = section.current_occupancy / section.max_occupancy;
    if (utilization >= 0.8) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  const getUtilizationColor = (utilization) => {
    if (utilization >= 1) return 'bg-red-500';
    if (utilization >= 0.8) return 'bg-yellow-500';
    if (utilization >= 0.6) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const calculateUtilization = (section) => {
    return section.max_occupancy > 0 ? section.current_occupancy / section.max_occupancy : 0;
  };

  const getTrainsInSection = (sectionId) => {
    return trains.filter(train => train.current_section_id === sectionId);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <MapIcon className="h-5 w-5 mr-2" />
            Sections ({filteredSections.length})
          </h2>
        </div>

        {/* Filter Controls */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
            >
              <option value="all">All Sections</option>
              <option value="available">Available</option>
              <option value="busy">At Capacity</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="section_code">Code</option>
              <option value="current_occupancy">Occupancy</option>
              <option value="max_speed">Max Speed</option>
              <option value="length">Length</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Section List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSections.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MapIcon className="h-12 w-12 mx-auto mb-3" />
            <p className="text-sm font-medium">No sections found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredSections.map((section, index) => (
              <SectionItem
                key={section.id}
                section={section}
                isSelected={selectedSection?.id === section.id}
                onClick={() => onSectionSelect(section)}
                trains={getTrainsInSection(section.id)}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {sections.filter(s => s.is_active && !s.maintenance_mode && s.current_occupancy < s.max_occupancy).length}
            </div>
            <div className="text-xs text-gray-500">Available</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {sections.filter(s => s.current_occupancy >= s.max_occupancy).length}
            </div>
            <div className="text-xs text-gray-500">At Capacity</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {sections.filter(s => s.maintenance_mode).length}
            </div>
            <div className="text-xs text-gray-500">Maintenance</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {sections.filter(s => !s.is_active).length}
            </div>
            <div className="text-xs text-gray-500">Inactive</div>
          </div>
        </div>
        
        {/* Overall Utilization */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>System Utilization</span>
            <span>
              {((sections.reduce((sum, s) => sum + s.current_occupancy, 0) / 
                 sections.reduce((sum, s) => sum + s.max_occupancy, 1)) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(sections.reduce((sum, s) => sum + s.current_occupancy, 0) / 
                          sections.reduce((sum, s) => sum + s.max_occupancy, 1)) * 100}%`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Section Item Component
const SectionItem = ({ section, isSelected, onClick, trains, index }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const StatusIcon = getSectionStatusIcon(section);
  const statusColor = getSectionStatusColor(section);
  const utilization = calculateUtilization(section);
  const utilizationColor = getUtilizationColor(utilization);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className={`transition-all duration-200 ${
        isSelected ? 'bg-blue-50 border-r-4 border-blue-500' : 'hover:bg-gray-50'
      }`}
    >
      {/* Main Section Info */}
      <div
        className="p-4 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className={`p-1.5 rounded-full ${statusColor.split(' ')[1]}`}>
              <StatusIcon className={`h-4 w-4 ${statusColor.split(' ')[0]}`} />
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {section.section_code}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {section.section_name}
              </p>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Utilization Bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Occupancy: {section.current_occupancy}/{section.max_occupancy}</span>
            <span>{(utilization * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${utilizationColor}`}
              style={{ width: `${Math.min(100, utilization * 100)}%` }}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-gray-500">Length</div>
            <div className="font-medium">{section.length}m</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">Max Speed</div>
            <div className="font-medium">{section.max_speed} km/h</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">Trains</div>
            <div className="font-medium">{trains.length}</div>
          </div>
        </div>

        {/* Status Indicators */}
        {(section.maintenance_mode || !section.is_active) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {section.maintenance_mode && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">
                <WrenchScrewdriverIcon className="h-3 w-3 mr-1" />
                Maintenance
              </span>
            )}
            {!section.is_active && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                Inactive
              </span>
            )}
          </div>
        )}
      </div>

      {/* Detailed Information */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 bg-gray-50"
          >
            <div className="p-4 space-y-3">
              {/* Technical Details */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-2">Technical Specifications</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Track Count:</span>
                    <span className="ml-1 font-medium">{section.track_count || 1}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Gradient:</span>
                    <span className="ml-1 font-medium">{section.gradient || 0}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Electrified:</span>
                    <span className="ml-1 font-medium">{section.electrified ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Platform Count:</span>
                    <span className="ml-1 font-medium">{section.platform_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* Trains in Section */}
              {trains.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-2">
                    Trains in Section ({trains.length})
                  </h4>
                  <div className="space-y-1">
                    {trains.slice(0, 3).map(train => (
                      <div key={train.id} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-900">
                          {train.train_number}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className={`px-1.5 py-0.5 rounded-full ${getStatusColor(train.status)}`}>
                            {train.status}
                          </span>
                          <span className="text-gray-500">
                            {train.current_speed?.toFixed(0) || 0} km/h
                          </span>
                        </div>
                      </div>
                    ))}
                    {trains.length > 3 && (
                      <div className="text-xs text-gray-500 text-center pt-1">
                        +{trains.length - 3} more trains
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Performance Metrics */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-2">Performance</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Typical Transit:</span>
                    <span className="ml-1 font-medium">
                      {Math.round((section.typical_transit_time || 300) / 60)} min
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Hourly Capacity:</span>
                    <span className="ml-1 font-medium">
                      {section.hourly_capacity || 12} trains
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Helper functions
const getSectionStatusIcon = (section) => {
  if (section.maintenance_mode) return WrenchScrewdriverIcon;
  if (!section.is_active) return ExclamationTriangleIcon;
  if (section.current_occupancy >= section.max_occupancy) return TruckIcon;
  return CheckCircleIcon;
};

const getSectionStatusColor = (section) => {
  if (section.maintenance_mode) return 'text-red-600 bg-red-100';
  if (!section.is_active) return 'text-gray-600 bg-gray-100';
  if (section.current_occupancy >= section.max_occupancy) return 'text-yellow-600 bg-yellow-100';
  
  const utilization = section.current_occupancy / section.max_occupancy;
  if (utilization >= 0.8) return 'text-orange-600 bg-orange-100';
  return 'text-green-600 bg-green-100';
};

const getUtilizationColor = (utilization) => {
  if (utilization >= 1) return 'bg-red-500';
  if (utilization >= 0.8) return 'bg-yellow-500';
  if (utilization >= 0.6) return 'bg-blue-500';
  return 'bg-green-500';
};

const calculateUtilization = (section) => {
  return section.max_occupancy > 0 ? section.current_occupancy / section.max_occupancy : 0;
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

export default SectionStatusPanel;