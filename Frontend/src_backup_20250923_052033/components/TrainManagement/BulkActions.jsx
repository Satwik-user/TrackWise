import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrashIcon,
  PlayIcon,
  StopIcon,
  PauseIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

const BulkActions = ({ 
  selectedCount, 
  onDelete, 
  onStatusUpdate, 
  onClearSelection 
}) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const statusOptions = [
    { value: 'SCHEDULED', label: 'Scheduled', icon: PauseIcon, color: 'text-blue-600' },
    { value: 'RUNNING', label: 'Running', icon: PlayIcon, color: 'text-green-600' },
    { value: 'STOPPED', label: 'Stopped', icon: StopIcon, color: 'text-yellow-600' },
    { value: 'COMPLETED', label: 'Completed', icon: CheckIcon, color: 'text-gray-600' }
  ];

  const handleDeleteConfirm = () => {
    onDelete();
    setShowConfirmDelete(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-blue-50 border border-blue-200 rounded-lg p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">{selectedCount}</span>
            </div>
            <span className="text-sm font-medium text-blue-900">
              {selectedCount} train{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Status Update Menu */}
            <Menu as="div" className="relative">
              <Menu.Button className="btn-secondary text-sm flex items-center space-x-1">
                <PlayIcon className="h-4 w-4" />
                <span>Update Status</span>
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
                <Menu.Items className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                  <div className="py-1">
                    {statusOptions.map((status) => {
                      const Icon = status.icon;
                      return (
                        <Menu.Item key={status.value}>
                          {({ active }) => (
                            <button
                              onClick={() => onStatusUpdate(status.value)}
                              className={`${
                                active ? 'bg-gray-100' : ''
                              } flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100`}
                            >
                              <Icon className={`mr-3 h-4 w-4 ${status.color}`} />
                              Set to {status.label}
                            </button>
                          )}
                        </Menu.Item>
                      );
                    })}
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>

            {/* Delete Button */}
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="btn-danger text-sm flex items-center space-x-1"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Clear Selection */}
        <button
          onClick={onClearSelection}
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          title="Clear selection"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md mx-4"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Delete Trains</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Are you sure you want to delete {selectedCount} train{selectedCount !== 1 ? 's' : ''}? 
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="btn-danger"
              >
                Delete {selectedCount} Train{selectedCount !== 1 ? 's' : ''}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default BulkActions;