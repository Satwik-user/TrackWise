import React, { useState } from 'react';
import {
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

const SectionFilters = ({ filters, onFiltersChange, onClearFilters }) => {
  const [isOpen, setIsOpen] = useState(false);

  const sectionTypes = [
    { value: '', label: 'All Types' },
    { value: 'MAIN_LINE', label: 'Main Line' },
    { value: 'BRANCH_LINE', label: 'Branch Line' },
    { value: 'SIDING', label: 'Siding' },
    { value: 'YARD', label: 'Yard' },
    { value: 'DEPOT', label: 'Depot' },
    { value: 'JUNCTION', label: 'Junction' },
    { value: 'STATION', label: 'Station' },
    { value: 'TERMINAL', label: 'Terminal' }
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'maintenance', label: 'Under Maintenance' },
    { value: 'at_capacity', label: 'At Capacity' },
    { value: 'available', label: 'Available' }
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
                <h3 className="text-lg font-medium text-gray-900">Filter Sections</h3>
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
                {/* Section Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section Type
                  </label>
                  <select
                    value={filters.sectionType || ''}
                    onChange={(e) => handleFilterChange('sectionType', e.target.value)}
                    className="input-field"
                  >
                    {sectionTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="input-field"
                  >
                    {statusOptions.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Length Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Length Range (meters)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.lengthRange?.min || ''}
                      onChange={(e) => handleFilterChange('lengthRange', {
                        ...filters.lengthRange,
                        min: e.target.value
                      })}
                      className="input-field text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.lengthRange?.max || ''}
                      onChange={(e) => handleFilterChange('lengthRange', {
                        ...filters.lengthRange,
                        max: e.target.value
                      })}
                      className="input-field text-sm"
                    />
                  </div>
                </div>

                // ... (continuing from where we left off)

                {/* Speed Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Speed Range (km/h)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.speedRange?.min || ''}
                      onChange={(e) => handleFilterChange('speedRange', {
                        ...filters.speedRange,
                        min: e.target.value
                      })}
                      className="input-field text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.speedRange?.max || ''}
                      onChange={(e) => handleFilterChange('speedRange', {
                        ...filters.speedRange,
                        max: e.target.value
                      })}
                      className="input-field text-sm"
                    />
                  </div>
                </div>

                {/* Occupancy Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Occupancy Level
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={filters.occupancyLevels?.includes('empty') || false}
                        onChange={(e) => {
                          const current = filters.occupancyLevels || [];
                          const updated = e.target.checked
                            ? [...current, 'empty']
                            : current.filter(level => level !== 'empty');
                          handleFilterChange('occupancyLevels', updated);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                      />
                      Empty (0% occupancy)
                    </label>
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={filters.occupancyLevels?.includes('low') || false}
                        onChange={(e) => {
                          const current = filters.occupancyLevels || [];
                          const updated = e.target.checked
                            ? [...current, 'low']
                            : current.filter(level => level !== 'low');
                          handleFilterChange('occupancyLevels', updated);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                      />
                      Low (1-50% occupancy)
                    </label>
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={filters.occupancyLevels?.includes('high') || false}
                        onChange={(e) => {
                          const current = filters.occupancyLevels || [];
                          const updated = e.target.checked
                            ? [...current, 'high']
                            : current.filter(level => level !== 'high');
                          handleFilterChange('occupancyLevels', updated);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                      />
                      High (51-99% occupancy)
                    </label>
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={filters.occupancyLevels?.includes('full') || false}
                        onChange={(e) => {
                          const current = filters.occupancyLevels || [];
                          const updated = e.target.checked
                            ? [...current, 'full']
                            : current.filter(level => level !== 'full');
                          handleFilterChange('occupancyLevels', updated);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                      />
                      At Capacity (100% occupancy)
                    </label>
                  </div>
                </div>

                {/* Features Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Features
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={filters.features?.electrified || false}
                        onChange={(e) => handleFilterChange('features', {
                          ...filters.features,
                          electrified: e.target.checked
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                      />
                      Electrified
                    </label>
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={filters.features?.hasPlatforms || false}
                        onChange={(e) => handleFilterChange('features', {
                          ...filters.features,
                          hasPlatforms: e.target.checked
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                      />
                      Has Platforms
                    </label>
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={filters.features?.multipleTracks || false}
                        onChange={(e) => handleFilterChange('features', {
                          ...filters.features,
                          multipleTracks: e.target.checked
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                      />
                      Multiple Tracks
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
};

export default SectionFilters;