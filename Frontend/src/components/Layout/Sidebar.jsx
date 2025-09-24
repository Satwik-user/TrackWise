import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  MapIcon,
  TruckIcon,
  ChartBarIcon,
  CpuChipIcon,
  EyeIcon,
  CogIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BeakerIcon,
  LightBulbIcon,
  BoltIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { id: 'dashboard', name: 'Dashboard', icon: HomeIcon, path: '/' },
    { id: 'sections', name: 'Sections', icon: MapIcon, path: '/sections' },
    { id: 'trains', name: 'Train Management', icon: TruckIcon, path: '/trains' },
    { id: 'analytics', name: 'Analytics', icon: ChartBarIcon, path: '/analytics' },
    { id: 'optimization', name: 'Optimization Center', icon: CpuChipIcon, path: '/optimization' },
    { id: 'realtime', name: 'Real-time View', icon: EyeIcon, path: '/realtime' },
    
    // Advanced Control Section
    { id: 'divider1', name: 'divider', path: null },
    { id: 'simulation-control', name: 'Simulation Control', icon: BeakerIcon, path: '/simulation-control' },
    { id: 'decision-support', name: 'Decision Support', icon: LightBulbIcon, path: '/decision-support' },
    { id: 'ml-predictions', name: 'ML Predictions', icon: CpuChipIcon, path: '/ml-predictions' },
    { id: 'train-control', name: 'Train Control', icon: CommandLineIcon, path: '/train-control' },
    
    { id: 'divider2', name: 'divider', path: null },
    { id: 'settings', name: 'Settings', icon: CogIcon, path: '/settings' }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">TW</span>
              </div>
              <span className="ml-3 text-xl font-semibold">TrackWise</span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md hover:bg-gray-700"
          >
            {isCollapsed ? (
              <ChevronRightIcon className="h-5 w-5" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigationItems.map((item) => {
          // Handle dividers
          if (item.name === 'divider') {
            return (
              <div key={item.id} className="border-t border-gray-700 my-4"></div>
            );
          }

          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="ml-3">{item.name}</span>}
            </button>
          );
        })}
      </nav>

      {/* System Status */}
      <div className="p-4 border-t border-gray-700">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            {!isCollapsed && <span className="ml-2 text-sm text-gray-300">System Online</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;