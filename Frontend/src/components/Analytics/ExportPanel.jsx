import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentArrowDownIcon,
  ChevronDownIcon,
  CheckIcon,
  ClockIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

const ExportPanel = ({ onExport }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState(null);

  const exportFormats = [
    {
      id: 'json',
      label: 'JSON Report',
      description: 'Structured data format',
      icon: DocumentTextIcon,
      extension: '.json'
    },
    {
      id: 'csv',
      label: 'CSV Data',
      description: 'Spreadsheet compatible',
      icon: TableCellsIcon,
      extension: '.csv'
    },
    {
      id: 'pdf',
      label: 'PDF Report',
      description: 'Formatted document',
      icon: DocumentTextIcon,
      extension: '.pdf'
    },
    {
      id: 'excel',
      label: 'Excel Workbook',
      description: 'Advanced spreadsheet',
      icon: ChartBarIcon,
      extension: '.xlsx'
    }
  ];

  const handleExport = async (format) => {
    setIsExporting(true);
    
    try {
      await onExport(format);
      setLastExport({
        format: format,
        timestamp: new Date(),
        success: true
      });
    } catch (error) {
      setLastExport({
        format: format,
        timestamp: new Date(),
        success: false,
        error: error.message
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatInfo = (formatId) => {
    return exportFormats.find(f => f.id === formatId);
  };

  return (
    <div className="relative">
      <Menu as="div" className="relative inline-block text-left">
        <Menu.Button
          disabled={isExporting}
          className="btn-primary flex items-center space-x-2"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <DocumentArrowDownIcon className="h-4 w-4" />
              <span>Export</span>
              <ChevronDownIcon className="h-4 w-4" />
            </>
          )}
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
              <h3 className="text-lg font-medium text-gray-900 mb-3">Export Analytics</h3>
              
              {/* Export Options */}
              <div className="space-y-2 mb-4">
                {exportFormats.map((format) => {
                  const Icon = format.icon;
                  return (
                    <Menu.Item key={format.id}>
                      {({ active }) => (
                        <button
                          onClick={() => handleExport(format.id)}
                          disabled={isExporting}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            active && !isExporting
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className="h-5 w-5 text-gray-400" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {format.label}
                              </div>
                              <div className="text-xs text-gray-500">
                                {format.description} • {format.extension}
                              </div>
                            </div>
                          </div>
                        </button>
                      )}
                    </Menu.Item>
                  );
                })}
              </div>

              {/* Export Status */}
              {lastExport && (
                <div className={`p-3 rounded-lg border ${
                  lastExport.success 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-center space-x-2">
                    {lastExport.success ? (
                      <CheckIcon className="h-4 w-4 text-green-600" />
                    ) : (
                      <ClockIcon className="h-4 w-4 text-red-600" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        lastExport.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {lastExport.success ? 'Export Successful' : 'Export Failed'}
                      </p>
                      <p className={`text-xs ${
                        lastExport.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {lastExport.success 
                          ? `${getFormatInfo(lastExport.format)?.label} downloaded`
                          : lastExport.error || 'Unknown error occurred'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Export Options */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Export Options</h4>
                <div className="space-y-2">
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    />
                    Include raw data
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    />
                    Include charts and visualizations
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    />
                    Include sensitive data
                  </label>
                </div>
              </div>

              {/* Export Info */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <ClockIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-gray-600">
                    <p className="font-medium mb-1">Export includes:</p>
                    <ul className="space-y-0.5">
                      <li>• Performance metrics and trends</li>
                      <li>• Delay analysis and statistics</li>
                      <li>• Throughput and utilization data</li>
                      <li>• Optimization effectiveness metrics</li>
                    </ul>
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

export default ExportPanel;