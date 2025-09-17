import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

import { apiService } from '../services/apiService';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';

// Components
import TrainCard from '../components/TrainManagement/TrainCard';
import TrainForm from '../components/TrainManagement/TrainForm';
import TrainFilters from '../components/TrainManagement/TrainFilters';
import TrainDetailModal from '../components/TrainManagement/TrainDetailModal';
import BulkActions from '../components/TrainManagement/BulkActions';

const TrainManagement = () => {
  const [selectedTrains, setSelectedTrains] = useState(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingTrain, setEditingTrain] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [sortBy, setSortBy] = useState('train_number');
  const [sortOrder, setSortOrder] = useState('asc');

  const {
    trains,
    setTrains,
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    getFilteredTrains
  } = useAppStore();

  const queryClient = useQueryClient();

  // Fetch trains data
  const { data: trainsData, isLoading, error } = useQuery(
    ['trains', filters, searchQuery],
    () => apiService.trains.getAll({
      train_type: filters.trainType || undefined,
      status: filters.trainStatus || undefined,
      priority: filters.priority || undefined,
      search: searchQuery || undefined
    }),
    {
      onSuccess: (data) => {
        setTrains(data);
      },
      onError: (error) => {
        toast.error('Failed to fetch trains data');
        console.error('Error fetching trains:', error);
      }
    }
  );

  // Create train mutation
  const createTrainMutation = useMutation(
    (trainData) => apiService.trains.create(trainData),
    {
      onSuccess: (newTrain) => {
        queryClient.invalidateQueries(['trains']);
        toast.success(`Train ${newTrain.train_number} created successfully`);
        setShowCreateForm(false);
      },
      onError: (error) => {
        toast.error('Failed to create train');
        console.error('Error creating train:', error);
      }
    }
  );

  // Update train mutation
  const updateTrainMutation = useMutation(
    ({ trainId, updates }) => apiService.trains.update(trainId, updates),
    {
      onSuccess: (updatedTrain) => {
        queryClient.invalidateQueries(['trains']);
        toast.success(`Train ${updatedTrain.train_number} updated successfully`);
        setEditingTrain(null);
      },
      onError: (error) => {
        toast.error('Failed to update train');
        console.error('Error updating train:', error);
      }
    }
  );

  // Delete train mutation
  const deleteTrainMutation = useMutation(
    (trainId) => apiService.trains.delete(trainId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['trains']);
        toast.success('Train deleted successfully');
      },
      onError: (error) => {
        toast.error('Failed to delete train');
        console.error('Error deleting train:', error);
      }
    }
  );

  // Get filtered and sorted trains
  const filteredTrains = getFilteredTrains();
  const sortedTrains = [...filteredTrains].sort((a, b) => {
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

  // Handle train selection
  const toggleTrainSelection = (trainId) => {
    const newSelection = new Set(selectedTrains);
    if (newSelection.has(trainId)) {
      newSelection.delete(trainId);
    } else {
      newSelection.add(trainId);
    }
    setSelectedTrains(newSelection);
  };

  const selectAllTrains = () => {
    if (selectedTrains.size === sortedTrains.length) {
      setSelectedTrains(new Set());
    } else {
      setSelectedTrains(new Set(sortedTrains.map(t => t.id)));
    }
  };

  // Handle train actions
  const handleCreateTrain = (trainData) => {
    createTrainMutation.mutate(trainData);
  };

  const handleUpdateTrain = (trainId, updates) => {
    updateTrainMutation.mutate({ trainId, updates });
  };

  const handleDeleteTrain = (trainId) => {
    if (window.confirm('Are you sure you want to delete this train?')) {
      deleteTrainMutation.mutate(trainId);
    }
  };

  const handleViewTrain = (train) => {
    setEditingTrain(train);
    setShowDetailModal(true);
  };

  const handleEditTrain = (train) => {
    setEditingTrain(train);
    setShowCreateForm(true);
  };

  // Handle bulk actions
  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedTrains.size} trains?`)) {
      Array.from(selectedTrains).forEach(trainId => {
        deleteTrainMutation.mutate(trainId);
      });
      setSelectedTrains(new Set());
    }
  };

  const handleBulkStatusUpdate = (status) => {
    Array.from(selectedTrains).forEach(trainId => {
      updateTrainMutation.mutate({ trainId, updates: { status } });
    });
    setSelectedTrains(new Set());
    toast.success(`Updated status for ${selectedTrains.size} trains`);
  };

  // Handle export
  const handleExport = () => {
    const csvContent = [
      ['Train Number', 'Train Name', 'Type', 'Status', 'Priority', 'Current Speed', 'Current Section'].join(','),
      ...sortedTrains.map(train => [
        train.train_number,
        train.train_name,
        train.train_type,
        train.status,
        train.priority,
        train.current_speed,
        train.current_section_id || 'None'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trains_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Trains data exported successfully');
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load trains</h3>
        <p className="text-gray-500 mb-4">There was an error loading the trains data.</p>
        <button 
          onClick={() => queryClient.invalidateQueries(['trains'])}
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
          <h1 className="text-2xl font-bold text-gray-900">Train Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage trains, schedules, and operational status
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
            <span>Add Train</span>
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
            placeholder="Search trains by number or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {/* Filters */}
        <TrainFilters
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
      {selectedTrains.size > 0 && (
        <BulkActions
          selectedCount={selectedTrains.size}
          onDelete={handleBulkDelete}
          onStatusUpdate={handleBulkStatusUpdate}
          onClearSelection={() => setSelectedTrains(new Set())}
        />
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div>
          Showing {sortedTrains.length} of {trains.length} trains
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
            <option value="train_number">Train Number</option>
            <option value="train_name">Name</option>
            <option value="status">Status</option>
            <option value="priority">Priority</option>
            <option value="created_at">Created</option>
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

      {/* Trains List */}
      <div className="min-h-96">
        {isLoading ? (
          <TrainsLoadingSkeleton viewMode={viewMode} />
        ) : sortedTrains.length === 0 ? (
          <EmptyState 
            searchQuery={searchQuery}
            hasFilters={Object.values(filters).some(v => v)}
            onCreateTrain={() => setShowCreateForm(true)}
            onClearFilters={() => {
              setFilters({});
              setSearchQuery('');
            }}
          />
        ) : viewMode === 'grid' ? (
          <TrainsGrid 
            trains={sortedTrains}
            selectedTrains={selectedTrains}
            onToggleSelection={toggleTrainSelection}
            onSelectAll={selectAllTrains}
            onView={handleViewTrain}
            onEdit={handleEditTrain}
            onDelete={handleDeleteTrain}
          />
        ) : (
          <TrainsTable 
            trains={sortedTrains}
            selectedTrains={selectedTrains}
            onToggleSelection={toggleTrainSelection}
            onSelectAll={selectAllTrains}
            onView={handleViewTrain}
            onEdit={handleEditTrain}
            onDelete={handleDeleteTrain}
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
          <TrainForm
            train={editingTrain}
            onSave={editingTrain ? handleUpdateTrain : handleCreateTrain}
            onCancel={() => {
              setShowCreateForm(false);
              setEditingTrain(null);
            }}
            isLoading={createTrainMutation.isLoading || updateTrainMutation.isLoading}
          />
        )}

        {showDetailModal && editingTrain && (
          <TrainDetailModal
            train={editingTrain}
            onClose={() => {
              setShowDetailModal(false);
              setEditingTrain(null);
            }}
            onEdit={() => {
              setShowDetailModal(false);
              setShowCreateForm(true);
            }}
            onDelete={() => {
              setShowDetailModal(false);
              handleDeleteTrain(editingTrain.id);
              setEditingTrain(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Trains Grid Component
const TrainsGrid = ({ trains, selectedTrains, onToggleSelection, onSelectAll, onView, onEdit, onDelete }) => {
  return (
    <div>
      {/* Select all checkbox */}
      <div className="mb-4 flex items-center">
        <input
          type="checkbox"
          checked={selectedTrains.size === trains.length && trains.length > 0}
          onChange={onSelectAll}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label className="ml-2 text-sm text-gray-600">
          Select all trains
        </label>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {trains.map((train, index) => (
          <motion.div
            key={train.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <TrainCard
              train={train}
              isSelected={selectedTrains.has(train.id)}
              onToggleSelection={() => onToggleSelection(train.id)}
              onView={() => onView(train)}
              onEdit={() => onEdit(train)}
              onDelete={() => onDelete(train.id)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Trains Table Component (simplified for brevity)
const TrainsTable = ({ trains, selectedTrains, onToggleSelection, onSelectAll, onView, onEdit, onDelete, sortBy, sortOrder, onSort }) => {
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
                checked={selectedTrains.size === trains.length && trains.length > 0}
                onChange={onSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            {['train_number', 'train_name', 'train_type', 'status', 'priority'].map((field) => (
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
          {trains.map((train) => (
            <tr key={train.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedTrains.has(train.id)}
                  onChange={() => onToggleSelection(train.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {train.train_number}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {train.train_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className={`status-indicator status-${train.train_type.toLowerCase()}`}>
                  {train.train_type}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className={`status-indicator status-${train.status.toLowerCase()}`}>
                  {train.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {train.priority}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => onView(train)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onEdit(train)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(train.id)}
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

// Loading Skeleton Component
const TrainsLoadingSkeleton = ({ viewMode }) => {
  const skeletonItems = Array.from({ length: viewMode === 'grid' ? 8 : 10 });

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {skeletonItems.map((_, index) => (
          <div key={index} className="card animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div className="flex space-x-2">
              <div className="h-8 bg-gray-200 rounded w-16"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {skeletonItems.map((_, index) => (
        <div key={index} className="animate-pulse bg-white p-4 rounded-lg border">
          <div className="flex items-center space-x-4">
            <div className="h-4 w-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
            <div className="flex-1"></div>
            <div className="flex space-x-2">
              <div className="h-6 w-6 bg-gray-200 rounded"></div>
              <div className="h-6 w-6 bg-gray-200 rounded"></div>
              <div className="h-6 w-6 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Empty State Component
const EmptyState = ({ searchQuery, hasFilters, onCreateTrain, onClearFilters }) => {
  return (
    <div className="text-center py-12">
      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.712-3.714M14 40v-4a9.971 9.971 0 01.712-3.714M18 24a6 6 0 11-12 0 6 6 0 0112 0zm0 0v6a9 9 0 009 9v-9a9 9 0 00-9-9z"
        />
      </svg>
      
      <h3 className="mt-4 text-lg font-medium text-gray-900">
        {searchQuery || hasFilters ? 'No trains found' : 'No trains yet'}
      </h3>
      
      <p className="mt-2 text-sm text-gray-500">
        {searchQuery || hasFilters 
          ? 'Try adjusting your search criteria or filters'
          : 'Get started by creating your first train'
        }
      </p>
      
      <div className="mt-6 flex justify-center space-x-3">
        {(searchQuery || hasFilters) && (
          <button onClick={onClearFilters} className="btn-secondary">
            Clear filters
          </button>
        )}
        <button onClick={onCreateTrain} className="btn-primary flex items-center space-x-2">
          <PlusIcon className="h-4 w-4" />
          <span>Add Train</span>
        </button>
      </div>
    </div>
  );
};

export default TrainManagement;