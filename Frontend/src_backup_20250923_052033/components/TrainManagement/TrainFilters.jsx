import React, { useState } from 'react';
import {
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

const TrainFilters = ({ filters, onFiltersChange, onClearFilters }) => {
  const [isOpen, setIsOpen] = useState(false);

  const trainTypes = [
    { value: '', label: 'All Types' },
    { value: 'EXPRESS', label: 'Express' },
    { value: 'FREIGHT', label: 'Freight' },
    { value: 'SUBURBAN', label: 'Suburban' },
    { value: 'SPECIAL', label: 'Special' }
  ];

  const trainStatuses = [
    { value: '', label: 'All Statuses' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'RUNNING', label: 'Running' },
    { value: 'DELAYED', label: 'Delayed' },
    { value: 'STOPPED', label: 'Stopped' },
    { value: 'COMPLETED', label: 'Completed' }
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
    onFiltersChange({ ...filters, [key]: value });
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => value && value !== '').length;
  };

  const hasActiveFilters = getActiveFilterCount() > 0;

  return (
    <div className="relative">
      <Menu as="div" className="relative inline-block text-left">
        <Menu.Button className="btn-secondary flex items-center space-x-2">
          <FunnelIcon className="h-4 w-4" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
              {getActiveFilterCount()}
            </span>
          )}
          <ChevronDownIcon className="h-4 w-4" />
        </Menu.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Filter Trains</h3>
                {hasActiveFilters && (
                  <button
                    onClick={onClearFilters}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Train Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Train Type
                  </label>
                  <select
                    value={filters.trainType || ''}
                    onChange={(e) => handleFilterChange('trainType', e.target.value)}
                    className="input-field"
                  >
                    {trainTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Train Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.trainStatus || ''}
                    onChange={(e) => handleFilterChange('trainStatus', e.target.value)}
                    className="input-field"
                  >
                    {trainStatuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={filters.priority || ''}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                    className="input-field"
                  >
                    {priorities.map(priority => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="date"
                      value={filters.dateRange?.start || ''}
                      onChange={(e) => handleFilterChange('dateRange', {
                        ...filters.dateRange,
                        start: e.target.value
                      })}
                      placeholder="Start date"
                      className="input-field text-sm"
                    />
                    <input
                      type="date"
                      value={filters.dateRange?.end || ''}
                      onChange={(e) => handleFilterChange('dateRange', {
                        ...filters.dateRange,
                        end: e.target.value
                      })}
                      placeholder="End date"
                      className="input-field text-sm"
                    />
                  </div>
                </div>

                {/* Quick Filter Buttons */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Filters
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleFilterChange('trainStatus', 'RUNNING')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        filters.trainStatus === 'RUNNING'
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Running Now
                    </button>
                    <button
                      onClick={() => handleFilterChange('trainStatus', 'DELAYED')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        filters.trainStatus === 'DELAYED'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Delayed
                    </button>
                    <button
                      onClick={() => handleFilterChange('priority', '1')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        filters.priority === '1'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      High Priority
                    </button>
                    <button
                      onClick={() => handleFilterChange('trainType', 'EXPRESS')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        filters.trainType === 'EXPRESS'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Express
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter Summary */}
              {hasActiveFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{getActiveFilterCount()}</span> filter
                    {getActiveFilterCount() !== 1 ? 's' : ''} applied
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(filters).map(([key, value]) => {
                      if (!value || value === '') return null;
                      
                      let displayValue = value;
                      if (key === 'trainType') {
                        displayValue = trainTypes.find(t => t.value === value)?.label || value;
                      } else if (key === 'trainStatus') {
                        displayValue = trainStatuses.find(s => s.value === value)?.label || value;
                      } else if (key === 'priority') {
                        displayValue = `Priority ${value}`;
                      } else if (key === 'dateRange') {
                        if (value.start && value.end) {
                          displayValue = `${value.start} to ${value.end}`;
                        } else if (value.start) {
                          displayValue = `From ${value.start}`;
                        } else if (value.end) {
                          displayValue = `Until ${value.end}`;
                        } else {
                          return null;
                        }
                      }

                      return (
                        <span
                          key={key}
                          className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                        >
                          {displayValue}
                          <button
                            onClick={() => handleFilterChange(key, key === 'dateRange' ? { start: '', end: '' } : '')}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
};

export default TrainFilters;