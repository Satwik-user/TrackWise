import React from 'react';

const Footer = ({ className = "" }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`bg-white border-t border-gray-200 ${className}`}>
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          {/* Left section - Copyright */}
          <div className="text-sm text-gray-500">
            © {currentYear} TrackWise Railway Optimization. All rights reserved.
          </div>

          {/* Center section - Links */}
          <div className="flex items-center space-x-6">
            <a
              href="/about"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              About
            </a>
            <a
              href="/privacy"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              Terms of Service
            </a>
            <a
              href="/support"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              Support
            </a>
          </div>

          {/* Right section - Version and Status */}
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>v1.0.0</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>System Operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;