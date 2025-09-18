import { useState, useEffect, useCallback, useContext, createContext } from 'react';

// Auth Context
const AuthContext = createContext({});

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissions, setPermissions] = useState([]);

  // Check if user is authenticated on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Verify token with backend
      const response = await fetch('/api/v1/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        setPermissions(userData.permissions || []);
        setIsAuthenticated(true);
      } else {
        // Token is invalid
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        setIsAuthenticated(false);
        setPermissions([]);
      }
    } catch (err) {
      console.error('Auth status check failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      
      // Store tokens
      localStorage.setItem('authToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      // Set user data
      setUser(data.user);
      setPermissions(data.permissions || []);
      setIsAuthenticated(true);

      return { success: true, user: data.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Call logout endpoint
      const token = localStorage.getItem('authToken');
      if (token) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear local state regardless of API call result
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setIsAuthenticated(false);
      setPermissions([]);
      setError(null);
      setIsLoading(false);
    }
  }, []);

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      localStorage.setItem('authToken', data.accessToken);
      
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      return data.accessToken;
    } catch (err) {
      console.error('Token refresh failed:', err);
      await logout();
      throw err;
    }
  };

  const hasPermission = useCallback((permission) => {
    if (!permissions || permissions.length === 0) return false;
    return permissions.includes(permission) || permissions.includes('admin');
  }, [permissions]);

  const hasRole = useCallback((role) => {
    return user?.role === role || user?.role === 'admin';
  }, [user]);

  const updateUser = useCallback((updatedData) => {
    setUser(prev => prev ? { ...prev, ...updatedData } : null);
  }, []);

  const value = {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    permissions,
    
    // Actions
    login,
    logout,
    refreshToken,
    checkAuthStatus,
    updateUser,
    
    // Utilities
    hasPermission,
    hasRole,
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default useAuth;