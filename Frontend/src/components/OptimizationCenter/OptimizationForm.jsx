import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CpuChipIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  TrainIcon,
  MapIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlayIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const OptimizationForm = ({
  onSubmit,
  isOptimizing,
  trains,
  sections,
  showAdvanced = false
}) => {
  const [formData, setFormData] = useState({
    scenario_name: '',
    optimization_type: 'REAL_TIME',
    train_ids: [],
    section_ids: [],
    time_horizon: 1800, // 30 minutes
    objective_weights: {
      delay: 0.6,
      throughput: 0.4,
      energy: 0.0,
      safety: 0.0
    },
    constraints: {
      max_delay: 900, // 15 minutes
      min_separation: 300, // 5 minutes
      speed_limits: true,
      capacity_limits: true
    },
    solver_settings: {
      timeout: 30,
      gap_tolerance: 0.01,
      use_ml_predictions: true,
      heuristic_mode: false
    },
    scenario_parameters: {
      weather_conditions: 'NORMAL',
      traffic_density: 'MEDIUM',
      emergency_mode: false
    }
  });

  const [errors, setErrors] = useState({});
  const [selectedTrains, setSelectedTrains] = useState([]);
  const [selectedSections, setSelectedSections] = useState([]);

  // Auto-generate scenario name
  useEffect(() => {
    if (!formData.scenario_name) {
      const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      setFormData(prev => ({
        ...prev,
        scenario_name: `${prev.optimization_type.replace('_', ' ')} Optimization - ${timestamp}`
      }));
    }
  }, [formData.optimization_type]);

  // Update selected trains and sections
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      train_ids: selectedTrains.map(t => t.id),
      section_ids: selectedSections.map(s => s.id)
    }));
  }, [selectedTrains, selectedSections]);

  const optimizationTypes = [
    {
      value: 'REAL_TIME',
      label: 'Real-time Optimization',
      description: 'Immediate optimization for current conditions',
      timeHorizon: 1800,
      icon: '⚡'
    },
    {
      value: 'STRATEGIC',
      label: 'Strategic Planning',
      description: 'Long-term optimization planning',
      timeHorizon: 7200,
      icon: '📋'
    },
    {
      value: 'EMERGENCY',
      label: 'Emergency Response',
      description: 'Emergency situation optimization',
      timeHorizon: 900,
      icon: '🚨'
    },
    {
      value: 'PREDICTIVE',
      label: 'Predictive Optimization',
      description: 'AI-powered predictive optimization',
      timeHorizon: 3600,
      icon: '🤖'
    }
  ];

  const weatherConditions = [
    { value: 'NORMAL', label: 'Normal', factor: 1.0 },
    { value: 'LIGHT_RAIN', label: 'Light Rain', factor: 0.9 },
    { value: 'HEAVY_RAIN', label: 'Heavy Rain', factor: 0.7 },
    { value: 'FOG', label: 'Fog', factor: 0.6 },
    { value: 'STORM', label: 'Storm', factor: 0.5 },
    { value: 'SNOW', label: 'Snow', factor: 0.4 }
  ];

  const trafficDensities = [
    { value: 'LOW', label: 'Low Density', description: '< 40% capacity' },
    { value: 'MEDIUM', label: 'Medium Density', description: '40-70% capacity' },
    { value: 'HIGH', label: 'High Density', description: '70-90% capacity' },
    { value: 'PEAK', label: 'Peak Traffic', description: '> 90% capacity' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleNestedInputChange = (category, field, value) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleOptimizationTypeChange = (type) => {
    const selectedType = optimizationTypes.find(t => t.value === type);
    setFormData(prev => ({
      ...prev,
      optimization_type: type,
      time_horizon: selectedType.timeHorizon
    }));
  };

  const handleTrainSelection = (train, selected) => {
    if (selected) {
      setSelectedTrains(prev => [...prev, train]);
    } else {
      setSelectedTrains(prev => prev.filter(t => t.id !== train.id));
    }
  };

  const handleSectionSelection = (section, selected) => {
    if (selected) {
      setSelectedSections(prev => [...prev, section]);
    } else {
      setSelectedSections(prev => prev.filter(s => s.id !== section.id));
    }
  };

  const selectAllTrains = (filterFn = null) => {
    const trainsToSelect = filterFn ? trains.filter(filterFn) : trains;
    setSelectedTrains(trainsToSelect);
  };

  const selectAllSections = (filterFn = null) => {
    const sectionsToSelect = filterFn ? sections.filter(filterFn) : sections;
    setSelectedSections(sectionsToSelect);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.scenario_name.trim()) {
      newErrors.scenario_name = 'Scenario name is required';
    }

    if (selectedTrains.length === 0) {
      newErrors.trains = 'At least one train must be selected';
    }

    if (selectedSections.length === 0) {
      newErrors.sections = 'At least one section must be selected';
    }

    if (formData.time_horizon < 300 || formData.time_horizon > 14400) {
      newErrors.time_horizon = 'Time horizon must be between 5 minutes and 4 hours';
    }

    // Validate objective weights sum to 1
    const weightSum = Object.values(formData.objective_weights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(weightSum - 1.0) > 0.01) {
      newErrors.objective_weights = 'Objective weights must sum to 1.0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const formatTimeHorizon = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Scenario Configuration */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Cog6ToothIcon className="h-5 w-5 mr-2" />
              Scenario Configuration
            </h3>
          </div>

          <div className="space-y-4">
            {/* Scenario Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scenario Name *
              </label>
              <input
                type="text"
                value={formData.scenario_name}
                onChange={(e) => handleInputChange('scenario_name', e.target.value)}
                placeholder="Enter scenario name"
                className={`input-field ${errors.scenario_name ? 'border-red-500' : ''}`}
              />
              {errors.scenario_name && (
                <p className="mt-1 text-sm text-red-600">{errors.scenario_name}</p>
              )}
            </div>

            {/* Optimization Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Optimization Type *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {optimizationTypes.map((type) => (
                  <div
                    key={type.value}
                    onClick={() => handleOptimizationTypeChange(type.value)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                      formData.optimization_type === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{type.icon}</span>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {type.label}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {type.description}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Horizon: {formatTimeHorizon(type.timeHorizon)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Horizon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Horizon: {formatTimeHorizon(formData.time_horizon)}
              </label>
              <input
                type="range"
                min="300"
                max="14400"
                step="300"
                value={formData.time_horizon}
                onChange={(e) => handleInputChange('time_horizon', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5 min</span>
                <span>2 hours</span>
                <span>4 hours</span>
              </div>
              {errors.time_horizon && (
                <p className="mt-1 text-sm text-red-600">{errors.time_horizon}</p>
              )}
            </div>
          </div>
        </div>

        {/* Train and Section Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Train Selection */}
          <TrainSelectionPanel
            trains={trains}
            selectedTrains={selectedTrains}
            onTrainSelection={handleTrainSelection}
            onSelectAll={selectAllTrains}
            error={errors.trains}
          />

          {/* Section Selection */}
          <SectionSelectionPanel
            sections={sections}
            selectedSections={selectedSections}
            onSectionSelection={handleSectionSelection}
            onSelectAll={selectAllSections}
            error={errors.sections}
          />
        </div>

        {/* Objective Weights */}
        <ObjectiveWeightsPanel
          weights={formData.objective_weights}
          onChange={(weights) => handleInputChange('objective_weights', weights)}
          error={errors.objective_weights}
        />

        {/* Advanced Settings */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <AdvancedSettingsPanel
                constraints={formData.constraints}
                solverSettings={formData.solver_settings}
                scenarioParameters={formData.scenario_parameters}
                onConstraintsChange={(constraints) => handleInputChange('constraints', constraints)}
                onSolverSettingsChange={(settings) => handleInputChange('solver_settings', settings)}
                onScenarioParametersChange={(params) => handleInputChange('scenario_parameters', params)}
                weatherConditions={weatherConditions}
                trafficDensities={trafficDensities}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {selectedTrains.length} trains, {selectedSections.length} sections selected
          </div>
          
          <button
            type="submit"
            disabled={isOptimizing}
            className="btn-primary flex items-center space-x-2 px-8 py-3"
          >
            {isOptimizing ? (
              <>
                <div className="loading-spinner" />
                <span>Optimizing...</span>
              </>
            ) : (
              <>
                <PlayIcon className="h-5 w-5" />
                <span>Run Optimization</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// Train Selection Panel Component
const TrainSelectionPanel = ({
  trains,
  selectedTrains,
  onTrainSelection,
  onSelectAll,
  error
}) => {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTrains = trains.filter(train => {
    // Apply status filter
    if (filter !== 'all' && train.status !== filter) {
      return false;
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return train.train_number.toLowerCase().includes(query) ||
             train.train_name.toLowerCase().includes(query);
    }
    
    return true;
  });

  const isTrainSelected = (train) => {
    return selectedTrains.some(t => t.id === train.id);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <TrainIcon className="h-5 w-5 mr-2" />
            Select Trains
          </h3>
          <span className="text-sm text-gray-500">
            {selectedTrains.length}/{trains.length} selected
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Search and Filter */}
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Search trains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field flex-1"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Status</option>
            <option value="RUNNING">Running</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="STOPPED">Stopped</option>
          </select>
        </div>

        {/* Quick Selection Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSelectAll()}
            className="btn-secondary text-xs"
          >
            All Trains
          </button>
          <button
            type="button"
            onClick={() => onSelectAll(t => t.status === 'RUNNING')}
            className="btn-secondary text-xs"
          >
            Running Only
          </button>
          <button
            type="button"
            onClick={() => onSelectAll(t => t.train_type === 'EXPRESS')}
            className="btn-secondary text-xs"
          >
            Express Only
          </button>
          <button
            type="button"
            onClick={() => onSelectAll(t => t.priority <= 2)}
            className="btn-secondary text-xs"
          >
            High Priority
          </button>
        </div>

        {/* Train List */}
        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
          {filteredTrains.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No trains found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTrains.map((train) => (
                <div key={train.id} className="p-3 hover:bg-gray-50">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTrainSelected(train)}
                      onChange={(e) => onTrainSelection(train, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {train.train_number}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          train.status === 'RUNNING' ? 'bg-green-100 text-green-800' :
                          train.status === 'DELAYED' ? 'bg-red-100 text-red-800' :
                          train.status === 'STOPPED' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {train.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {train.train_name} • {train.train_type} • Priority {train.priority}
                      </p>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 flex items-center">
            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

// Section Selection Panel Component
const SectionSelectionPanel = ({
  sections,
  selectedSections,
  onSectionSelection,
  onSelectAll,
  error
}) => {
  const [filter, setFilter] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = sections.filter(section => {
    // Apply status filter
    if (filter === 'active' && (!section.is_active || section.maintenance_mode)) {
      return false;
    }
    if (filter === 'maintenance' && !section.maintenance_mode) {
      return false;
    }
    if (filter === 'available' && section.current_occupancy >= section.max_occupancy) {
      return false;
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return section.section_code.toLowerCase().includes(query) ||
             section.section_name.toLowerCase().includes(query);
    }
    
    return true;
  });

  const isSectionSelected = (section) => {
    return selectedSections.some(s => s.id === section.id);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <MapIcon className="h-5 w-5 mr-2" />
            Select Sections
          </h3>
          <span className="text-sm text-gray-500">
            {selectedSections.length}/{sections.length} selected
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Search and Filter */}
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Search sections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field flex-1"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Sections</option>
            <option value="active">Active Only</option>
            <option value="available">Available</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        {/* Quick Selection Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSelectAll()}
            className="btn-secondary text-xs"
          >
            All Sections
          </button>
          <button
            type="button"
            onClick={() => onSelectAll(s => s.is_active && !s.maintenance_mode)}
            className="btn-secondary text-xs"
          >
            Active Only
          </button>
          <button
            type="button"
            onClick={() => onSelectAll(s => s.current_occupancy < s.max_occupancy)}
            className="btn-secondary text-xs"
          >
            Available
          </button>
          <button
            type="button"
            onClick={() => onSelectAll(s => s.section_type === 'MAIN_LINE')}
            className="btn-secondary text-xs"
          >
            Main Lines
          </button>
        </div>

        {/* Section List */}
        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
          {filteredSections.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No sections found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredSections.map((section) => (
                <div key={section.id} className="p-3 hover:bg-gray-50">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSectionSelected(section)}
                      onChange={(e) => onSectionSelection(section, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {section.section_code}
                        </p>
                        <div className="flex items-center space-x-1">
                          <span className={`w-2 h-2 rounded-full ${
                            section.maintenance_mode ? 'bg-red-500' :
                            !section.is_active ? 'bg-gray-500' :
                            section.current_occupancy >= section.max_occupancy ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`} />
                          <span className="text-xs text-gray-500">
                            {section.current_occupancy}/{section.max_occupancy}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {section.section_name} • {section.length}m • {section.max_speed} km/h
                      </p>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 flex items-center">
            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

// Objective Weights Panel Component
const ObjectiveWeightsPanel = ({ weights, onChange, error }) => {
  const objectives = [
    {
      key: 'delay',
      label: 'Delay Minimization',
      description: 'Reduce train delays and improve punctuality',
      icon: '⏱️'
    },
    {
      key: 'throughput',
      label: 'Throughput Maximization',
      description: 'Maximize number of trains processed',
      icon: '🚄'
    },
    {
      key: 'energy',
      label: 'Energy Efficiency',
      description: 'Minimize energy consumption',
      icon: '⚡'
    },
    {
      key: 'safety',
      label: 'Safety Optimization',
      description: 'Maximize safety margins and reduce risks',
      icon: '🛡️'
    }
  ];

  const handleWeightChange = (key, value) => {
    const newWeights = { ...weights, [key]: parseFloat(value) || 0 };
    onChange(newWeights);
  };

  const normalizeWeights = () => {
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    if (total > 0) {
      const normalizedWeights = {};
      Object.keys(weights).forEach(key => {
        normalizedWeights[key] = weights[key] / total;
      });
      onChange(normalizedWeights);
    }
  };

  const setPreset = (preset) => {
    const presets = {
      balanced: { delay: 0.4, throughput: 0.4, energy: 0.1, safety: 0.1 },
      punctuality: { delay: 0.7, throughput: 0.2, energy: 0.05, safety: 0.05 },
      efficiency: { delay: 0.2, throughput: 0.5, energy: 0.2, safety: 0.1 },
      safety: { delay: 0.3, throughput: 0.2, energy: 0.1, safety: 0.4 }
    };
    onChange(presets[preset]);
  };

  const weightSum = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Optimization Objectives
          </h3>
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium ${
              Math.abs(weightSum - 1.0) < 0.01 ? 'text-green-600' : 'text-red-600'
            }`}>
              Sum: {weightSum.toFixed(2)}
            </span>
            <button
              type="button"
              onClick={normalizeWeights}
              className="btn-secondary text-xs"
            >
              Normalize
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Preset Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPreset('balanced')}
            className="btn-secondary text-xs"
          >
            Balanced
          </button>
          <button
            type="button"
            onClick={() => setPreset('punctuality')}
            className="btn-secondary text-xs"
          >
            Punctuality Focus
          </button>
          <button
            type="button"
            onClick={() => setPreset('efficiency')}
            className="btn-secondary text-xs"
          >
            Efficiency Focus
          </button>
          <button
            type="button"
            onClick={() => setPreset('safety')}
            className="btn-secondary text-xs"
          >
            Safety Focus
          </button>
        </div>

        {/* Weight Sliders */}
        <div className="space-y-4">
          {objectives.map((objective) => (
            <div key={objective.key}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <span className="mr-2">{objective.icon}</span>
                  {objective.label}
                </label>
                <span className="text-sm text-gray-600">
                  {(weights[objective.key] * 100).toFixed(0)}%
                </span>
              </div>
              
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights[objective.key]}
                onChange={(e) => handleWeightChange(objective.key, e.target.value)}
                className="w-full"
              />
              
              <p className="text-xs text-gray-500 mt-1">
                {objective.description}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-600 flex items-center">
            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

// Advanced Settings Panel Component
const AdvancedSettingsPanel = ({
  constraints,
  solverSettings,
  scenarioParameters,
  onConstraintsChange,
  onSolverSettingsChange,
  onScenarioParametersChange,
  weatherConditions,
  trafficDensities
}) => {
  return (
    <div className="space-y-6">
      {/* Constraints */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
            Constraints
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Delay (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="120"
              value={constraints.max_delay / 60}
              onChange={(e) => onConstraintsChange({
                ...constraints,
                max_delay: parseInt(e.target.value) * 60
              })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Separation (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={constraints.min_separation / 60}
              onChange={(e) => onConstraintsChange({
                ...constraints,
                min_separation: parseInt(e.target.value) * 60
              })}
              className="input-field"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="speed_limits"
              checked={constraints.speed_limits}
              onChange={(e) => onConstraintsChange({
                ...constraints,
                speed_limits: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="speed_limits" className="text-sm text-gray-700">
              Enforce Speed Limits
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="capacity_limits"
              checked={constraints.capacity_limits}
              onChange={(e) => onConstraintsChange({
                ...constraints,
                capacity_limits: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="capacity_limits" className="text-sm text-gray-700">
              Enforce Capacity Limits
            </label>
          </div>
        </div>
      </div>

      {/* Solver Settings */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <CpuChipIcon className="h-5 w-5 mr-2" />
            Solver Settings
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeout (seconds)
            </label>
            <input
              type="number"
              min="5"
              max="300"
              value={solverSettings.timeout}
              onChange={(e) => onSolverSettingsChange({
                ...solverSettings,
                timeout: parseInt(e.target.value)
              })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gap Tolerance
            </label>
            <input
              type="number"
              min="0.001"
              max="0.1"
              step="0.001"
              value={solverSettings.gap_tolerance}
              onChange={(e) => onSolverSettingsChange({
                ...solverSettings,
                gap_tolerance: parseFloat(e.target.value)
              })}
              className="input-field"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="use_ml_predictions"
              checked={solverSettings.use_ml_predictions}
              onChange={(e) => onSolverSettingsChange({
                ...solverSettings,
                use_ml_predictions: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="use_ml_predictions" className="text-sm text-gray-700">
              Use ML Predictions
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="heuristic_mode"
              checked={solverSettings.heuristic_mode}
              onChange={(e) => onSolverSettingsChange({
                ...solverSettings,
                heuristic_mode: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="heuristic_mode" className="text-sm text-gray-700">
              Heuristic Mode (Faster)
            </label>
          </div>
        </div>
      </div>

      {/* Scenario Parameters */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2" />
            Scenario Parameters
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weather Conditions
            </label>
            <select
              value={scenarioParameters.weather_conditions}
              onChange={(e) => onScenarioParametersChange({
                ...scenarioParameters,
                weather_conditions: e.target.value
              })}
              className="input-field"
            >
              {weatherConditions.map((condition) => (
                <option key={condition.value} value={condition.value}>
                  {condition.label} (Factor: {condition.factor})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Traffic Density
            </label>
            <select
              value={scenarioParameters.traffic_density}
              onChange={(e) => onScenarioParametersChange({
                ...scenarioParameters,
                traffic_density: e.target.value
              })}
              className="input-field"
            >
              {trafficDensities.map((density) => (
                <option key={density.value} value={density.value}>
                  {density.label} ({density.description})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 md:col-span-2">
            <input
              type="checkbox"
              id="emergency_mode"
              checked={scenarioParameters.emergency_mode}
              onChange={(e) => onScenarioParametersChange({
                ...scenarioParameters,
                emergency_mode: e.target.checked
              })}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <label htmlFor="emergency_mode" className="text-sm text-gray-700 flex items-center">
              <ExclamationTriangleIcon className="h-4 w-4 mr-1 text-red-500" />
              Emergency Mode (Priority Override)
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationForm;