import { useState, useCallback, useEffect, useRef } from 'react';

const useNotifications = (options = {}) => {
  const {
    maxNotifications = 10,
    defaultDuration = 5000,
    position = 'top-right',
    enableSound = false,
    persistAcrossSessions = false
  } = options;

  const [notifications, setNotifications] = useState([]);
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const notificationRefs = useRef(new Map());
  const audioRef = useRef(null);

  // Initialize audio for notification sounds
  useEffect(() => {
    if (enableSound) {
      audioRef.current = new Audio('/notification-sound.mp3');
      audioRef.current.volume = 0.5;
    }
  }, [enableSound]);

  // Load persisted notifications on mount
  useEffect(() => {
    if (persistAcrossSessions) {
      const saved = localStorage.getItem('notifications');
      if (saved) {
        try {
          const parsedNotifications = JSON.parse(saved);
          setNotifications(parsedNotifications);
        } catch (error) {
          console.error('Failed to load persisted notifications:', error);
        }
      }
    }
  }, [persistAcrossSessions]);

  // Save notifications to localStorage
  useEffect(() => {
    if (persistAcrossSessions) {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
  }, [notifications, persistAcrossSessions]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      return 'unsupported';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }, []);

  // Add notification
  const addNotification = useCallback((notification) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification = {
      id,
      type: 'info',
      title: '',
      message: '',
      duration: defaultDuration,
      persistent: false,
      actions: [],
      timestamp: new Date(),
      read: false,
      ...notification
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      return updated.slice(0, maxNotifications);
    });

    // Auto-remove non-persistent notifications
    if (!newNotification.persistent && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    // Show browser notification if permission granted
    if (permission === 'granted' && newNotification.showBrowserNotification !== false) {
      try {
        const browserNotification = new Notification(newNotification.title || 'Notification', {
          body: newNotification.message,
          icon: newNotification.icon || '/favicon.ico',
          tag: id,
          requireInteraction: newNotification.persistent
        });

        browserNotification.onclick = () => {
          if (newNotification.onClick) {
            newNotification.onClick();
          }
          browserNotification.close();
          markAsRead(id);
        };

        notificationRefs.current.set(id, browserNotification);
      } catch (error) {
        console.error('Failed to show browser notification:', error);
      }
    }

    // Play sound
    if (enableSound && audioRef.current) {
      audioRef.current.play().catch(err => {
        console.warn('Failed to play notification sound:', err);
      });
    }

    return id;
  }, [defaultDuration, maxNotifications, permission, enableSound]);

  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    // Close browser notification
    const browserNotification = notificationRefs.current.get(id);
    if (browserNotification) {
      browserNotification.close();
      notificationRefs.current.delete(id);
    }
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    // Close all browser notifications
    notificationRefs.current.forEach(notification => {
      notification.close();
    });
    notificationRefs.current.clear();
    
    setNotifications([]);
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Predefined notification types
  const success = useCallback((message, options = {}) => {
    return addNotification({
      type: 'success',
      title: 'Success',
      message,
      duration: 4000,
      ...options
    });
  }, [addNotification]);

  const error = useCallback((message, options = {}) => {
    return addNotification({
      type: 'error',
      title: 'Error',
      message,
      duration: 6000,
      persistent: true,
      ...options
    });
  }, [addNotification]);

  const warning = useCallback((message, options = {}) => {
    return addNotification({
      type: 'warning',
      title: 'Warning',
      message,
      duration: 5000,
      ...options
    });
  }, [addNotification]);

  const info = useCallback((message, options = {}) => {
    return addNotification({
      type: 'info',
      title: 'Information',
      message,
      duration: 4000,
      ...options
    });
  }, [addNotification]);

  // Railway-specific notifications
  const trainAlert = useCallback((message, trainId, options = {}) => {
    return addNotification({
      type: 'warning',
      title: `Train Alert - ${trainId}`,
      message,
      duration: 8000,
      category: 'train',
      trainId,
      ...options
    });
  }, [addNotification]);

  const optimizationComplete = useCallback((results, options = {}) => {
    return addNotification({
      type: 'success',
      title: 'Optimization Complete',
      message: `Optimization completed with ${results.improvement || 0}% improvement`,
      duration: 6000,
      category: 'optimization',
      results,
      ...options
    });
  }, [addNotification]);

  const systemAlert = useCallback((message, severity = 'medium', options = {}) => {
    const type = severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'info';
    return addNotification({
      type,
      title: 'System Alert',
      message,
      duration: severity === 'high' ? 0 : 6000,
      persistent: severity === 'high',
      category: 'system',
      severity,
      ...options
    });
  }, [addNotification]);

  // Filter notifications by category
  const getNotificationsByCategory = useCallback((category) => {
    return notifications.filter(n => n.category === category);
  }, [notifications]);

  // Get notifications by type
  const getNotificationsByType = useCallback((type) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  return {
    // State
    notifications,
    unreadCount,
    permission,
    
    // Basic actions
    addNotification,
    removeNotification,
    clearAll,
    markAsRead,
    markAllAsRead,
    
    // Permission
    requestPermission,
    
    // Predefined types
    success,
    error,
    warning,
    info,
    
    // Railway-specific
    trainAlert,
    optimizationComplete,
    systemAlert,
    
    // Filtering
    getNotificationsByCategory,
    getNotificationsByType,
    
    // Utils
    hasUnread: unreadCount > 0,
    isEmpty: notifications.length === 0
  };
};

export default useNotifications;