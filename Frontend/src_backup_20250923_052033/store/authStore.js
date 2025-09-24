import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import authService from '../services/authService';

const useAuthStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // State
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        permissions: [],
        sessionTimeout: null,
        lastActivity: Date.now(),
        
        // Actions
        setUser: (user) => set({ user }),
        setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        setPermissions: (permissions) => set({ permissions }),
        
        // Authentication methods
        login: async (credentials) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await authService.login(credentials);
            
            if (response.success) {
              set({
                user: response.user,
                isAuthenticated: true,
                permissions: response.permissions || [],
                lastActivity: Date.now()
              });
              
              // Start session monitoring
              get().startSessionMonitoring();
              
              return { success: true };
            } else {
              set({ error: response.error });
              return { success: false, error: response.error };
            }
          } catch (error) {
            const errorMessage = error.message || 'Login failed';
            set({ error: errorMessage });
            return { success: false, error: errorMessage };
          } finally {
            set({ isLoading: false });
          }
        },

        logout: async () => {
          set({ isLoading: true });
          
          try {
            await authService.logout();
          } catch (error) {
            console.error('Logout error:', error);
          } finally {
            set({
              user: null,
              isAuthenticated: false,
              permissions: [],
              error: null,
              isLoading: false,
              sessionTimeout: null
            });
            
            // Clear session monitoring
            get().stopSessionMonitoring();
          }
        },

        refreshToken: async () => {
          try {
            const token = await authService.refreshToken();
            set({ lastActivity: Date.now() });
            return token;
          } catch (error) {
            // Token refresh failed, logout user
            get().logout();
            throw error;
          }
        },

        verifyToken: async () => {
          set({ isLoading: true });
          
          try {
            const response = await authService.verifyToken();
            
            if (response && response.user) {
              set({
                user: response.user,
                isAuthenticated: true,
                permissions: response.permissions || [],
                lastActivity: Date.now()
              });
              
              get().startSessionMonitoring();
              return true;
            } else {
              set({
                user: null,
                isAuthenticated: false,
                permissions: []
              });
              return false;
            }
          } catch (error) {
            set({
              user: null,
              isAuthenticated: false,
              permissions: [],
              error: error.message
            });
            return false;
          } finally {
            set({ isLoading: false });
          }
        },

        updateProfile: async (profileData) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await authService.updateProfile(profileData);
            
            if (response.user) {
              set({ user: response.user });
            }
            
            return { success: true };
          } catch (error) {
            const errorMessage = error.message || 'Profile update failed';
            set({ error: errorMessage });
            return { success: false, error: errorMessage };
          } finally {
            set({ isLoading: false });
          }
        },

        changePassword: async (currentPassword, newPassword) => {
          set({ isLoading: true, error: null });
          
          try {
            await authService.changePassword(currentPassword, newPassword);
            return { success: true };
          } catch (error) {
            const errorMessage = error.message || 'Password change failed';
            set({ error: errorMessage });
            return { success: false, error: errorMessage };
          } finally {
            set({ isLoading: false });
          }
        },

        // Permission checks
        hasPermission: (permission) => {
          const { permissions, user } = get();
          if (!permissions || permissions.length === 0) return false;
          return permissions.includes(permission) || user?.role === 'admin';
        },

        hasRole: (role) => {
          const { user } = get();
          return user?.role === role || user?.role === 'admin';
        },

        hasAnyPermission: (permissionList) => {
          const { permissions, user } = get();
          if (!permissions || permissions.length === 0) return false;
          if (user?.role === 'admin') return true;
          return permissionList.some(permission => permissions.includes(permission));
        },

        // Session management
        updateActivity: () => {
          set({ lastActivity: Date.now() });
        },

        startSessionMonitoring: () => {
          const sessionDuration = 30 * 60 * 1000; // 30 minutes
          const warningTime = 5 * 60 * 1000; // 5 minutes before expiry
          
          const checkSession = () => {
            const { lastActivity, isAuthenticated } = get();
            const now = Date.now();
            const timeSinceActivity = now - lastActivity;
            
            if (!isAuthenticated) return;
            
            if (timeSinceActivity >= sessionDuration) {
              // Session expired
              get().logout();
            } else if (timeSinceActivity >= sessionDuration - warningTime) {
              // Show warning
              set({ sessionTimeout: sessionDuration - timeSinceActivity });
            } else {
              set({ sessionTimeout: null });
            }
          };
          
          // Check every minute
          const interval = setInterval(checkSession, 60000);
          set({ sessionInterval: interval });
        },

        stopSessionMonitoring: () => {
          const { sessionInterval } = get();
          if (sessionInterval) {
            clearInterval(sessionInterval);
            set({ sessionInterval: null });
          }
        },

        extendSession: () => {
          set({ lastActivity: Date.now(), sessionTimeout: null });
        },

        // Railway-specific permissions
        canManageTrains: () => {
          return get().hasPermission('manage_trains') || get().hasRole('operator');
        },

        canManageSections: () => {
          return get().hasPermission('manage_sections') || get().hasRole('operator');
        },

        canRunOptimization: () => {
          return get().hasPermission('run_optimization') || get().hasRole('optimizer');
        },

        canViewAnalytics: () => {
          return get().hasPermission('view_analytics') || get().hasRole('analyst');
        },

        canManageUsers: () => {
          return get().hasPermission('manage_users') || get().hasRole('admin');
        },

        canAccessSystemSettings: () => {
          return get().hasPermission('system_settings') || get().hasRole('admin');
        },

        // Error handling
        clearError: () => set({ error: null }),

        // State helpers
        getUser: () => get().user,
        isLoggedIn: () => get().isAuthenticated,
        getPermissions: () => get().permissions,
        getError: () => get().error,
        getLastActivity: () => get().lastActivity,
        getSessionTimeout: () => get().sessionTimeout
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          permissions: state.permissions,
          lastActivity: state.lastActivity
        }),
        onRehydrateStorage: (state) => {
          return (state, error) => {
            if (error) {
              console.error('Auth store rehydration failed:', error);
            } else if (state?.isAuthenticated) {
              // Verify token on rehydration
              state.verifyToken();
            }
          };
        }
      }
    )
  )
);

// Subscribe to auth state changes for side effects
useAuthStore.subscribe(
  (state) => state.isAuthenticated,
  (isAuthenticated, previousIsAuthenticated) => {
    if (isAuthenticated && !previousIsAuthenticated) {
      console.log('User logged in');
      // Trigger any login side effects
    } else if (!isAuthenticated && previousIsAuthenticated) {
      console.log('User logged out');
      // Trigger any logout side effects
    }
  }
);

// Subscribe to user changes
useAuthStore.subscribe(
  (state) => state.user,
  (user) => {
    if (user) {
      // Update user activity on any user change
      useAuthStore.getState().updateActivity();
    }
  }
);

export default useAuthStore;