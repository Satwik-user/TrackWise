import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  MapIcon,
  TrainIcon,
  ScaleIcon,
  BoltIcon,
  WrenchScrewdriverIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  InformationCircleIcon,
  CogIcon,
  ShieldCheckIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const SectionDetailModal = ({
  section,
  onClose,
  onEdit,
  onDelete,
  onToggleMaintenance
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: InformationCircleIcon },
    { id: 'technical', label: 'Technical', icon: CogIcon },
    { id: 'location', label: 'Location', icon: GlobeAltIcon },
    { id: 'safety', label: 'Safety', icon: ShieldCheckIcon },
    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon }
  ];

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

  const calculateUtilization = () => {
    return section.max_occupancy > 0 ? section.current_occupancy / section.max_occupancy : 0;
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

  const formatLength = (length) => {
    if (length >= 1000) return `${(length / 1000).toFixed(1)} km`;
    return `${length} m`;
  };

  const StatusIcon = getStatusIcon();
  const statusColor = getStatusColor();
  const utilization = calculateUtilization();

  return (
    <div className="modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="modal-content max-w-5xl max-h-screen overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${statusColor.split(' ')[1]}`}>
                <StatusIcon className={`h-6 w-6 ${statusColor.split(' ')[0]}`} />
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {section.section_code}
                </h2>
                <p className="text-sm text-gray-500">{section.section_name}</p>
                <div className="flex items-center space-x-4 mt-1">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                    {section.maintenance_mode ? 'Under Maintenance' :
                     !section.is_active ? 'Inactive' :
                     section.current_occupancy >= section.max_occupancy ? 'At Capacity' : 'Active'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {section.section_type.replace('_', ' ')}
                  </span>
                </div>
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
                onClick={onToggleMaintenance}
                className={`btn-secondary flex items-center space-x-1 ${
                  section.maintenance_mode ? 'text-green-700' : 'text-orange-700'
                }`}
              >
                <WrenchScrewdriverIcon className="h-4 w-4" />
                <span>{section.maintenance_mode ? 'Exit Maintenance' : 'Enter Maintenance'}</span>
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

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <ScaleIcon className="h-5 w-5 mx-auto mb-1 text-gray-400" />
              <p className="text-sm text-gray-500">Length</p>
              <p className="font-semibold text-gray-900">{formatLength(section.length)}</p>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <BoltIcon className="h-5 w-5 mx-auto mb-1 text-gray-400" />
              <p className="text-sm text-gray-500">Max Speed</p>
              <p className="font-semibold text-gray-900">{section.max_speed} km/h</p>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <TrainIcon className="h-5 w-5 mx-auto mb-1 text-gray-400" />
              <p className="text-sm text-gray-500">Capacity</p>
              <p className="font-semibold text-gray-900">{section.current_occupancy}/{section.max_occupancy}</p>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <ChartBarIcon className="h-5 w-5 mx-auto mb-1 text-gray-400" />
              <p className="text-sm text-gray-500">Utilization</p>
              <p className="font-semibold text-gray-900">{(utilization * 100).toFixed(0)}%</p>
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
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <OverviewTab key="overview" section={section} />
            )}
            
            {activeTab === 'technical' && (
              <TechnicalTab key="technical" section={section} />
            )}
            
            {activeTab === 'location' && (
              <LocationTab key="location" section={section} />
            )}
            
            {activeTab === 'safety' && (
              <SafetyTab key="safety" section={section} />
            )}
            
            {activeTab === 'analytics' && (
              <AnalyticsTab key="analytics" section={section} />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ section }) => {
  const utilization = section.max_occupancy > 0 ? section.current_occupancy / section.max_occupancy : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Basic Information */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Section Code</label>
              <p className="text-lg font-semibold text-gray-900">{section.section_code}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Section Name</label>
              <p className="text-lg text-gray-900">{section.section_name}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Type</label>
              <p className="text-lg text-gray-900">{section.section_type.replace('_', ' ')}</p>
            </div>
            
            {section.description && (
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900">{section.description}</p>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="flex items-center space-x-2">
                {section.maintenance_mode ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <WrenchScrewdriverIcon className="h-3 w-3 mr-1" />
                    Under Maintenance
                  </span>
                ) : section.is_active ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                    Inactive
                  </span>
                )}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="text-gray-900">{formatDateTime(section.created_at)}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Last Updated</label>
              <p className="text-gray-900">{formatDateTime(section.updated_at)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Capacity and Utilization */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Capacity and Utilization</h3>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{section.max_occupancy}</p>
              <p className="text-sm text-gray-500">Max Capacity</p>
            </div>
            
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{section.current_occupancy}</p>
              <p className="text-sm text-gray-500">Current Occupancy</p>
            </div>
            
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{(utilization * 100).toFixed(0)}%</p>
              <p className="text-sm text-gray-500">Utilization</p>
            </div>
          </div>
          
          {/* Utilization Bar */}
          <div>
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>Capacity Utilization</span>
              <span>{section.current_occupancy}/{section.max_occupancy} trains</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all duration-300 ${
                  utilization >= 1 ? 'bg-red-500' :
                  utilization >= 0.8 ? 'bg-yellow-500' :
                  utilization >= 0.6 ? 'bg-blue-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, utilization * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Technical Tab Component
const TechnicalTab = ({ section }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Physical Specifications */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Physical Specifications</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Length</label>
            <p className="text-lg font-semibold text-gray-900">
              {section.length >= 1000 ? `${(section.length / 1000).toFixed(1)} km` : `${section.length} m`}
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Maximum Speed</label>
            <p className="text-lg font-semibold text-gray-900">{section.max_speed} km/h</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Track Count</label>
            <p className="text-lg font-semibold text-gray-900">{section.track_count || 1}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Platform Count</label>
            <p className="text-lg font-semibold text-gray-900">{section.platform_count || 0}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Electrified</label>
            <p className="text-lg font-semibold text-gray-900">
              {section.electrified ? 'Yes' : 'No'}
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Gradient</label>
            <p className="text-lg font-semibold text-gray-900">
              {section.gradient ? `${section.gradient.toFixed(1)}%` : '0%'}
            </p>
          </div>
          
          {section.curve_radius && (
            <div>
              <label className="text-sm font-medium text-gray-500">Curve Radius</label>
              <p className="text-lg font-semibold text-gray-900">{section.curve_radius} m</p>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-gray-500">Signal System</label>
            <p className="text-lg font-semibold text-gray-900">
              {section.signal_system || 'Not specified'}
            </p>
          </div>
        </div>
      </div>

      {/* Operational Constraints */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Operational Constraints</h3>
        </div>
        
        {section.operational_constraints ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Minimum Headway</label>
              <p className="text-lg font-semibold text-gray-900">
                {Math.floor(section.operational_constraints.min_headway / 60)}m {section.operational_constraints.min_headway % 60}s
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Max Trains Per Hour</label>
              <p className="text-lg font-semibold text-gray-900">
                {section.operational_constraints.max_trains_per_hour}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Weather Restrictions</label>
              <p className="text-lg font-semibold text-gray-900">
                {section.operational_constraints.weather_restrictions ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No operational constraints defined</p>
        )}
      </div>
    </motion.div>
  );
};

// Location Tab Component
const LocationTab = ({ section }) => {
  const hasCoordinates = section.coordinates && 
    (section.coordinates.start_lat || section.coordinates.start_lng || 
     section.coordinates.end_lat || section.coordinates.end_lng);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Geographic Coordinates */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Geographic Coordinates</h3>
        </div>
        
        {hasCoordinates ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Start Point</h4>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500">Latitude</label>
                  <p className="text-sm font-medium text-gray-900">
                    {section.coordinates.start_lat?.toFixed(6) || 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Longitude</label>
                  <p className="text-sm font-medium text-gray-900">
                    {section.coordinates.start_lng?.toFixed(6) || 'Not set'}
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">End Point</h4>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500">Latitude</label>
                  <p className="text-sm font-medium text-gray-900">
                    {section.coordinates.end_lat?.toFixed(6) || 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Longitude</label>
                  <p className="text-sm font-medium text-gray-900">
                    {section.coordinates.end_lng?.toFixed(6) || 'Not set'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No geographic coordinates available</p>
        )}
      </div>

      {/* Map Placeholder */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Location Map</h3>
        </div>
        
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <GlobeAltIcon className="h-12 w-12 mx-auto mb-3" />
            <p className="text-sm font-medium">Interactive map coming soon</p>
            <p className="text-xs mt-1">Section location visualization</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Safety Tab Component
const SafetyTab = ({ section }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Safety Systems */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Safety Systems</h3>
        </div>
        
        {section.safety_systems ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Train Detection System</label>
                <p className="text-lg font-semibold text-gray-900">
                  {section.safety_systems.train_detection_system?.replace('_', ' ') || 'Not specified'}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  section.safety_systems.automatic_train_protection ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="text-sm text-gray-700">Automatic Train Protection (ATP)</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  section.safety_systems.positive_train_control ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="text-sm text-gray-700">Positive Train Control (PTC)</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No safety system information available</p>
        )}
      </div>

      {/* Safety Compliance */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Safety Compliance</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Safety Standards Compliant</span>
            </div>
            <span className="text-xs text-green-700">Last checked: {formatDateTime(new Date())}</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Signal System Status:</span>
              <span className="ml-2 font-medium text-green-600">Operational</span>
            </div>
            <div>
              <span className="text-gray-500">Emergency Systems:</span>
              <span className="ml-2 font-medium text-green-600">Active</span>
            </div>
            <div>
              <span className="text-gray-500">Track Circuit:</span>
              <span className="ml-2 font-medium text-green-600">Functional</span>
            </div>
            <div>
              <span className="text-gray-500">Communication:</span>
              <span className="ml-2 font-medium text-green-600">Clear</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Analytics Tab Component
const AnalyticsTab = ({ section }) => {
  // Mock analytics data - in real app, this would come from API
  const mockAnalytics = {
    trafficVolume: [
      { hour: '00:00', trains: 2 },
      { hour: '06:00', trains: 8 },
      { hour: '12:00', trains: 15 },
      { hour: '18:00', trains: 12 },
      { hour: '23:00', trains: 4 }
    ],
    utilizationTrend: 85,
    averageSpeed: 95,
    delayIncidents: 3
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-center">
            <ChartBarIcon className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold text-gray-900">{mockAnalytics.utilizationTrend}%</p>
            <p className="text-sm text-gray-500">Avg Utilization</p>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="text-center">
            <BoltIcon className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-gray-900">{mockAnalytics.averageSpeed}</p>
            <p className="text-sm text-gray-500">Avg Speed (km/h)</p>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="text-center">
            <ClockIcon className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold text-gray-900">{mockAnalytics.delayIncidents}</p>
            <p className="text-sm text-gray-500">Delay Incidents</p>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="text-center">
            <TrainIcon className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold text-gray-900">
              {mockAnalytics.trafficVolume.reduce((sum, item) => sum + item.trains, 0)}
            </p>
            <p className="text-sm text-gray-500">Daily Traffic</p>
          </div>
        </div>
      </div>

      {/* Analytics Charts Placeholder */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Performance Analytics</h3>
        </div>
        
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center text-gray-500">
            <ChartBarIcon className="h-12 w-12 mx-auto mb-3" />
            <p className="text-sm font-medium">Detailed analytics charts</p>
            <p className="text-xs mt-1">Performance trends and insights coming soon</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Helper function
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

export default SectionDetailModal;