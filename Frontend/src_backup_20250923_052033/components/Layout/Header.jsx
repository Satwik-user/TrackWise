import React from 'react';

const Header = ({ user, onLogout, onMenuClick }) => {
  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
      <button
        type="button"
        className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
        onClick={onMenuClick}
      >
        ☰
      </button>
      
      <div className="flex-1 px-4 flex justify-between">
        <div className="flex-1 flex">
          <div className="w-full flex md:ml-0">
            <div className="relative w-full text-gray-400 focus-within:text-gray-600">
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                <span className="h-5 w-5 text-2xl">🚂</span>
              </div>
              <div className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent text-lg font-semibold">
                TrackWise Railway System
              </div>
            </div>
          </div>
        </div>
        
        <div className="ml-4 flex items-center md:ml-6">
          <button
            type="button"
            className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            🔔
          </button>

          <div className="ml-3 relative">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <span className="h-8 w-8 text-gray-400">👤</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.full_name || user?.username || 'User'}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {user?.email || 'user@trackwise.com'}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="bg-white border border-gray-300 rounded-md px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;