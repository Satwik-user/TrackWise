import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import notificationService from '../services/notificationService';
import websocketService from '../services/websocketService';

const useNotificationStore = create(
  subscribeWithSelector((set, get) => ({
    // State
    notifications: [],
    unreadCount: 0,
    soundEnabled: true,
    browserNotificationsEnabled: false,
    isLoading: false,
    error: null,
    
    // Settings
    maxNotifications: 50,
    defaultDuration: 5000,
    categories: ['general', 'train', 'system', 'optimization', 'maintenance', 'delay'],
    
    // Actions
    setNotifications: (notifications) => {
      set({ 
        notifications,
        unreadCount: notifications.filter(n => !n.read).length
      });
    },
    
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    
    // Add notification
    addNotification: (notification) => {
      const newNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'info',
        title: '',
        message: '',
        timestamp: new Date(),
        read: false,
        persistent: false,
        duration: get().defaultDuration,
        priority: 'normal',
        category: 'general',
        data: {},
        ...notification
      };

      const { notifications, maxNotifications } = get();
      const updatedNotifications = [newNotification, ...notifications].slice(0, maxNotifications);
      
      set({
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.read).length
      });

      // Handle browser notification
      if (get().browserNotificationsEnabled && newNotification.showBrowser !== false) {
        get().showBrowserNotification(newNotification);
      }

      // Auto-remove if not persistent
      if (!newNotification.persistent && newNotification.duration > 0) {
        setTimeout(() => {
          get().removeNotification(newNotification.id);
        }, newNotification.duration);
      }

      return newNotification.id;
    },

    // Remove notification
    removeNotification: (id) => {
      const { notifications } = get();
      const updatedNotifications = notifications.filter(n => n.id !== id);
      
      set({
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.read).length
      });
    },

    // Mark as read
    markAsRead: (id) => {
      const { notifications } = get();
      const updatedNotifications = notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      );
      
      set({
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.read).length
      });
    },

    // Mark all as read
    markAllAsRead: () => {
      const { notifications } = get();
      const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
      
      set({
        notifications: updatedNotifications,
        unreadCount: 0
      });
    },

    // Clear all notifications
    clearAll: () => {
      set({
        notifications: [],
        unreadCount: 0
      });
    },

    // Clear by category
    clearByCategory: (category) => {
      const { notifications } = get();
      const updatedNotifications = notifications.filter(n => n.category !== category);
      
      set({
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.read).length
      });
    },

    // Predefined notification types
    success: (message, options = {}) => {
      return get().addNotification({
        type: 'success',
        title: 'Success',
        message,
        duration: 4000,
        ...options
      });
    },

    error: (message, options = {}) => {
      return get().addNotification({
        type: 'error',
        title: 'Error',
        message,
        duration: 6000,
        persistent: true,
        ...options
      });
    },

    warning: (message, options = {}) => {
      return get().addNotification({
        type: 'warning',
        title: 'Warning',
        message,
        duration: 5000,
        ...options
      });
    },

    info: (message, options = {}) => {
      return get().addNotification({
        type: 'info',
        title: 'Information',
        message,
        duration: 4000,
        ...options
      });
    },

    // Railway-specific notifications
    trainAlert: (message, trainId, options = {}) => {
      return get().addNotification({
        type: 'warning',
        title: `Train Alert - ${trainId}`,
        message,
        duration: 8000,
        category: 'train',
        priority: 'high',
        data: { trainId },
        ...options
      });
    },

    delayAlert: (trainId, delay, expectedArrival, options = {}) => {
      return get().addNotification({
        type: 'warning',
        title: `Train Delay - ${trainId}`,
        message: `Delayed by ${delay} minutes. New arrival: ${expectedArrival}`,
        category: 'delay',
        priority: delay > 15 ? 'high' : 'normal',
        persistent: delay > 30,
        data: { trainId, delay, expectedArrival },
        ...options
      });
    },

    optimizationComplete: (results, options = {}) => {
      return get().addNotification({
        type: 'success',
        title: 'Optimization Complete',
        message: `Optimization completed with ${results.improvement || 0}% improvement`,
        duration: 6000,
        category: 'optimization',
        data: results,
        ...options
      });
    },

    systemAlert: (message, severity = 'medium', options = {}) => {
      const type = severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'info';
      return get().addNotification({
        type,
        title: 'System Alert',
        message,
        duration: severity === 'high' ? 0 : 6000,
        persistent: severity === 'high',
        category: 'system',
        priority: severity === 'high' ? 'high' : 'normal',
        data: { severity },
        ...options
      });
    },

    maintenanceAlert: (sectionId, message, options = {}) => {
      return get().addNotification({
        type: 'info',
        title: `Maintenance Alert - Section ${sectionId}`,
        message,
        category: 'maintenance',
        priority: 'normal',
        persistent: true,
        data: { sectionId },
        ...options
      });
    },

    // Browser notifications
    showBrowserNotification: (notification) => {
      if (!get().browserNotificationsEnabled) return;
      
      try {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: notification.icon || '/favicon.ico',
          tag: notification.id,
          requireInteraction: notification.priority === 'high'
        });

        browserNotification.onclick = () => {
          get().markAsRead(notification.id);
          if (notification.onClick) {
            notification.onClick();
          }
          browserNotification.close();
        };

        if (notification.duration > 0) {
          setTimeout(() => {
            browserNotification.close();
          }, notification.duration);
        }

      } catch (error) {
        console.error('Browser notification failed:', error);
      }
    },

    // Settings management
    setSoundEnabled: (enabled) => {
      set({ soundEnabled: enabled });
      localStorage.setItem('notificationSoundEnabled', enabled.toString());
    },

    setBrowserNotificationsEnabled: async (enabled) => {
      if (enabled && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        const actuallyEnabled = permission === 'granted';
        set({ browserNotificationsEnabled: actuallyEnabled });
        localStorage.setItem('browserNotificationsEnabled', actuallyEnabled.toString());
        return actuallyEnabled;
      } else {
        set({ browserNotificationsEnabled: false });
        localStorage.setItem('browserNotificationsEnabled', 'false');
        return false;
      }
    },

    setMaxNotifications: (max) => {
      set({ maxNotifications: max });
      const { notifications } = get();
      if (notifications.length > max) {
        set({ 
          notifications: notifications.slice(0, max),
          unreadCount: notifications.slice(0, max).filter(n => !n.read).length
        });
      }
    },

    setDefaultDuration: (duration) => {
      set({ defaultDuration: duration });
    },

    // Filtering and searching
    getNotificationsByCategory: (category) => {
      return get().notifications.filter(n => n.category === category);
    },

    getNotificationsByType: (type) => {
      return get().notifications.filter(n => n.type === type);
    },

    getUnreadNotifications: () => {
      return get().notifications.filter(n => !n.read);
    },

    getHighPriorityNotifications: () => {
      return get().notifications.filter(n => n.priority === 'high' && !n.read);
    },

    searchNotifications: (query) => {
      const { notifications } = get();
      const lowerQuery = query.toLowerCase();
      return notifications.filter(n =>
        n.title.toLowerCase().includes(lowerQuery) ||
        n.message.toLowerCase().includes(lowerQuery)
      );
    },

    // Statistics
    getStatistics: () => {
      const { notifications } = get();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const todayNotifications = notifications.filter(n => 
        new Date(n.timestamp) >= today
      );

      const weekNotifications = notifications.filter(n => 
        new Date(n.timestamp) >= thisWeek
      );

      const byCategory = {};
      const byType = {};
      
      notifications.forEach(n => {
        byCategory[n.category] = (byCategory[n.category] || 0) + 1;
        byType[n.type] = (byType[n.type] || 0) + 1;
      });

      return {
        total: notifications.length,
        unread: get().unreadCount,
        today: todayNotifications.length,
        thisWeek: weekNotifications.length,
        byCategory,
        byType,
        highPriority: get().getHighPriorityNotifications().length
      };
    },

    // Load settings from localStorage
    loadSettings: () => {
      try {
        const soundEnabled = localStorage.getItem('notificationSoundEnabled');
        const browserEnabled = localStorage.getItem('browserNotificationsEnabled');
        
        set({
          soundEnabled: soundEnabled !== null ? soundEnabled === 'true' : true,
          browserNotificationsEnabled: browserEnabled !== null ? browserEnabled === 'true' : false
        });
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    },

    // Initialize WebSocket listeners
    initializeWebSocketListeners: () => {
      websocketService.on('message', (data) => {
        if (data.type === 'notification') {
          get().addNotification(data.notification);
        } else if (data.type === 'train_alert') {
          get().trainAlert(data.message, data.trainId, { data });
        } else if (data.type === 'system_alert') {
          get().systemAlert(data.message, data.severity, { data });
        } else if (data.type === 'optimization_complete') {
          get().optimizationComplete(data, { data });
        } else if (data.type === 'delay_alert') {
          get().delayAlert(data.trainId, data.delay, data.expectedArrival, { data });
        }
      });
    },

    // Cleanup
    cleanup: () => {
      set({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        error: null
      });
    }
  }))
);

// Initialize settings and WebSocket listeners
useNotificationStore.getState().loadSettings();
useNotificationStore.getState().initializeWebSocketListeners();

// Subscribe to notification changes for persistence
useNotificationStore.subscribe(
  (state) => state.notifications,
  (notifications) => {
    // Save persistent notifications to localStorage
    const persistentNotifications = notifications.filter(n => n.persistent);
    try {
      localStorage.setItem('persistentNotifications', JSON.stringify(persistentNotifications));
    } catch (error) {
      console.error('Failed to save persistent notifications:', error);
    }
  }
);

// Load persistent notifications on initialization
try {
  const saved = localStorage.getItem('persistentNotifications');
  if (saved) {
    const persistentNotifications = JSON.parse(saved);
    // Filter out old notifications (older than 24 hours)
    const validNotifications = persistentNotifications.filter(n => 
      (Date.now() - new Date(n.timestamp).getTime()) < 24 * 60 * 60 * 1000
    );
    useNotificationStore.getState().setNotifications(validNotifications);
  }
} catch (error) {
  console.error('Failed to load persistent notifications:', error);
}

export default useNotificationStore;