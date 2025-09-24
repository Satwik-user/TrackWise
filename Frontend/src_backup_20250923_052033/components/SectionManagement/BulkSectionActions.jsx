import React from 'react';
import { motion } from 'framer-motion';
import {
  TrashIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const BulkSectionActions = ({
  selectedCount,
  onDelete,
  onToggleMaintenance,
  onClearSelection
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-blue-50 border border-blue-200 rounded-lg p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {selectedCount} section{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onToggleMaintenance(true)}
            className="flex items-center space-x-1 px-3 py-2 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors text-sm"
          >
            <WrenchScrewdriverIcon className="h-4 w-4" />
            <span>Enable Maintenance</span>
          </button>

          <button
            onClick={() => onToggleMaintenance(false)}
            className="flex items-center space-x-1 px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors text-sm"
          >
            <CheckCircleIcon className="h-4 w-4" />
            <span>Disable Maintenance</span>
          </button>

          <button
            onClick={onDelete}
            className="flex items-center space-x-1 px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
          >
            <TrashIcon className="h-4 w-4" />
            <span>Delete</span>
          </button>

          <button
            onClick={onClearSelection}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default BulkSectionActions;