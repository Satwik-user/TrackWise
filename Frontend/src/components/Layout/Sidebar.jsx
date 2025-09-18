import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Trains', href: '/trains', icon: '🚂' },
  { name: 'Sections', href: '/sections', icon: '🛤️' },
  { name: 'Optimization', href: '/optimization', icon: '⚡' },
  { name: 'Analytics', href: '/analytics', icon: '📈' },
  { name: 'Real-time View', href: '/realtime', icon: '👁️' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

const Sidebar = ({ open, setOpen }) => {
  const location = useLocation();

  const SidebarContent = () => (
    <div className="flex flex-col h-0 flex-1 bg-gray-800">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <span className="text-white text-xl font-bold">🚂 TrackWise</span>
        </div>
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                onClick={() => setOpen(false)}
              >
                <span className="mr-3 flex-shrink-0 h-6 w-6 text-lg">
                  {item.icon}
                </span>
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      {open && (
        <div className="relative z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 flex z-40">
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-800">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </div>
              <SidebarContent />
            </div>
          </div>
        </div>
      )}

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <SidebarContent />
      </div>
    </>
  );
};

export default Sidebar;