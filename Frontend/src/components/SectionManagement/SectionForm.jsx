import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  MapIcon,
  ScaleIcon,
  BoltIcon,
  TrainIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

const SectionForm = ({ section, onSave, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    section_code: '',
    section_name: '',
    section_type: 'MAIN_LINE',
    length: 1000,
    max_speed: 120,
    max_occupancy: 1,
    current_occupancy: 0,
    is_active: true,
    maintenance_mode: false,
    track_count: 1,
    platform_count: 0,
    electrified: true,
    gradient: 0,
    curve_radius: null,
    signal_system: 'AUTOMATIC',
    description: '',
    coordinates: {
      start_lat: null,
      start_lng: null,
      end_lat: null,
      end_lng: null
    },
    operational_constraints: {
      min_headway: 120,
      max_trains_per_hour: 30,
      weather_restrictions: false,
      speed_restrictions: []
    },
    safety_systems: {
      automatic_train_protection: true,
      positive_train_control: false,
      train_detection_system: 'TRACK_CIRCUIT'
    }
  });

  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Initialize form data when section prop changes
  useEffect(() => {
    if (section) {
      setFormData({
        section_code: section.section_code || '',
        section_name: section.section_name || '',
        section_type: section.section_type || 'MAIN_LINE',
        length: section.length || 1000,
        max_speed: section.max_speed || 120,
        max_occupancy: section.max_occupancy || 1,
        current_occupancy: section.current_occupancy || 0,
        is_active: section.is_active !== undefined ? section.is_active : true,
        maintenance_mode: section.maintenance_mode !== undefined ? section.maintenance_mode : false,
        track_count: section.track_count || 1,
        platform_count: section.platform_count || 0,
        electrified: section.electrified !== undefined ? section.electrified : true,
        gradient: section.gradient || 0,
        curve_radius: section.curve_radius || null,
        signal_system: section.signal_system || 'AUTOMATIC',
        description: section.description || '',
        coordinates: section.coordinates || {
          start_lat: null,
          start_lng: null,
          end_lat: null,
          end_lng: null
        },
        operational_constraints: section.operational_constraints || {
          min_headway: 120,
          max_trains_per_hour: 30,
          weather_restrictions: false,
          speed_restrictions: []
        },
        safety_systems: section.safety_systems || {
          automatic_train_protection: true,
          positive_train_control: false,
          train_detection_system: 'TRACK_CIRCUIT'
        }
      });
    }
  }, [section]);

  const sectionTypes = [
    { value: 'MAIN_LINE', label: 'Main Line', description: 'Primary railway corridor' },
    { value: 'BRANCH_LINE', label: 'Branch Line', description: 'Secondary railway line' },
    { value: 'SIDING', label: 'Siding', description: 'Side track for passing or storage' },
    { value: 'YARD', label: 'Yard', description: 'Classification or storage yard' },
    { value: 'DEPOT', label: 'Depot', description: 'Maintenance and storage facility' },
    { value: 'JUNCTION', label: 'Junction', description: 'Track convergence point' },
    { value: 'STATION', label: 'Station', description: 'Passenger or freight station' },
    { value: 'TERMINAL', label: 'Terminal', description: 'End-of-line facility' }
  ];

  const signalSystems = [
    { value: 'MANUAL', label: 'Manual' },
    { value: 'AUTOMATIC', label: 'Automatic Block Signaling' },
    { value: 'CTC', label: 'Centralized Traffic Control' },
    { value: 'PTC', label: 'Positive Train Control' },
    { value: 'ETCS', label: 'European Train Control System' }
  ];

  const detectionSystems = [
    { value: 'TRACK_CIRCUIT', label: 'Track Circuit' },
    { value: 'AXLE_COUNTER', label: 'Axle Counter' },
    { value: 'RADIO_BLOCK', label: 'Radio Block Center' },
    { value: 'SATELLITE', label: 'Satellite-based' }
  ];

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateStep = (stepNumber) => {
    const newErrors = {};

    switch (stepNumber) {
      case 1: // Basic Information
        if (!formData.section_code.trim()) {
          newErrors.section_code = 'Section code is required';
        } else if (!/^[A-Z0-9_-]+$/.test(formData.section_code)) {
          newErrors.section_code = 'Section code must contain only uppercase letters, numbers, underscores, and hyphens';
        }

        if (!formData.section_name.trim()) {
          newErrors.section_name = 'Section name is required';
        }

        if (formData.length <= 0) {
          newErrors.length = 'Length must be greater than 0';
        }

        if (formData.max_speed <= 0) {
          newErrors.max_speed = 'Max speed must be greater than 0';
        }

        if (formData.max_occupancy < 1) {
          newErrors.max_occupancy = 'Max occupancy must be at least 1';
        }

        if (formData.current_occupancy < 0) {
          newErrors.current_occupancy = 'Current occupancy cannot be negative';
        }

        if (formData.current_occupancy > formData.max_occupancy) {
          newErrors.current_occupancy = 'Current occupancy cannot exceed max occupancy';
        }
        break;

      case 2: // Technical Specifications
        if (formData.track_count < 1) {
          newErrors.track_count = 'Track count must be at least 1';
        }

        if (formData.platform_count < 0) {
          newErrors.platform_count = 'Platform count cannot be negative';
        }

        if (formData.gradient < -10 || formData.gradient > 10) {
          newErrors.gradient = 'Gradient must be between -10% and 10%';
        }

        if (formData.curve_radius !== null && formData.curve_radius < 100) {
          newErrors.curve_radius = 'Curve radius must be at least 100m';
        }

        if (formData.operational_constraints.min_headway < 30) {
          newErrors['operational_constraints.min_headway'] = 'Minimum headway must be at least 30 seconds';
        }

        if (formData.operational_constraints.max_trains_per_hour < 1 || formData.operational_constraints.max_trains_per_hour > 120) {
          newErrors['operational_constraints.max_trains_per_hour'] = 'Max trains per hour must be between 1 and 120';
        }
        break;

      case 3: // Location and Safety
        // Coordinate validation
        const coords = formData.coordinates;
        if (coords.start_lat && (coords.start_lat < -90 || coords.start_lat > 90)) {
          newErrors['coordinates.start_lat'] = 'Latitude must be between -90 and 90';
        }
        if (coords.start_lng && (coords.start_lng < -180 || coords.start_lng > 180)) {
          newErrors['coordinates.start_lng'] = 'Longitude must be between -180 and 180';
        }
        if (coords.end_lat && (coords.end_lat < -90 || coords.end_lat > 90)) {
          newErrors['coordinates.end_lat'] = 'Latitude must be between -90 and 90';
        }
        if (coords.end_lng && (coords.end_lng < -180 || coords.end_lng > 180)) {
          newErrors['coordinates.end_lng'] = 'Longitude must be between -180 and 180';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate all steps
    let isValid = true;
    for (let i = 1; i <= totalSteps; i++) {
      if (!validateStep(i)) {
        isValid = false;
        setStep(i); // Go to first invalid step
        break;
      }
    }

    if (isValid) {
      // Prepare data for submission
      const submitData = { ...formData };
      
      // Convert numeric fields
      submitData.length = parseFloat(submitData.length);
      submitData.max_speed = parseFloat(submitData.max_speed);
      submitData.max_occupancy = parseInt(submitData.max_occupancy);
      submitData.current_occupancy = parseInt(submitData.current_occupancy);
      submitData.track_count = parseInt(submitData.track_count);
      submitData.platform_count = parseInt(submitData.platform_count);
      submitData.gradient = parseFloat(submitData.gradient);
      
      if (submitData.curve_radius !== null) {
        submitData.curve_radius = parseFloat(submitData.curve_radius);
      }

      // Convert coordinates
      Object.keys(submitData.coordinates).forEach(key => {
        if (submitData.coordinates[key] !== null && submitData.coordinates[key] !== '') {
          submitData.coordinates[key] = parseFloat(submitData.coordinates[key]);
        } else {
          submitData.coordinates[key] = null;
        }
      });

      // Convert operational constraints
      submitData.operational_constraints.min_headway = parseInt(submitData.operational_constraints.min_headway);
      submitData.operational_constraints.max_trains_per_hour = parseInt(submitData.operational_constraints.max_trains_per_hour);

      if (section) {
        onSave(section.id, submitData);
      } else {
        onSave(submitData);
      }
    }
  };

  const getStepProgress = () => (step / totalSteps) * 100;

  return (
    <div className="modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="modal-content max-w-4xl max-h-screen overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <MapIcon className="h-6 w-6 mr-2" />
                {section ? 'Edit Section' : 'Create New Section'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {section ? `Editing ${section.section_code}` : 'Add a new railway section to the system'}
              </p>
            </div>
            
            <button
              onClick={onCancel}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(getStepProgress())}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getStepProgress()}%` }}
              />
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="px-6 py-4">
            {/* Step 1: Basic Information */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Section Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Section Code *
                      </label>
                      <input
                        type="text"
                        value={formData.section_code}
                        onChange={(e) => handleInputChange('section_code', e.target.value.toUpperCase())}
                        placeholder="e.g., SEC_001"
                        className={`input-field ${errors.section_code ? 'border-red-500' : ''}`}
                      />
                      {errors.section_code && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.section_code}
                        </p>
                      )}
                    </div>

                    {/* Section Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Section Name *
                      </label>
                      <input
                        type="text"
                        value={formData.section_name}
                        onChange={(e) => handleInputChange('section_name', e.target.value)}
                        placeholder="e.g., Main Terminal Section"
                        className={`input-field ${errors.section_name ? 'border-red-500' : ''}`}
                      />
                      {errors.section_name && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.section_name}
                        </p>
                      )}
                    </div>

                    {/* Section Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Section Type *
                      </label>
                      <select
                        value={formData.section_type}
                        onChange={(e) => handleInputChange('section_type', e.target.value)}
                        className="input-field"
                      >
                        {sectionTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label} - {type.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Optional description of the section"
                        rows={3}
                        className="input-field"
                      />
                    </div>

                    {/* Length */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Length (meters) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={formData.length}
                        onChange={(e) => handleInputChange('length', parseFloat(e.target.value) || 0)}
                        className={`input-field ${errors.length ? 'border-red-500' : ''}`}
                      />
                      {errors.length && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.length}
                        </p>
                      )}
                    </div>

                    {/* Max Speed */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Speed (km/h) *
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={formData.max_speed}
                        onChange={(e) => handleInputChange('max_speed', parseFloat(e.target.value) || 0)}
                        className={`input-field ${errors.max_speed ? 'border-red-500' : ''}`}
                      />
                      {errors.max_speed && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.max_speed}
                        </p>
                      )}
                    </div>

                    {/* Max Occupancy */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Occupancy (trains) *
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={formData.max_occupancy}
                        onChange={(e) => handleInputChange('max_occupancy', parseInt(e.target.value) || 0)}
                        className={`input-field ${errors.max_occupancy ? 'border-red-500' : ''}`}
                      />
                      {errors.max_occupancy && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.max_occupancy}
                        </p>
                      )}
                    </div>

                    {/* Current Occupancy (if editing) */}
                    {section && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Occupancy
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max={formData.max_occupancy}
                          value={formData.current_occupancy}
                          onChange={(e) => handleInputChange('current_occupancy', parseInt(e.target.value) || 0)}
                          className={`input-field ${errors.current_occupancy ? 'border-red-500' : ''}`}
                        />
                        {errors.current_occupancy && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                            {errors.current_occupancy}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status Toggles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => handleInputChange('is_active', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="is_active" className="text-sm text-gray-700">
                        Section is active and operational
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="maintenance_mode"
                        checked={formData.maintenance_mode}
                        onChange={(e) => handleInputChange('maintenance_mode', e.target.checked)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <label htmlFor="maintenance_mode" className="text-sm text-gray-700 flex items-center">
                        <WrenchScrewdriverIcon className="h-4 w-4 mr-1 text-red-500" />
                        Under maintenance
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Technical Specifications */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Specifications</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Track Count */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Tracks *
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="10"
                        value={formData.track_count}
                        onChange={(e) => handleInputChange('track_count', parseInt(e.target.value) || 1)}
                        className={`input-field ${errors.track_count ? 'border-red-500' : ''}`}
                      />
                      {errors.track_count && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.track_count}
                        </p>
                      )}
                    </div>

                    {/* Platform Count */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Platforms
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="20"
                        value={formData.platform_count}
                        onChange={(e) => handleInputChange('platform_count', parseInt(e.target.value) || 0)}
                        className={`input-field ${errors.platform_count ? 'border-red-500' : ''}`}
                      />
                      {errors.platform_count && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.platform_count}
                        </p>
                      )}
                    </div>

                    {/* Electrification */}
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="electrified"
                        checked={formData.electrified}
                        onChange={(e) => handleInputChange('electrified', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="electrified" className="text-sm text-gray-700">
                        Electrified section
                      </label>
                    </div>

                    {/* Gradient */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gradient (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="-10"
                        max="10"
                        value={formData.gradient}
                        onChange={(e) => handleInputChange('gradient', parseFloat(e.target.value) || 0)}
                        className={`input-field ${errors.gradient ? 'border-red-500' : ''}`}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Positive for uphill, negative for downhill
                      </p>
                      {errors.gradient && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.gradient}
                        </p>
                      )}
                    </div>

                    {/* Curve Radius */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Curve Radius (meters)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="100"
                        value={formData.curve_radius || ''}
                        onChange={(e) => handleInputChange('curve_radius', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Leave empty for straight section"
                        className={`input-field ${errors.curve_radius ? 'border-red-500' : ''}`}
                      />
                      {errors.curve_radius && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.curve_radius}
                        </p>
                      )}
                    </div>

                    {/* Signal System */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Signal System
                      </label>
                      <select
                        value={formData.signal_system}
                        onChange={(e) => handleInputChange('signal_system', e.target.value)}
                        className="input-field"
                      >
                        {signalSystems.map(system => (
                          <option key={system.value} value={system.value}>
                            {system.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Operational Constraints */}
                  <div className="mt-8">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Operational Constraints</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Headway (seconds)
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="30"
                          max="3600"
                          value={formData.operational_constraints.min_headway}
                          onChange={(e) => handleInputChange('operational_constraints.min_headway', parseInt(e.target.value) || 120)}
                          className={`input-field ${errors['operational_constraints.min_headway'] ? 'border-red-500' : ''}`}
                        />
                        {errors['operational_constraints.min_headway'] && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                            {errors['operational_constraints.min_headway']}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Trains Per Hour
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          max="120"
                          value={formData.operational_constraints.max_trains_per_hour}
                          onChange={(e) => handleInputChange('operational_constraints.max_trains_per_hour', parseInt(e.target.value) || 30)}
                          className={`input-field ${errors['operational_constraints.max_trains_per_hour'] ? 'border-red-500' : ''}`}
                        />
                        {errors['operational_constraints.max_trains_per_hour'] && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                            {errors['operational_constraints.max_trains_per_hour']}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="weather_restrictions"
                          checked={formData.operational_constraints.weather_restrictions}
                          onChange={(e) => handleInputChange('operational_constraints.weather_restrictions', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="weather_restrictions" className="text-sm text-gray-700">
                          Weather-dependent restrictions apply
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Location and Safety */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Location and Safety Systems</h3>
                  
                  {/* Geographic Coordinates */}
                  <div className="mb-8">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Geographic Coordinates</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-3">Start Point</h5>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                            <input
                              type="number"
                              step="0.000001"
                              min="-90"
                              max="90"
                              value={formData.coordinates.start_lat || ''}
                              onChange={(e) => handleInputChange('coordinates.start_lat', e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder="e.g., 28.6139"
                              className={`input-field ${errors['coordinates.start_lat'] ? 'border-red-500' : ''}`}
                            />
                            {errors['coordinates.start_lat'] && (
                              <p className="mt-1 text-xs text-red-600">{errors['coordinates.start_lat']}</p>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                            <input
                              type="number"
                              step="0.000001"
                              min="-180"
                              max="180"
                              value={formData.coordinates.start_lng || ''}
                              onChange={(e) => handleInputChange('coordinates.start_lng', e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder="e.g., 77.2090"
                              className={`input-field ${errors['coordinates.start_lng'] ? 'border-red-500' : ''}`}
                            />
                            {errors['coordinates.start_lng'] && (
                              <p className="mt-1 text-xs text-red-600">{errors['coordinates.start_lng']}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-3">End Point</h5>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                            <input
                              type="number"
                              step="0.000001"
                              min="-90"
                              max="90"
                              value={formData.coordinates.end_lat || ''}
                              onChange={(e) => handleInputChange('coordinates.end_lat', e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder="e.g., 28.6500"
                              className={`input-field ${errors['coordinates.end_lat'] ? 'border-red-500' : ''}`}
                            />
                            {errors['coordinates.end_lat'] && (
                              <p className="mt-1 text-xs text-red-600">{errors['coordinates.end_lat']}</p>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                            <input
                              type="number"
                              step="0.000001"
                              min="-180"
                              max="180"
                              value={formData.coordinates.end_lng || ''}
                              onChange={(e) => handleInputChange('coordinates.end_lng', e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder="e.g., 77.2500"
                              className={`input-field ${errors['coordinates.end_lng'] ? 'border-red-500' : ''}`}
                            />
                            {errors['coordinates.end_lng'] && (
                              <p className="mt-1 text-xs text-red-600">{errors['coordinates.end_lng']}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Safety Systems */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">Safety Systems</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Train Detection System
                        </label>
                        <select
                          value={formData.safety_systems.train_detection_system}
                          onChange={(e) => handleInputChange('safety_systems.train_detection_system', e.target.value)}
                          className="input-field"
                        >
                          {detectionSystems.map(system => (
                            <option key={system.value} value={system.value}>
                              {system.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="automatic_train_protection"
                            checked={formData.safety_systems.automatic_train_protection}
                            onChange={(e) => handleInputChange('safety_systems.automatic_train_protection', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="automatic_train_protection" className="text-sm text-gray-700">
                            Automatic Train Protection (ATP)
                          </label>
                        </div>

                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="positive_train_control"
                            checked={formData.safety_systems.positive_train_control}
                            onChange={(e) => handleInputChange('safety_systems.positive_train_control', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="positive_train_control" className="text-sm text-gray-700">
                            Positive Train Control (PTC)
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Section Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Code:</span>
                        <p className="font-medium">{formData.section_code || 'Not set'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <p className="font-medium">{formData.section_type.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Length:</span>
                        <p className="font-medium">{formData.length}m</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Max Speed:</span>
                        <p className="font-medium">{formData.max_speed} km/h</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="btn-secondary"
                disabled={isLoading}
              >
                Previous
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            
            {step < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary"
                disabled={isLoading}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                onClick={handleSubmit}
                className="btn-primary flex items-center space-x-2"
                disabled={isLoading}
              >
                {isLoading && <div className="loading-spinner" />}
                <span>{section ? 'Update Section' : 'Create Section'}</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SectionForm;