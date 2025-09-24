import React, { useState, useRef } from 'react';
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import Modal from '../Common/Modal';
import LoadingSpinner from '../Common/LoadingSpinner';

const TrainImportExport = ({ isOpen, onClose, onImportComplete }) => {
  const [activeTab, setActiveTab] = useState('import');
  const [importFile, setImportFile] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportFilters, setExportFilters] = useState({
    status: 'all',
    type: 'all',
    dateRange: 'all'
  });
  const fileInputRef = useRef(null);

  const supportedFormats = {
    csv: { name: 'CSV', description: 'Comma-separated values', accept: '.csv' },
    xlsx: { name: 'Excel', description: 'Microsoft Excel file', accept: '.xlsx,.xls' },
    json: { name: 'JSON', description: 'JavaScript Object Notation', accept: '.json' }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const extension = file.name.split('.').pop().toLowerCase();
      if (!['csv', 'xlsx', 'xls', 'json'].includes(extension)) {
        alert('Please select a valid file format (CSV, Excel, or JSON)');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      setImportFile(file);
      setImportResults(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/v1/trains/import', {
        method: 'POST',
        body: formData,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setImportProgress(progress);
        }
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      setImportResults(result);
      
      if (result.success && onImportComplete) {
        onImportComplete(result);
      }
    } catch (error) {
      setImportResults({
        success: false,
        error: error.message,
        imported: 0,
        failed: 0,
        errors: []
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const queryParams = new URLSearchParams({
        format: exportFormat,
        ...exportFilters
      });

      const response = await fetch(`/api/v1/trains/export?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `trains_export_${timestamp}.${exportFormat}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadTemplate = async (format) => {
    try {
      const response = await fetch(`/api/v1/trains/template?format=${format}`);
      if (!response.ok) throw new Error('Failed to download template');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `train_import_template.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Template download failed: ${error.message}`);
    }
  };

  const ImportTab = () => (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Train Data</h3>
        <p className="text-sm text-gray-500 mb-4">
          Drag and drop your file here, or click to browse
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-primary"
        >
          Choose File
        </button>
      </div>

      {/* Selected File */}
      {importFile && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center">
            <DocumentIcon className="h-5 w-5 text-blue-400 mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">{importFile.name}</p>
              <p className="text-xs text-blue-700">
                {(importFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={() => setImportFile(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Import Progress */}
      {isImporting && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Importing...</span>
            <span>{importProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Import Results */}
      {importResults && (
        <div className={`border rounded-md p-4 ${
          importResults.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center mb-3">
            {importResults.success ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />
            )}
            <h4 className={`font-medium ${
              importResults.success ? 'text-green-900' : 'text-red-900'
            }`}>
              Import {importResults.success ? 'Completed' : 'Failed'}
            </h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-sm text-gray-600">Successfully imported:</p>
              <p className="text-lg font-semibold text-green-600">{importResults.imported}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Failed:</p>
              <p className="text-lg font-semibold text-red-600">{importResults.failed}</p>
            </div>
          </div>

          {importResults.errors && importResults.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-red-900 mb-2">Errors:</p>
              <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                {importResults.errors.slice(0, 5).map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="font-mono text-xs mr-2">Row {error.row}:</span>
                    <span>{error.message}</span>
                  </li>
                ))}
                {importResults.errors.length > 5 && (
                  <li className="text-xs italic">
                    ... and {importResults.errors.length - 5} more errors
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Template Downloads */}
      <div className="bg-gray-50 rounded-md p-4">
        <h4 className="font-medium text-gray-900 mb-3">Download Templates</h4>
        <p className="text-sm text-gray-600 mb-3">
          Use these templates to ensure your data is in the correct format
        </p>
        <div className="flex space-x-2">
          {Object.entries(supportedFormats).map(([format, config]) => (
            <button
              key={format}
              onClick={() => downloadTemplate(format)}
              className="btn btn-outline btn-sm"
            >
              {config.name} Template
            </button>
          ))}
        </div>
      </div>

      {/* Import Button */}
      <div className="flex justify-end">
        <button
          onClick={handleImport}
          disabled={!importFile || isImporting}
          className="btn btn-primary"
        >
          {isImporting ? (
            <>
              <LoadingSpinner size="small" color="white" />
              <span className="ml-2">Importing...</span>
            </>
          ) : (
            <>
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              Import Trains
            </>
          )}
        </button>
      </div>
    </div>
  );

  const ExportTab = () => (
    <div className="space-y-6">
      {/* Export Format */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Export Format
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(supportedFormats).map(([format, config]) => (
            <label key={format} className="relative">
              <input
                type="radio"
                name="exportFormat"
                value={format}
                checked={exportFormat === format}
                onChange={(e) => setExportFormat(e.target.value)}
                className="sr-only"
              />
              <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                exportFormat === format
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <h4 className="font-medium text-gray-900">{config.name}</h4>
                <p className="text-sm text-gray-500">{config.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Export Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Train Status
          </label>
          <select
            value={exportFilters.status}
            onChange={(e) => setExportFilters(prev => ({ ...prev, status: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="all">All Status</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="RUNNING">Running</option>
            <option value="DELAYED">Delayed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Train Type
          </label>
          <select
            value={exportFilters.type}
            onChange={(e) => setExportFilters(prev => ({ ...prev, type: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="all">All Types</option>
            <option value="EXPRESS">Express</option>
            <option value="FREIGHT">Freight</option>
            <option value="SUBURBAN">Suburban</option>
            <option value="SPECIAL">Special</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Range
          </label>
          <select
            value={exportFilters.dateRange}
            onChange={(e) => setExportFilters(prev => ({ ...prev, dateRange: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>
      </div>

      {/* Export Preview */}
      <div className="bg-gray-50 rounded-md p-4">
        <h4 className="font-medium text-gray-900 mb-2">Export Preview</h4>
        <p className="text-sm text-gray-600">
          This will export trains matching your selected criteria in {supportedFormats[exportFormat].name} format.
        </p>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="btn btn-primary"
        >
          {isExporting ? (
            <>
              <LoadingSpinner size="small" color="white" />
              <span className="ml-2">Exporting...</span>
            </>
          ) : (
            <>
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export Trains
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import / Export Trains"
      size="large"
    >
      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'import'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowUpTrayIcon className="h-4 w-4 inline mr-2" />
          Import
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'export'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowDownTrayIcon className="h-4 w-4 inline mr-2" />
          Export
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'import' ? <ImportTab /> : <ExportTab />}
    </Modal>
  );
};

export default TrainImportExport;