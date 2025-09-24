import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { WebSocketProvider } from './context/WebSocketContext';

// Layout Components
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import ErrorBoundary from './components/Common/ErrorBoundary';

// Page Components  
import Dashboard from './pages/Dashboard';
import TrainManagement from './pages/TrainManagement';
import SectionManagement from './pages/SectionManagement';
import OptimizationCenter from './pages/OptimizationCenter';
import Analytics from './pages/Analytics';
import RealTimeView from './pages/RealTimeView';
import Settings from './pages/Settings';

// Services
import { authService } from './services/authService';

import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (token) {
        // Verify token with backend
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
          return;
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('auth_token');
        }
      }
      
      // Auto-login with default credentials for development
      console.log('No valid token found, attempting auto-login...');
      try {
        const response = await authService.login({ username: 'admin', password: 'admin123' });
        setUser(response.user || { username: 'admin', full_name: 'System Administrator' });
        setIsAuthenticated(true);
        console.log('Auto-login successful');
      } catch (loginError) {
        console.error('Auto-login failed:', loginError);
        // Don't throw - let user manually login
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-white mt-4 text-lg">Loading TrackWise...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <WebSocketProvider>
      <Router>
        <div className="h-screen flex overflow-hidden bg-gray-100">
          {/* Sidebar */}
          <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
          
          {/* Main content */}
          <div className="flex flex-col w-0 flex-1 overflow-hidden">
            <Header 
              user={user} 
              onLogout={handleLogout}
              onMenuClick={() => setSidebarOpen(true)}
            />
            
            <main className="flex-1 relative overflow-y-auto focus:outline-none">
              <div className="py-6">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                  <Route path="/dashboard" element={
                    <ErrorBoundary fallbackMessage="Dashboard is temporarily unavailable">
                      <Dashboard />
                    </ErrorBoundary>
                  } />
                  <Route path="/trains" element={
                    <ErrorBoundary fallbackMessage="Train Management is temporarily unavailable">
                      <TrainManagement />
                    </ErrorBoundary>
                  } />
                  <Route path="/sections" element={
                    <ErrorBoundary fallbackMessage="Section Management is temporarily unavailable">
                      <SectionManagement />
                    </ErrorBoundary>
                  } />
                  <Route path="/optimization" element={
                    <ErrorBoundary fallbackMessage="Optimization Center is temporarily unavailable">
                      <OptimizationCenter />
                    </ErrorBoundary>
                  } />
                  <Route path="/analytics" element={
                    <ErrorBoundary fallbackMessage="Analytics is temporarily unavailable">
                      <Analytics />
                    </ErrorBoundary>
                  } />
                  <Route path="/realtime" element={
                    <ErrorBoundary fallbackMessage="Real-time View is temporarily unavailable">
                      <RealTimeView />
                    </ErrorBoundary>
                  } />
                  <Route path="/settings" element={
                    <ErrorBoundary fallbackMessage="Settings is temporarily unavailable">
                      <Settings />
                    </ErrorBoundary>
                  } />
                </Routes>
              </div>
            </main>
          </div>
        </div>
        
        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </Router>
    </WebSocketProvider>
  );
}

// Login Page Component
const LoginPage = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await onLogin(credentials);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-600">
            <span className="text-white text-xl font-bold">🚂</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Sign in to TrackWise
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Railway Optimization System
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-400">
              Default credentials:
              <br />
              <span className="text-white">admin / admin123</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;