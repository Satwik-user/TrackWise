import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import {
  HomeIcon,
  TrainIcon,
  MapIcon,
  CpuChipIcon,
  ChartBarIcon,
  EyeIcon,
  BeakerIcon,
  CogIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    description: 'Overview and system status'
  },
  {
    name: 'Real-time View',
    href: '/real-time',
    icon: EyeIcon,
    description: 'Live train positions and status'
  },
  {
    name: 'Train Management',
    href: '/trains',
    icon: TrainIcon,
    description: 'Manage trains and schedules'
  },
  {
    name: 'Section Management',
    href: '/sections',
    icon: MapIcon,
    description: 'Manage railway sections'
  },
  {
    name: 'Optimization',
    href: '/optimization',
    icon: CpuChipIcon,
    description: 'Traffic optimization center'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    description: 'Performance analytics'
  },
  {
    name: 'Simulation',
    href: '/simulation',
    icon: BeakerIcon,
    description: 'Traffic simulation scenarios'
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: CogIcon,
    description: 'System configuration'
  }
];

const Sidebar = () => {
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const location = useLocation();

  return (
    <div className={`fixed left-0 top-16 h-full bg-white border-r border-gray-200 transition-all duration-300 z-30 ${
      sidebarOpen ? 'w-64' : 'w-16'
    }`}>
      {/* Sidebar header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {sidebarOpen && (
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
          </div>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
        >
          {sidebarOpen ? (
            <ChevronLeftIcon className="h-5 w-5" />
          ) : (
            <ChevronRightIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.href;
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`
              }
              title={!sidebarOpen ? `${item.name}: ${item.description}` : ''}
            >
              <item.icon
                className={`flex-shrink-0 h-5 w-5 ${
                  isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'
                }`}
              />
              {sidebarOpen && (
                <div className="ml-3 flex-1">
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                    {item.description}
                  </div>
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar footer */}
      {sidebarOpen && (
        <div className="p-4 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CpuChipIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-blue-900">
                  System Status
                </p>
                <p className="text-xs text-blue-700">
                  All systems operational
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;