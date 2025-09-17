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