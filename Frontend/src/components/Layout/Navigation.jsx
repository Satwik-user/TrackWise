import React from 'react';
import { useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  TruckIcon, 
  MapIcon, 
  CpuChipIcon,
  ChartBarIcon,
  ClockIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const Navigation = ({ className = "", vertical = true, onNavigate }) => {
  const location = useLocation();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: HomeIcon,
      current: location.pathname === '/'
    },
    {
      name: 'Train Management',
      href: '/trains',
      icon: TruckIcon,
      current: location.pathname === '/trains'
    },
    {
      name: 'Section Management',
      href: '/sections',
      icon: MapIcon,
      current: location.pathname === '/sections'
    },
    {
      name: 'Real-Time View',
      href: '/realtime',
      icon: ClockIcon,
      current: location.pathname === '/realtime'
    },
    {
      name: 'Optimization Center',
      href: '/optimization',
      icon: CpuChipIcon,
      current: location.pathname === '/optimization'
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: ChartBarIcon,
      current: location.pathname === '/analytics'
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Cog6ToothIcon,
      current: location.pathname === '/settings'
    }
  ];

  const handleNavigation = (item) => {
    if (onNavigate) {
      onNavigate(item);
    }
  };

  if (vertical) {
    return (
      <nav className={`space-y-1 ${className}`}>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.name}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                handleNavigation(item);
              }}
              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                ${
                  item.current
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
              aria-current={item.current ? 'page' : undefined}
            >
              <Icon 
                className={`
                  flex-shrink-0 h-5 w-5 mr-3
                  ${item.current ? 'text-blue-500' : 'text-gray-400'}
                `}
              />
              {item.name}
            </a>
          );
        })}
      </nav>
    );
  }

  // Horizontal navigation
  return (
    <nav className={`flex space-x-8 ${className}`}>
      {navigationItems.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.name}
            href={item.href}
            onClick={(e) => {
              e.preventDefault();
              handleNavigation(item);
            }}
            className={`
              flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
              ${
                item.current
                  ? 'text-blue-700 border-b-2 border-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }
            `}
            aria-current={item.current ? 'page' : undefined}
          >
            <Icon className="flex-shrink-0 h-4 w-4 mr-2" />
            {item.name}
          </a>
        );
      })}
    </nav>
  );
};

export default Navigation;