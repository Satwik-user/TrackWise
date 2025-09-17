import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useWebSocket } from '../../context/WebSocketContext';

const Layout = () => {
  const { sidebarOpen, currentView } = useAppStore();
  const { isConnected } = useWebSocket();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <Navbar />
      
      <div className="flex h-screen pt-16">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content Area */}
        <main 
          className={`flex-1 overflow-hidden transition-all duration-300 ${
            sidebarOpen ? 'ml-64' : 'ml-16'
          }`}
        >
          {/* Connection Status Banner */}
          {!isConnected && (
            <div className="bg-red-50 border-b border-red-200 px-4 py-2">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">
                    Connection lost. Attempting to reconnect...
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Page Content */}
          <div className="h-full overflow-y-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;