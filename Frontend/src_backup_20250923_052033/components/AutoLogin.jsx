import React, { useEffect, useState } from 'react';
import authService from '../services/authService';

const AutoLogin = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if already authenticated
        const existingToken = localStorage.getItem('auth_token');
        if (existingToken) {
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        // Auto-login for development
        console.log('Auto-logging in with default credentials...');
        await authService.login({ username: 'admin', password: 'admin123' });
        setIsAuthenticated(true);
        console.log('Auto-login successful');
      } catch (err) {
        console.error('Auto-login failed:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Initializing TrackWise...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Failed</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-yellow-600 text-6xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Authenticated</h1>
          <p className="text-gray-600">Please log in to access the system.</p>
        </div>
      </div>
    );
  }

  return children;
};

export default AutoLogin;