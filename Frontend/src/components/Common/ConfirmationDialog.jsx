import React from 'react';
import { ExclamationTriangleIcon, InformationCircleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';

const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning", // warning, danger, info, success
  isLoading = false,
  icon = null,
  children = null
}) => {
  const typeConfig = {
    warning: {
      icon: ExclamationTriangleIcon,
      iconColor: "text-yellow-600",
      iconBg: "bg-yellow-100",
      confirmButton: "btn-warning"
    },
    danger: {
      icon: XCircleIcon,
      iconColor: "text-red-600",
      iconBg: "bg-red-100",
      confirmButton: "btn-danger"
    },
    info: {
      icon: InformationCircleIcon,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
      confirmButton: "btn-primary"
    },
    success: {
      icon: CheckCircleIcon,
      iconColor: "text-green-600",
      iconBg: "bg-green-100",
      confirmButton: "btn-success"
    }
  };

  const config = typeConfig[type];
  const IconComponent = icon || config.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="small"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className="flex items-start space-x-4">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.iconBg}`}>
          <IconComponent className={`w-6 h-6 ${config.iconColor}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {title}
          </h3>
          
          <div className="text-sm text-gray-700 mb-4">
            {typeof message === 'string' ? (
              <p>{message}</p>
            ) : (
              message
            )}
          </div>
          
          {children && (
            <div className="mb-4">
              {children}
            </div>
          )}
          
          <div className="flex space-x-3 justify-end">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="btn btn-outline"
            >
              {cancelText}
            </button>
            
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`btn ${config.confirmButton} ${isLoading ? 'btn-disabled' : ''}`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Specific confirmation dialogs for common actions
export const DeleteConfirmation = ({ isOpen, onClose, onConfirm, itemName, itemType = "item", isLoading = false }) => {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      type="danger"
      title={`Delete ${itemType}`}
      message={
        <div>
          <p>Are you sure you want to delete <strong>{itemName}</strong>?</p>
          <p className="mt-2 text-red-600 font-medium">This action cannot be undone.</p>
        </div>
      }
      confirmText="Delete"
      cancelText="Cancel"
      isLoading={isLoading}
    />
  );
};

export const SaveConfirmation = ({ isOpen, onClose, onConfirm, hasUnsavedChanges = false, isLoading = false }) => {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      type="info"
      title="Save Changes"
      message={
        hasUnsavedChanges
          ? "You have unsaved changes. Do you want to save them now?"
          : "Do you want to save the current changes?"
      }
      confirmText="Save"
      cancelText="Discard"
      isLoading={isLoading}
    />
  );
};

export const DiscardChangesConfirmation = ({ isOpen, onClose, onConfirm, isLoading = false }) => {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      type="warning"
      title="Discard Changes"
      message="You have unsaved changes. Are you sure you want to discard them?"
      confirmText="Discard"
      cancelText="Keep Editing"
      isLoading={isLoading}
    />
  );
};

export const MaintenanceModeConfirmation = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  sectionName, 
  enteringMaintenance = true, 
  isLoading = false 
}) => {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      type={enteringMaintenance ? "warning" : "info"}
      title={`${enteringMaintenance ? 'Enter' : 'Exit'} Maintenance Mode`}
      message={
        <div>
          <p>
            Are you sure you want to {enteringMaintenance ? 'enter' : 'exit'} maintenance mode for section{' '}
            <strong>{sectionName}</strong>?
          </p>
          {enteringMaintenance && (
            <p className="mt-2 text-yellow-600 font-medium">
              This will block all train traffic through this section.
            </p>
          )}
        </div>
      }
      confirmText={enteringMaintenance ? "Enter Maintenance" : "Exit Maintenance"}
      cancelText="Cancel"
      isLoading={isLoading}
    />
  );
};

export const OptimizationConfirmation = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  trainsCount, 
  sectionsCount, 
  isLoading = false 
}) => {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      type="info"
      title="Start Optimization"
      message={
        <div>
          <p>Ready to start optimization with:</p>
          <ul className="mt-2 list-disc list-inside text-sm">
            <li>{trainsCount} trains</li>
            <li>{sectionsCount} sections</li>
          </ul>
          <p className="mt-2">This process may take several minutes to complete.</p>
        </div>
      }
      confirmText="Start Optimization"
      cancelText="Cancel"
      isLoading={isLoading}
    />
  );
};

export default ConfirmationDialog;