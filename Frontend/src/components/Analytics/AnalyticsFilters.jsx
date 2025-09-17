import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FunnelIcon,
  XMarkIcon,
  CalendarDaysIcon,
  TrainIcon,
  MapIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

const AnalyticsFilters = ({ filters, onFiltersChange, timeRange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  const trainTypes = [
    { value: '', label: 'All Types' },
    { value: 'EXPRESS', label: 'Express' },
    { value: 'FREIGHT', label: 'Freight' },
    { value: 'SUBURBAN', label: 'Suburban' },
    { value: 'SPECIAL', label: 'Special' }
  ];

  const priorities = [
    { value: '', label: 'All Priorities' },
    { value: '1', label: 'Priority 1 (Highest)' },
    { value: '2', label: 'Priority 2 (High)' },
    { value: '3', label: 'Priority 3 (Normal)' },
    { value: '4', label: 'Priority 4 (Low)' },
    { value: '5', label: 'Priority 5 (Lowest)' }
  ];

  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleDateRangeChange = (field, value) => {
    const newDateRange = { ...dateRange, [field]: value };
    setDateRange(newDateRange);
    
    if (newDateRange.start && newDateRange.end) {
      handleFilterChange('dateRange', newDateRange);
    }
  };

  const clearFilters = () => {
    onFiltersChange({
      trainType: '',
      sectionIds: [],
      priority: '',
      dateRange: null
    });
    setDateRange({ start: '', end: '' });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.trainType) count++;
    if (filters.sectionIds && filters.sectionIds.length > 0) count++;
    if (filters.priority) count++;
    if (filters.dateRange) count++;
    return count;
  };

  const hasActiveFilters = getActiveFilterCount() > 0;

  return (
    <div className="space-y-3">
      {/* Quick Filters */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>

        {/* Train Type Filter */}
        <select
          value={filters.trainType || ''}
          onChange={(e) => handleFilterChange('trainType', e.target.value)}
          className="input-field text-sm"
        >
          {trainTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={filters.priority || ''}
          onChange={(e) => handleFilterChange('priority', e.target.value)}
          className="input-field text-sm"
        >
          {priorities.map(priority => (
            <option key={priority.value} value={priority.value}>
              {priority.label}
            </option>
          ))}
        </select>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn-secondary text-sm flex items-center space-x-1"
        >
          <span>Advanced</span>
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center space-x-1"
          >
            <XMarkIcon className="h-4 w-4" />
            <span>Clear ({getActiveFilterCount()})</span>
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Date Range
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => handleDateRangeChange('start', e.target.value)}
                      className="input-field text-sm"
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => handleDateRangeChange('end', e.target.value)}
                      className="input-field text-sm"
                      max={new Date().toISOString().split('T')[0]}
                      min={dateRange.start}
                    />
                  </div>
                </div>
              </div>

              {/* Section IDs Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specific Sections
                </label>
                <SectionSelector
                  selectedSections={filters.sectionIds || []}
                  onSelectionChange={(sectionIds) => handleFilterChange('sectionIds', sectionIds)}
                />
              </div>

              {/* Quick Filter Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Presets
                </label>
                <div className="flex flex-wrap gap-2">
                  <FilterPresetButton
                    label="High Priority Only"
                    onClick={() => {
                      handleFilterChange('priority', '1');
                      handleFilterChange('trainType', '');
                    }}
                    active={filters.priority === '1'}
                  />
                  <FilterPresetButton
                    label="Express Trains"
                    onClick={() => {
                      handleFilterChange('trainType', 'EXPRESS');
                      handleFilterChange('priority', '');
                    }}
                    active={filters.trainType === 'EXPRESS'}
                  />
                  <FilterPresetButton
                    label="Freight Only"
                    onClick={() => {
                      handleFilterChange('trainType', 'FREIGHT');
                      handleFilterChange('priority', '');
                    }}
                    active={filters.trainType === 'FREIGHT'}
                  />
                  <FilterPresetButton
                    label="Today's Data"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setDateRange({ start: today, end: today });
                      handleFilterChange('dateRange', { start: today, end: today });
                    }}
                    active={dateRange.start === dateRange.end && dateRange.start === new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.trainType && (
            <FilterTag
              label={`Type: ${trainTypes.find(t => t.value === filters.trainType)?.label}`}
              onRemove={() => handleFilterChange('trainType', '')}
            />
          )}
          {filters.priority && (
            <FilterTag
              label={`Priority: ${filters.priority}`}
              onRemove={() => handleFilterChange('priority', '')}
            />
          )}
          {filters.sectionIds && filters.sectionIds.length > 0 && (
            <FilterTag
              label={`Sections: ${filters.sectionIds.length} selected`}
              onRemove={() => handleFilterChange('sectionIds', [])}
            />
          )}
          {filters.dateRange && (
            <FilterTag
              label={`Date: ${filters.dateRange.start} to ${filters.dateRange.end}`}
              onRemove={() => {
                handleFilterChange('dateRange', null);
                setDateRange({ start: '', end: '' });
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

// Section Selector Component
const SectionSelector = ({ selectedSections, onSelectionChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [availableSections] = useState([
    // Mock section data - in real app, this would come from API
    { id: 1, code: 'SEC_001', name: 'Main Terminal' },
    { id: 2, code: 'SEC_002', name: 'Junction Alpha' },
    { id: 3, code: 'SEC_003', name: 'Central Station' },
    { id: 4, code: 'SEC_004', name: 'North Branch' },
    { id: 5, code: 'SEC_005', name: 'South Branch' },
    { id: 6, code: 'SEC_006', name: 'Depot Area' }
  ]);

  const filteredSections = availableSections.filter(section =>
    section.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSection = (sectionId) => {
    const newSelection = selectedSections.includes(sectionId)
      ? selectedSections.filter(id => id !== sectionId)
      : [...selectedSections, sectionId];
    onSelectionChange(newSelection);
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Search sections..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="input-field text-sm"
      />
      
      <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
        {filteredSections.map(section => (
          <label
            key={section.id}
            className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedSections.includes(section.id)}
              onChange={() => toggleSection(section.id)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-900">
              {section.code} - {section.name}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

// Filter Preset Button Component
const FilterPresetButton = ({ label, onClick, active }) => {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
        active
          ? 'bg-blue-100 text-blue-800 border border-blue-300'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
      }`}
    >
      {label}
    </button>
  );
};

// Filter Tag Component
const FilterTag = ({ label, onRemove }) => {
  return (
    <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="ml-2 text-blue-600 hover:text-blue-800"
      >
        <XMarkIcon className="h-3 w-3" />
      </button>
    </div>
  );
};

export default AnalyticsFilters;