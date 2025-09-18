import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  TruckIcon,
  ClockIcon,
  MapPinIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const TrainForm = ({ train, onSave, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    train_number: '',
    train_name: '',
    train_type: 'SUBURBAN',
    priority: 3,
    length: 200,
    max_speed: 120,
    acceleration: 0.5,
    deceleration: 0.8,
    weight: 400,
    scheduled_arrival: '',
    scheduled_departure: '',
    current_section_id: '',
    operator: '',
    service_class: 'Regular',
    passenger_capacity: '',
    cargo_capacity: '',
    energy_efficiency: 0.85,
    punctuality_score: 0.9
  });

  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Initialize form data when train prop changes
  useEffect(() => {
    if (train) {
      setFormData({
        train_number: train.train_number || '',
        train_name: train.train_name || '',
        train_type: train.train_type || 'SUBURBAN',
        priority: train.priority || 3,
        length: train.length || 200,
        max_speed: train.max_speed || 120,
        acceleration: train.acceleration || 0.5,
        deceleration: train.deceleration || 0.8,
        weight: train.weight || 400,
        scheduled_arrival: train.scheduled_arrival ? 
          new Date(train.scheduled_arrival).toISOString().slice(0, 16) : '',
        scheduled_departure: train.scheduled_departure ? 
          new Date(train.scheduled_departure).toISOString().slice(0, 16) : '',
        current_section_id: train.current_section_id || '',
        operator: train.operator || '',
        service_class: train.service_class || 'Regular',
        passenger_capacity: train.passenger_capacity || '',
        cargo_capacity: train.cargo_capacity || '',
        energy_efficiency: train.energy_efficiency || 0.85,
        punctuality_score: train.punctuality_score || 0.9
      });
    }
  }, [train]);

  const trainTypes = [
    { value: 'EXPRESS', label: 'Express', description: 'High-speed passenger service' },
    { value: 'FREIGHT', label: 'Freight', description: 'Cargo transportation' },
    { value: 'SUBURBAN', label: 'Suburban', description: 'Local passenger service' },
    { value: 'SPECIAL', label: 'Special', description: 'Special purpose trains' }
  ];

  const serviceClasses = [
    { value: 'Regular', label: 'Regular' },
    { value: 'Premium', label: 'Premium' },
    { value: 'Budget', label: 'Budget' },
    { value: 'Luxury', label: 'Luxury' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateStep = (stepNumber) => {
    const newErrors = {};

    switch (stepNumber) {
      case 1: // Basic Information
        if (!formData.train_number.trim()) {
          newErrors.train_number = 'Train number is required';
        } else if (!/^[A-Z0-9-]+$/.test(formData.train_number)) {
          newErrors.train_number = 'Train number must contain only uppercase letters, numbers, and hyphens';
        }

        if (!formData.train_name.trim()) {
          newErrors.train_name = 'Train name is required';
        }

        if (formData.priority < 1 || formData.priority > 5) {
          newErrors.priority = 'Priority must be between 1 and 5';
        }
        break;

      case 2: // Technical Specifications
        if (formData.length <= 0) {
          newErrors.length = 'Length must be greater than 0';
        }

        if (formData.max_speed <= 0) {
          newErrors.max_speed = 'Max speed must be greater than 0';
        }

        if (formData.acceleration <= 0) {
          newErrors.acceleration = 'Acceleration must be greater than 0';
        }

        if (formData.deceleration <= 0) {
          newErrors.deceleration = 'Deceleration must be greater than 0';
        }

        if (formData.weight <= 0) {
          newErrors.weight = 'Weight must be greater than 0';
        }

        // Type-specific validations
        if (formData.train_type === 'FREIGHT' && !formData.cargo_capacity) {
          newErrors.cargo_capacity = 'Cargo capacity is required for freight trains';
        }

        if (['EXPRESS', 'SUBURBAN'].includes(formData.train_type) && !formData.passenger_capacity) {
          newErrors.passenger_capacity = 'Passenger capacity is required for passenger trains';
        }
        break;

      case 3: // Schedule and Operations
        if (formData.scheduled_arrival && formData.scheduled_departure) {
          const arrival = new Date(formData.scheduled_arrival);
          const departure = new Date(formData.scheduled_departure);
          
          if (departure <= arrival) {
            newErrors.scheduled_departure = 'Departure time must be after arrival time';
          }
        }

        if (formData.energy_efficiency < 0.1 || formData.energy_efficiency > 1) {
          newErrors.energy_efficiency = 'Energy efficiency must be between 0.1 and 1.0';
        }

        if (formData.punctuality_score < 0 || formData.punctuality_score > 1) {
          newErrors.punctuality_score = 'Punctuality score must be between 0 and 1.0';
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
      
      // Convert datetime strings to ISO format
      if (submitData.scheduled_arrival) {
        submitData.scheduled_arrival = new Date(submitData.scheduled_arrival).toISOString();
      }
      if (submitData.scheduled_departure) {
        submitData.scheduled_departure = new Date(submitData.scheduled_departure).toISOString();
      }

      // Convert numeric fields
      submitData.priority = parseInt(submitData.priority);
      submitData.length = parseFloat(submitData.length);
      submitData.max_speed = parseFloat(submitData.max_speed);
      submitData.acceleration = parseFloat(submitData.acceleration);
      submitData.deceleration = parseFloat(submitData.deceleration);
      submitData.weight = parseFloat(submitData.weight);
      submitData.energy_efficiency = parseFloat(submitData.energy_efficiency);
      submitData.punctuality_score = parseFloat(submitData.punctuality_score);

      if (submitData.passenger_capacity) {
        submitData.passenger_capacity = parseInt(submitData.passenger_capacity);
      }
      if (submitData.cargo_capacity) {
        submitData.cargo_capacity = parseFloat(submitData.cargo_capacity);
      }
      if (submitData.current_section_id) {
        submitData.current_section_id = parseInt(submitData.current_section_id);
      }

      if (train) {
        onSave(train.id, submitData);
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
        className="modal-content max-w-4xl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <TruckIcon className="h-6 w-6 mr-2" />
                {train ? 'Edit Train' : 'Create New Train'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {train ? `Editing ${train.train_number}` : 'Add a new train to the system'}
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
                  {/* Train Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Train Number *
                    </label>
                    <input
                      type="text"
                      value={formData.train_number}
                      onChange={(e) => handleInputChange('train_number', e.target.value.toUpperCase())}
                      placeholder="e.g., T1001"
                      className={`input-field ${errors.train_number ? 'border-red-500' : ''}`}
                    />
                    {errors.train_number && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        {errors.train_number}
                      </p>
                    )}
                  </div>

                  {/* Train Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Train Name *
                    </label>
                    <input
                      type="text"
                      value={formData.train_name}
                      onChange={(e) => handleInputChange('train_name', e.target.value)}
                      placeholder="e.g., Express Service 101"
                      className={`input-field ${errors.train_name ? 'border-red-500' : ''}`}
                    />
                    {errors.train_name && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        {errors.train_name}
                      </p>
                    )}
                  </div>

                  {/* Train Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Train Type *
                    </label>
                    <select
                      value={formData.train_type}
                      onChange={(e) => handleInputChange('train_type', e.target.value)}
                      className="input-field"
                    >
                      {trainTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label} - {type.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority *
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
                      className={`input-field ${errors.priority ? 'border-red-500' : ''}`}
                    >
                      <option value={1}>1 - Highest Priority</option>
                      <option value={2}>2 - High Priority</option>
                      <option value={3}>3 - Normal Priority</option>
                      <option value={4}>4 - Low Priority</option>
                      <option value={5}>5 - Lowest Priority</option>
                    </select>
                    {errors.priority && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        {errors.priority}
                      </p>
                    )}
                  </div>

                  {/* Operator */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Operator
                    </label>
                    <input
                      type="text"
                      value={formData.operator}
                      onChange={(e) => handleInputChange('operator', e.target.value)}
                      placeholder="e.g., Indian Railways"
                      className="input-field"
                    />
                  </div>

                  {/* Service Class */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Class
                    </label>
                    <select
                      value={formData.service_class}
                      onChange={(e) => handleInputChange('service_class', e.target.value)}
                      className="input-field"
                    >
                      {serviceClasses.map(cls => (
                        <option key={cls.value} value={cls.value}>
                          {cls.label}
                        </option>
                      ))}
                    </select>
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
                      step="0.1"
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

                  {/* Acceleration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Acceleration (m/s²) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.acceleration}
                      onChange={(e) => handleInputChange('acceleration', parseFloat(e.target.value) || 0)}
                      className={`input-field ${errors.acceleration ? 'border-red-500' : ''}`}
                    />
                    {errors.acceleration && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        {errors.acceleration}
                      </p>
                    )}
                  </div>

                  {/* Deceleration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deceleration (m/s²) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.deceleration}
                      onChange={(e) => handleInputChange('deceleration', parseFloat(e.target.value) || 0)}
                      className={`input-field ${errors.deceleration ? 'border-red-500' : ''}`}
                    />
                    {errors.deceleration && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        {errors.deceleration}
                      </p>
                    )}
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight (tons) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.weight}
                      onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
                      className={`input-field ${errors.weight ? 'border-red-500' : ''}`}
                    />
                    {errors.weight && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        {errors.weight}
                      </p>
                    )}
                  </div>

                  {/* Passenger Capacity (for passenger trains) */}
                  {['EXPRESS', 'SUBURBAN', 'SPECIAL'].includes(formData.train_type) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Passenger Capacity {['EXPRESS', 'SUBURBAN'].includes(formData.train_type) ? '*' : ''}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.passenger_capacity}
                        onChange={(e) => handleInputChange('passenger_capacity', e.target.value)}
                        className={`input-field ${errors.passenger_capacity ? 'border-red-500' : ''}`}
                      />
                      {errors.passenger_capacity && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.passenger_capacity}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Cargo Capacity (for freight trains) */}
                  {['FREIGHT', 'SPECIAL'].includes(formData.train_type) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cargo Capacity (tons) {formData.train_type === 'FREIGHT' ? '*' : ''}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={formData.cargo_capacity}
                        onChange={(e) => handleInputChange('cargo_capacity', e.target.value)}
                        className={`input-field ${errors.cargo_capacity ? 'border-red-500' : ''}`}
                      />
                      {errors.cargo_capacity && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.cargo_capacity}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Energy Efficiency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Energy Efficiency (0.1 - 1.0) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="1.0"
                      value={formData.energy_efficiency}
                      onChange={(e) => handleInputChange('energy_efficiency', parseFloat(e.target.value) || 0)}
                      className={`input-field ${errors.energy_efficiency ? 'border-red-500' : ''}`}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      1.0 = 100% efficient, 0.5 = 50% efficient
                    </p>
                    {errors.energy_efficiency && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        {errors.energy_efficiency}
                      </p>
                    )}
                  </div>

                  {/* Punctuality Score */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Punctuality Score (0.0 - 1.0) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.0"
                      max="1.0"
                      value={formData.punctuality_score}
                      onChange={(e) => handleInputChange('punctuality_score', parseFloat(e.target.value) || 0)}
                      className={`input-field ${errors.punctuality_score ? 'border-red-500' : ''}`}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Historical on-time performance score
                    </p>
                    {errors.punctuality_score && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        {errors.punctuality_score}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Schedule and Operations */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule and Operations</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Scheduled Arrival */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <ClockIcon className="h-4 w-4 inline mr-1" />
                      Scheduled Arrival
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.scheduled_arrival}
                      onChange={(e) => handleInputChange('scheduled_arrival', e.target.value)}
                      className="input-field"
                    />
                  </div>

                  {/* Scheduled Departure */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <ClockIcon className="h-4 w-4 inline mr-1" />
                      Scheduled Departure
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.scheduled_departure}
                      onChange={(e) => handleInputChange('scheduled_departure', e.target.value)}
                      className={`input-field ${errors.scheduled_departure ? 'border-red-500' : ''}`}
                    />
                    {errors.scheduled_departure && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        {errors.scheduled_departure}
                      </p>
                    )}
                  </div>

                  {/* Current Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPinIcon className="h-4 w-4 inline mr-1" />
                      Current Section ID
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.current_section_id}
                      onChange={(e) => handleInputChange('current_section_id', e.target.value)}
                      placeholder="Leave empty if not assigned"
                      className="input-field"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Section where the train is currently located
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Train Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Number:</span>
                      <p className="font-medium">{formData.train_number || 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <p className="font-medium">{formData.train_type}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Priority:</span>
                      <p className="font-medium">{formData.priority}</p>
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
                <span>{train ? 'Update Train' : 'Create Train'}</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TrainForm;