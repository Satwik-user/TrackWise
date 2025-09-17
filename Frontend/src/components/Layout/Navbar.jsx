import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { useWebSocket } from '../../context/WebSocketContext';
import { 
  Bars3Icon, 
  BellIcon, 
  CogIcon,
  UserCircleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

const Navbar = () => {
  const { 
    sidebarOpen, 
    setSidebarOpen, 
    user, 
    alerts,
    getActiveAlerts,
    clearAlerts 
  } = useAppStore();
  
  const { isConnected, reconnectAttempts, maxReconnectAttempts } = useWebSocket();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const activeAlerts = getActiveAlerts();
  const hasUnreadAlerts = activeAlerts.length > 0;

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side */}
          <div className="flex items-center">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Logo and title */}
            <div className="flex items-center ml-4">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-semibold text-gray-900">TrackWise</h1>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            <div className="ml-6 flex items-center">
              <ConnectionStatus 
                isConnected={isConnected}
                reconnectAttempts={reconnectAttempts}
                maxReconnectAttempts={maxReconnectAttempts}
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors relative"
              >
                <BellIcon className="h-6 w-6" />
                {hasUnreadAlerts && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                )}
              </button>

              {/* Notifications dropdown */}
              {notificationsOpen && (
                <NotificationsDropdown
                  alerts={activeAlerts}
                  onClose={() => setNotificationsOpen(false)}
                  onClearAll={clearAlerts}
                />
              )}
            </div>

            {/* User menu */}
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors">
                <UserCircleIcon className="h-6 w-6" />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {user?.name || 'User'}
                </span>
                <ChevronDownIcon className="ml-1 h-4 w-4" />
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
                <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <a
                          href="#"
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } flex items-center px-4 py-2 text-sm text-gray-700`}
                        >
                          <UserCircleIcon className="mr-3 h-4 w-4" />
                          Profile
                        </a>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <a
                          href="#"
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } flex items-center px-4 py-2 text-sm text-gray-700`}
                        >
                          <CogIcon className="mr-3 h-4 w-4" />
                          Settings
                        </a>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } flex items-center w-full px-4 py-2 text-sm text-gray-700 text-left`}
                          onClick={() => {
                            localStorage.removeItem('auth_token');
                            window.location.reload();
                          }}
                        >
                          Sign out
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Connection Status Component
const ConnectionStatus = ({ isConnected, reconnectAttempts, maxReconnectAttempts }) => {
  if (isConnected) {
    return (
      <div className="flex items-center text-sm text-green-600">
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
        Connected
      </div>
    );
  }

  if (reconnectAttempts > 0) {
    return (
      <div className="flex items-center text-sm text-yellow-600">
        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
        Reconnecting ({reconnectAttempts}/{maxReconnectAttempts})
      </div>
    );
  }

  return (
    <div className="flex items-center text-sm text-red-600">
      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
      Disconnected
    </div>
  );
};

// Notifications Dropdown Component
const NotificationsDropdown = ({ alerts, onClose, onClearAll }) => {
  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
          {alerts.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Alerts list */}
      <div className="max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No new notifications
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {alerts.slice(0, 10).map((alert, index) => (
              <AlertItem key={alert.id || index} alert={alert} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {alerts.length > 10 && (
        <div className="p-3 border-t border-gray-200 text-center">
          <button
            onClick={onClose}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all {alerts.length} notifications
          </button>
        </div>
      )}
    </div>
  );
};

// Alert Item Component
const AlertItem = ({ alert }) => {
  const getAlertIcon = (type) => {
    switch (type) {
      case 'ERROR':
        return '🚨';
      case 'WARNING':
        return '⚠️';
      case 'INFO':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'ERROR':
        return 'text-red-600';
      case 'WARNING':
        return 'text-yellow-600';
      case 'INFO':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-start">
        <div className="flex-shrink-0 text-lg">
          {getAlertIcon(alert.type)}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900">
            {alert.message}
          </p>
          <p className={`text-xs mt-1 ${getAlertColor(alert.type)}`}>
            {alert.type} • {formatTime(alert.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Navbar;