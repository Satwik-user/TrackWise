import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

import { apiService } from '../services/apiService';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';

// Components
import SectionCard from '../components/SectionManagement/SectionCard';
import SectionForm from '../components/SectionManagement/SectionForm';
import SectionFilters from '../components/SectionManagement/SectionFilters';
import SectionDetailModal from '../components/SectionManagement/SectionDetailModal';
import BulkSectionActions from '../components/SectionManagement/BulkSectionActions';

const SectionManagement = () => {
  const [selectedSections, setSelectedSections] = useState(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('section_code');
  const [sortOrder, setSortOrder] = useState('asc');

  const {
    sections,
    setSections,
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    getFilteredSections
  } = useAppStore();

  const queryClient = useQueryClient();

  // Fetch sections data
  const { data: sectionsData, isLoading, error } = useQuery(
    ['sections', filters, searchQuery],
    () => apiService.sections.getAll({
      section_type: filters.sectionType || undefined,
      status: filters.status || undefined,
      search: searchQuery || undefined
    }),
    {
      onSuccess: (data) => {
        setSections(data);
      },
      onError: (error) => {
        toast.error('Failed to fetch sections data');
        console.error('Error fetching sections:', error);
      }
    }
  );

  // Create section mutation
  const createSectionMutation = useMutation(
    (sectionData) => apiService.sections.create(sectionData),
    {
      onSuccess: (newSection) => {
        queryClient.invalidateQueries(['sections']);
        toast.success(`Section ${newSection.section_code} created successfully`);
        setShowCreateForm(false);
      },
      onError: (error) => {
        toast.error('Failed to create section');
        console.error('Error creating section:', error);
      }
    }
  );

  // Update section mutation
  const updateSectionMutation = useMutation(
    ({ sectionId, updates }) => apiService.sections.update(sectionId, updates),
    {
      onSuccess: (updatedSection) => {
        queryClient.invalidateQueries(['sections']);
        toast.success(`Section ${updatedSection.section_code} updated successfully`);
        setEditingSection(null);
      },
      onError: (error) => {
        toast.error('Failed to update section');
        console.error('Error updating section:', error);
      }
    }
  );

  // Delete section mutation
  const deleteSectionMutation = useMutation(
    (sectionId) => apiService.sections.delete(sectionId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['sections']);
        toast.success('Section deleted successfully');
      },
      onError: (error) => {
        toast.error('Failed to delete section');
        console.error('Error deleting section:', error);
      }
    }
  );

  // Toggle maintenance mode mutation
  const toggleMaintenanceMutation = useMutation(
    ({ sectionId, maintenanceMode }) => apiService.sections.update(sectionId, { maintenance_mode: maintenanceMode }),
    {
      onSuccess: (updatedSection) => {
        queryClient.invalidateQueries(['sections']);
        toast.success(`Section ${updatedSection.section_code} ${updatedSection.maintenance_mode ? 'entered' : 'exited'} maintenance mode`);
      },
      onError: (error) => {
        toast.error('Failed to toggle maintenance mode');
      }
    }
  );

  // Get filtered and sorted sections
  const filteredSections = getFilteredSections();
  const sortedSections = [...filteredSections].sort((a, b) => {
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

  // Handle section selection
  const toggleSectionSelection = (sectionId) => {
    const newSelection = new Set(selectedSections);
    if (newSelection.has(sectionId)) {
      newSelection.delete(sectionId);
    } else {
      newSelection.add(sectionId);
    }
    setSelectedSections(newSelection);
  };

  const selectAllSections = () => {
    if (selectedSections.size === sortedSections.length) {
      setSelectedSections(new Set());
    } else {
      setSelectedSections(new Set(sortedSections.map(s => s.id)));
    }
  };

  // Handle section actions
  const handleCreateSection = (sectionData) => {
    createSectionMutation.mutate(sectionData);
  };

  const handleUpdateSection = (sectionId, updates) => {
    updateSectionMutation.mutate({ sectionId, updates });
  };

  const handleDeleteSection = (sectionId) => {
    if (window.confirm('Are you sure you want to delete this section?')) {
      deleteSectionMutation.mutate(sectionId);
    }
  };

  const handleViewSection = (section) => {
    setEditingSection(section);
    setShowDetailModal(true);
  };

  const handleEditSection = (section) => {
    setEditingSection(section);
    setShowCreateForm(true);
  };

  const handleToggleMaintenance = (section) => {
    toggleMaintenanceMutation.mutate({
      sectionId: section.id,
      maintenanceMode: !section.maintenance_mode
    });
  };

  // Handle bulk actions
  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedSections.size} sections?`)) {
      Array.from(selectedSections).forEach(sectionId => {
        deleteSectionMutation.mutate(sectionId);
      });
      setSelectedSections(new Set());
    }
  };

  const handleBulkMaintenance = (maintenanceMode) => {
    Array.from(selectedSections).forEach(sectionId => {
      updateSectionMutation.mutate({ sectionId, updates: { maintenance_mode: maintenanceMode } });
    });
    setSelectedSections(new Set());
    toast.success(`${maintenanceMode ? 'Enabled' : 'Disabled'} maintenance mode for ${selectedSections.size} sections`);
  };

  // Handle export
  const handleExport = () => {
    const csvContent = [
      ['Section Code', 'Section Name', 'Type', 'Length', 'Max Speed', 'Max Occupancy', 'Current Occupancy', 'Status'].join(','),
      ...sortedSections.map(section => [
        section.section_code,
        section.section_name,
        section.section_type,
        section.length,
        section.max_speed,
        section.max_occupancy,
        section.current_occupancy,
        section.is_active ? (section.maintenance_mode ? 'Maintenance' : 'Active') : 'Inactive'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sections_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Sections data exported successfully');
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <ExclamationTriangleIcon className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load sections</h3>
        <p className="text-gray-500 mb-4">There was an error loading the sections data.</p>
        <button 
          onClick={() => queryClient.invalidateQueries(['sections'])}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Section Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage railway sections, track configuration, and maintenance
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center space-x-2"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            <span>Export</span>
          </button>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Section</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search sections by code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {/* Filters */}
        <SectionFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={() => setFilters({})}
        />

        {/* View mode toggle */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-md ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedSections.size > 0 && (
        <BulkSectionActions
          selectedCount={selectedSections.size}
          onDelete={handleBulkDelete}
          onToggleMaintenance={handleBulkMaintenance}
          onClearSelection={() => setSelectedSections(new Set())}
        />
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div>
          Showing {sortedSections.length} of {sections.length} sections
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
        
        {/* Sort controls */}
        <div className="flex items-center space-x-2">
          <span>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="section_code">Section Code</option>
            <option value="section_name">Name</option>
            <option value="section_type">Type</option>
            <option value="length">Length</option>
            <option value="max_speed">Max Speed</option>
            <option value="current_occupancy">Occupancy</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1 rounded hover:bg-gray-100"
          >
            <svg 
              className={`h-4 w-4 transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sections List */}
      <div className="min-h-96">
        {isLoading ? (
          <SectionsLoadingSkeleton viewMode={viewMode} />
        ) : sortedSections.length === 0 ? (
          <EmptyState 
            searchQuery={searchQuery}
            hasFilters={Object.values(filters).some(v => v)}
            onCreateSection={() => setShowCreateForm(true)}
            onClearFilters={() => {
              setFilters({});
              setSearchQuery('');
            }}
          />
        ) : viewMode === 'grid' ? (
          <SectionsGrid 
            sections={sortedSections}
            selectedSections={selectedSections}
            onToggleSelection={toggleSectionSelection}
            onSelectAll={selectAllSections}
            onView={handleViewSection}
            onEdit={handleEditSection}
            onDelete={handleDeleteSection}
            onToggleMaintenance={handleToggleMaintenance}
          />
        ) : (
          <SectionsTable 
            sections={sortedSections}
            selectedSections={selectedSections}
            onToggleSelection={toggleSectionSelection}
            onSelectAll={selectAllSections}
            onView={handleViewSection}
            onEdit={handleEditSection}
            onDelete={handleDeleteSection}
            onToggleMaintenance={handleToggleMaintenance}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={(field) => {
              if (sortBy === field) {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              } else {
                setSortBy(field);
                setSortOrder('asc');
              }
            }}
          />
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateForm && (
          <SectionForm
            section={editingSection}
            onSave={editingSection ? handleUpdateSection : handleCreateSection}
            onCancel={() => {
              setShowCreateForm(false);
              setEditingSection(null);
            }}
            isLoading={createSectionMutation.isLoading || updateSectionMutation.isLoading}
          />
        )}

        {showDetailModal && editingSection && (
          <SectionDetailModal
            section={editingSection}
            onClose={() => {
              setShowDetailModal(false);
              setEditingSection(null);
            }}
            onEdit={() => {
              setShowDetailModal(false);
              setShowCreateForm(true);
            }}
            onDelete={() => {
              setShowDetailModal(false);
              handleDeleteSection(editingSection.id);
              setEditingSection(null);
            }}
            onToggleMaintenance={() => {
              handleToggleMaintenance(editingSection);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Sections Grid Component
const SectionsGrid = ({ 
  sections, 
  selectedSections, 
  onToggleSelection, 
  onSelectAll, 
  onView, 
  onEdit, 
  onDelete, 
  onToggleMaintenance 
}) => {
  return (
    <div>
      {/* Select all checkbox */}
      <div className="mb-4 flex items-center">
        <input
          type="checkbox"
          checked={selectedSections.size === sections.length && sections.length > 0}
          onChange={onSelectAll}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label className="ml-2 text-sm text-gray-600">
          Select all sections
        </label>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sections.map((section, index) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <SectionCard
              section={section}
              isSelected={selectedSections.has(section.id)}
              onToggleSelection={() => onToggleSelection(section.id)}
              onView={() => onView(section)}
              onEdit={() => onEdit(section)}
              onDelete={() => onDelete(section.id)}
              onToggleMaintenance={() => onToggleMaintenance(section)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Sections Table Component (simplified for brevity)
const SectionsTable = ({ 
  sections, 
  selectedSections, 
  onToggleSelection, 
  onSelectAll, 
  onView, 
  onEdit, 
  onDelete, 
  onToggleMaintenance,
  sortBy, 
  sortOrder, 
  onSort 
}) => {
  const getSortIcon = (field) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedSections.size === sections.length && sections.length > 0}
                onChange={onSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            {['section_code', 'section_name', 'section_type', 'length', 'max_speed', 'current_occupancy'].map((field) => (
              <th
                key={field}
                onClick={() => onSort(field)}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                {field.replace('_', ' ')} {getSortIcon(field)}
              </th>
            ))}
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sections.map((section) => (
            <tr key={section.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedSections.has(section.id)}
                  onChange={() => onToggleSelection(section.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {section.section_code}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {section.section_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className={`status-indicator status-${section.section_type.toLowerCase()}`}>
                  {section.section_type}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {section.length}m
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {section.max_speed} km/h
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex items-center">
                  <span>{section.current_occupancy}/{section.max_occupancy}</span>
                  <div className={`ml-2 w-2 h-2 rounded-full ${
                    section.maintenance_mode ? 'bg-red-500' :
                    !section.is_active ? 'bg-gray-500' :
                    section.current_occupancy >= section.max_occupancy ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`} />
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => onView(section)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onEdit(section)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onToggleMaintenance(section)}
                    className={`${section.maintenance_mode ? 'text-green-600 hover:text-green-900' : 'text-orange-600 hover:text-orange-900'}`}
                  >
                    <WrenchScrewdriverIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(section.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Loading Skeleton and Empty State components would be similar to train management
const SectionsLoadingSkeleton = ({ viewMode }) => {
  // Similar to TrainsLoadingSkeleton but for sections
  return <div>Loading sections...</div>;
};

const EmptyState = ({ searchQuery, hasFilters, onCreateSection, onClearFilters }) => {
  // Similar to train management empty state
  return <div>No sections found</div>;
};

export default SectionManagement;