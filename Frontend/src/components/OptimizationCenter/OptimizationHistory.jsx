import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import DataTable from '../Common/DataTable';
import Modal from '../Common/Modal';
import LoadingSpinner from '../Common/LoadingSpinner';
import SearchBox from '../Common/SearchBox';

const OptimizationHistory = () => {
  const [optimizationRuns, setOptimizationRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [filters, setFilters] = useState({
    status: 'all',
    algorithm: 'all',
    dateRange: '7d'
  });

  useEffect(() => {
    fetchOptimizationHistory();
  }, [currentPage, itemsPerPage, searchTerm, sortConfig, filters]);

  const fetchOptimizationHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
        ...filters
      });

      const response = await fetch(`/api/v1/optimization/history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch optimization history');

      const data = await response.json();
      setOptimizationRuns(data.runs || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Optimization history fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'RUNNING':
        return <PlayIcon className="h-5 w-5 text-blue-500" />;
      case 'CANCELLED':
        return <PauseIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'COMPLETED':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'FAILED':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'RUNNING':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'CANCELLED':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
    }
  };

  const handleViewDetails = (run) => {
    setSelectedRun(run);
    setShowDetailsModal(true);
  };

  const handleExportResults = async (runId) => {
    try {
      const response = await fetch(`/api/v1/optimization/export/${runId}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `optimization_results_${runId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    }
  };

  const columns = [
    {
      key: 'runId',
      title: 'Run ID',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm text-blue-600">{value}</span>
      )
    },
    {
      key: 'scenario',
      title: 'Scenario',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900">{value}</span>
      )
    },
    {
      key: 'algorithm',
      title: 'Algorithm',
      sortable: true,
      render: (value) => (
        <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">
          {value}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          {getStatusIcon(value)}
          <span className={`ml-2 ${getStatusBadge(value)}`}>
            {value}
          </span>
        </div>
      )
    },
    {
      key: 'solvingTime',
      title: 'Solving Time',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value ? `${value.toFixed(2)}s` : 'N/A'}
        </span>
      )
    },
    {
      key: 'objectiveValue',
      title: 'Objective Value',
      sortable: true,
      render: (value) => (
        <span className="text-sm font-medium text-gray-900">
          {value ? value.toFixed(4) : 'N/A'}
        </span>
      )
    },
    {
      key: 'improvement',
      title: 'Improvement',
      sortable: true,
      render: (value, row) => {
        if (!value) return <span className="text-gray-400">N/A</span>;
        const isPositive = value > 0;
        return (
          <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{value.toFixed(1)}%
          </span>
        );
      }
    },
    {
      key: 'createdAt',
      title: 'Created',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {new Date(value).toLocaleString()}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleViewDetails(row)}
            className="text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          {row.status === 'COMPLETED' && (
            <button
              onClick={() => handleExportResults(row.id)}
              className="text-green-600 hover:text-green-800"
              title="Export Results"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  const OptimizationDetailsModal = () => {
    if (!selectedRun) return null;

    return (
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={`Optimization Run Details - ${selectedRun.runId}`}
        size="large"
      >
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Scenario</label>
                <p className="text-sm text-gray-900">{selectedRun.scenario}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Algorithm</label>
                <p className="text-sm text-gray-900">{selectedRun.algorithm}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="flex items-center mt-1">
                  {getStatusIcon(selectedRun.status)}
                  <span className="ml-2 text-sm text-gray-900">{selectedRun.status}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Solving Time</label>
                <p className="text-sm text-gray-900">
                  {selectedRun.solvingTime ? `${selectedRun.solvingTime.toFixed(2)} seconds` : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Objective Value</label>
                <p className="text-sm text-gray-900">
                  {selectedRun.objectiveValue ? selectedRun.objectiveValue.toFixed(4) : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Created At</label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedRun.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Parameters */}
          {selectedRun.parameters && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Parameters</h4>
              <div className="bg-gray-50 rounded-md p-4">
                <pre className="text-xs text-gray-700 overflow-x-auto">
                  {JSON.stringify(selectedRun.parameters, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Results */}
          {selectedRun.results && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Results Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedRun.results.trainsOptimized && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Trains Optimized</p>
                    <p className="text-lg font-bold text-blue-700">
                      {selectedRun.results.trainsOptimized}
                    </p>
                  </div>
                )}
                {selectedRun.results.sectionsAnalyzed && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-green-900">Sections Analyzed</p>
                    <p className="text-lg font-bold text-green-700">
                      {selectedRun.results.sectionsAnalyzed}
                    </p>
                  </div>
                )}
                {selectedRun.results.delayReduction && (
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-purple-900">Delay Reduction</p>
                    <p className="text-lg font-bold text-purple-700">
                      {selectedRun.results.delayReduction.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Details */}
          {selectedRun.status === 'FAILED' && selectedRun.error && (
            <div>
              <h4 className="font-medium text-red-900 mb-3">Error Details</h4>
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-700">{selectedRun.error}</p>
              </div>
            </div>
          )}
        </div>
      </Modal>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Optimization History</h2>
          <p className="text-sm text-gray-600 mt-1">
            View and analyze past optimization runs and their results
          </p>
        </div>
        <button
          onClick={fetchOptimizationHistory}
          className="btn btn-outline"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="RUNNING">Running</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Algorithm
            </label>
            <select
              value={filters.algorithm}
              onChange={(e) => setFilters(prev => ({ ...prev, algorithm: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Algorithms</option>
              <option value="CP-SAT">CP-SAT</option>
              <option value="HEURISTIC">Heuristic</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <SearchBox
              placeholder="Search runs..."
              value={searchTerm}
              onChange={setSearchTerm}
              size="small"
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <DataTable
          data={optimizationRuns}
          columns={columns}
          loading={loading}
          error={error}
          searchable={false}
          sortable={true}
          pagination={true}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          onSort={setSortConfig}
          emptyMessage="No optimization runs found"
          className="rounded-lg"
        />
      </div>

      {/* Optimization Details Modal */}
      <OptimizationDetailsModal />
    </div>
  );
};

export default OptimizationHistory;