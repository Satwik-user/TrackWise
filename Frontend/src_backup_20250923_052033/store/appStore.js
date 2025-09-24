import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Main application store using Zustand
export const useAppStore = create(
  devtools(
    persist(
      (set, get) => ({
        // Application State
        isInitialized: false,
        isLoading: false,
        error: null,
        user: null,
        preferences: {
          theme: 'light',
          refreshInterval: 30000, // 30 seconds
          autoRefresh: true,
          showNotifications: true,
          language: 'en',
        },

        // Real-time Data
        trains: [],
        sections: [],
        optimizationRuns: [],
        alerts: [],
        metrics: {},

        // UI State
        selectedTrain: null,
        selectedSection: null,
        sidebarOpen: true,
        currentView: 'dashboard',
        
        // Filter and Search State
        filters: {
          trainType: '',
          trainStatus: '',
          sectionType: '',
          priority: '',
          dateRange: { start: null, end: null },
        },
        searchQuery: '',

        // WebSocket Connection State
        wsConnected: false,
        wsReconnecting: false,

        // Actions
        initializeApp: async () => {
          set({ isLoading: true, error: null });
          try {
            // Simulate initialization delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            set({
              isInitialized: true,
              isLoading: false,
              user: {
                id: 1,
                name: 'Railway Controller',
                role: 'operator',
                permissions: ['read', 'write', 'optimize']
              }
            });
          } catch (error) {
            set({ error: error.message, isLoading: false });
          }
        },

        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),
        
        setLoading: (isLoading) => set({ isLoading }),
        
        // Train Management
        setTrains: (trains) => set({ trains }),
        addTrain: (train) => set((state) => ({
          trains: [...state.trains, train]
        })),
        updateTrain: (trainId, updates) => set((state) => ({
          trains: state.trains.map(train =>
            train.id === trainId ? { ...train, ...updates } : train
          )
        })),
        removeTrain: (trainId) => set((state) => ({
          trains: state.trains.filter(train => train.id !== trainId)
        })),
        setSelectedTrain: (train) => set({ selectedTrain: train }),

        // Section Management
        setSections: (sections) => set({ sections }),
        addSection: (section) => set((state) => ({
          sections: [...state.sections, section]
        })),
        updateSection: (sectionId, updates) => set((state) => ({
          sections: state.sections.map(section =>
            section.id === sectionId ? { ...section, ...updates } : section
          )
        })),
        setSelectedSection: (section) => set({ selectedSection: section }),

        // Optimization Management
        setOptimizationRuns: (runs) => set({ optimizationRuns: runs }),
        addOptimizationRun: (run) => set((state) => ({
          optimizationRuns: [run, ...state.optimizationRuns]
        })),

        // Alerts Management
        setAlerts: (alerts) => set({ alerts }),
        addAlert: (alert) => set((state) => ({
          alerts: [alert, ...state.alerts].slice(0, 50) // Keep only latest 50
        })),
        removeAlert: (alertId) => set((state) => ({
          alerts: state.alerts.filter(alert => alert.id !== alertId)
        })),
        clearAlerts: () => set({ alerts: [] }),

        // Metrics
        setMetrics: (metrics) => set({ metrics }),
        updateMetrics: (newMetrics) => set((state) => ({
          metrics: { ...state.metrics, ...newMetrics }
        })),

        // UI State Management
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setCurrentView: (view) => set({ currentView: view }),
        
        // Filters and Search
        setFilters: (filters) => set((state) => ({
          filters: { ...state.filters, ...filters }
        })),
        clearFilters: () => set({
          filters: {
            trainType: '',
            trainStatus: '',
            sectionType: '',
            priority: '',
            dateRange: { start: null, end: null },
          }
        }),
        setSearchQuery: (query) => set({ searchQuery: query }),

        // WebSocket State
        setWsConnected: (connected) => set({ wsConnected: connected }),
        setWsReconnecting: (reconnecting) => set({ wsReconnecting: reconnecting }),

        // Preferences
        updatePreferences: (newPreferences) => set((state) => ({
          preferences: { ...state.preferences, ...newPreferences }
        })),

        // Computed getters
        getFilteredTrains: () => {
          const { trains, filters, searchQuery } = get();
          
          return trains.filter(train => {
            // Apply type filter
            if (filters.trainType && train.train_type !== filters.trainType) {
              return false;
            }
            
            // Apply status filter
            if (filters.trainStatus && train.status !== filters.trainStatus) {
              return false;
            }
            
            // Apply priority filter
            if (filters.priority && train.priority.toString() !== filters.priority) {
              return false;
            }
            
            // Apply search query
            if (searchQuery) {
              const query = searchQuery.toLowerCase();
              return (
                train.train_number.toLowerCase().includes(query) ||
                train.train_name.toLowerCase().includes(query)
              );
            }
            
            return true;
          });
        },

        getFilteredSections: () => {
          const { sections, filters, searchQuery } = get();
          
          return sections.filter(section => {
            // Apply type filter
            if (filters.sectionType && section.section_type !== filters.sectionType) {
              return false;
            }
            
            // Apply search query
            if (searchQuery) {
              const query = searchQuery.toLowerCase();
              return (
                section.section_code.toLowerCase().includes(query) ||
                section.section_name.toLowerCase().includes(query)
              );
            }
            
            return true;
          });
        },

        getTrainsByStatus: () => {
          const { trains } = get();
          return trains.reduce((acc, train) => {
            acc[train.status] = (acc[train.status] || 0) + 1;
            return acc;
          }, {});
        },

        getSectionUtilization: () => {
          const { sections } = get();
          if (!sections.length) return 0;
          
          const totalOccupancy = sections.reduce((sum, section) => sum + section.current_occupancy, 0);
          const totalCapacity = sections.reduce((sum, section) => sum + section.max_occupancy, 0);
          
          return totalCapacity > 0 ? (totalOccupancy / totalCapacity) * 100 : 0;
        },

        getActiveAlerts: () => {
          const { alerts } = get();
          return alerts.filter(alert => alert.active !== false);
        },

        // Reset store (for testing or logout)
        reset: () => set({
          isInitialized: false,
          isLoading: false,
          error: null,
          trains: [],
          sections: [],
          optimizationRuns: [],
          alerts: [],
          metrics: {},
          selectedTrain: null,
          selectedSection: null,
          wsConnected: false,
          wsReconnecting: false,
        }),
      }),
      {
        name: 'trackwise-app-store',
        partialize: (state) => ({
          preferences: state.preferences,
          filters: state.filters,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    {
      name: 'trackwise-app-store',
    }
  )
);

// Selector hooks for better performance
export const useTrains = () => useAppStore(state => state.trains);
export const useSections = () => useAppStore(state => state.sections);
export const useAlerts = () => useAppStore(state => state.alerts);
export const useMetrics = () => useAppStore(state => state.metrics);
export const useFilters = () => useAppStore(state => state.filters);
export const usePreferences = () => useAppStore(state => state.preferences);
export const useWsStatus = () => useAppStore(state => ({ 
  connected: state.wsConnected, 
  reconnecting: state.wsReconnecting 
}));