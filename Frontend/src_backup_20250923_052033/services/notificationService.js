import websocketService from './websocketService';

class NotificationService {
  constructor() {
    this.notifications = [];
    this.subscribers = new Set();
    this.maxNotifications = 100;
    this.defaultDuration = 5000;
    this.audioContext = null;
    this.soundEnabled = true;
    this.browserNotificationsEnabled = false;
    
    // Initialize audio context for notification sounds
    this.initializeAudio();
    
    // Setup WebSocket listeners
    this.setupWebSocketListeners();
    
    // Load saved notifications from localStorage
    this.loadNotifications();
    
    // Request browser notification permission
    this.requestBrowserPermission();
  }

  // Initialize audio for notification sounds
  initializeAudio() {
    try {
      if (typeof AudioContext !== 'undefined') {
        this.audioContext = new AudioContext();
      } else if (typeof webkitAudioContext !== 'undefined') {
        this.audioContext = new webkitAudioContext();
      }
    } catch (error) {
      console.warn('[NotificationService] Audio context not available:', error);
    }
  }

  // Setup WebSocket listeners for real-time notifications
  setupWebSocketListeners() {
    websocketService.on('message', (data) => {
      if (data.type === 'notification') {
        this.addNotification(data.notification);
      } else if (data.type === 'train_alert') {
        this.addTrainAlert(data);
      } else if (data.type === 'system_alert') {
        this.addSystemAlert(data);
      } else if (data.type === 'optimization_complete') {
        this.addOptimizationNotification(data);
      }
    });
  }

  // Load notifications from localStorage
  loadNotifications() {
    try {
      const saved = localStorage.getItem('notifications');
      if (saved) {
        const notifications = JSON.parse(saved);
        this.notifications = notifications.filter(n => 
          !n.persistent || (Date.now() - new Date(n.timestamp).getTime() < 24 * 60 * 60 * 1000)
        );
      }
    } catch (error) {
      console.error('[NotificationService] Failed to load notifications:', error);
    }
  }

  // Save notifications to localStorage
  saveNotifications() {
    try {
      const toSave = this.notifications.filter(n => n.persistent);
      localStorage.setItem('notifications', JSON.stringify(toSave));
    } catch (error) {
      console.error('[NotificationService] Failed to save notifications:', error);
    }
  }

  // Request browser notification permission
  async requestBrowserPermission() {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        this.browserNotificationsEnabled = permission === 'granted';
        return permission;
      } catch (error) {
        console.error('[NotificationService] Permission request failed:', error);
        return 'denied';
      }
    }
    return 'unsupported';
  }

  // Add notification
  addNotification(notification) {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newNotification = {
      id,
      type: 'info',
      title: '',
      message: '',
      timestamp: new Date(),
      read: false,
      persistent: false,
      duration: this.defaultDuration,
      priority: 'normal',
      category: 'general',
      data: {},
      ...notification
    };

    // Add to notifications array
    this.notifications.unshift(newNotification);
    
    // Limit number of notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    // Save to localStorage if persistent
    if (newNotification.persistent) {
      this.saveNotifications();
    }

    // Show browser notification
    if (this.browserNotificationsEnabled && newNotification.showBrowser !== false) {
      this.showBrowserNotification(newNotification);
    }

    // Play notification sound
    if (this.soundEnabled && newNotification.playSound !== false) {
      this.playNotificationSound(newNotification.type);
    }

    // Auto-remove non-persistent notifications
    if (!newNotification.persistent && newNotification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(id);
      }, newNotification.duration);
    }

    // Notify subscribers
    this.notifySubscribers();

    return id;
  }

  // Remove notification
  removeNotification(id) {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      this.saveNotifications();
      this.notifySubscribers();
    }
  }

  // Mark notification as read
  markAsRead(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      this.saveNotifications();
      this.notifySubscribers();
    }
  }

  // Mark all notifications as read
  markAllAsRead() {
    let changed = false;
    this.notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
        changed = true;
      }
    });
    
    if (changed) {
      this.saveNotifications();
      this.notifySubscribers();
    }
  }

  // Clear all notifications
  clearAll() {
    this.notifications = [];
    this.saveNotifications();
    this.notifySubscribers();
  }

  // Clear notifications by category
  clearByCategory(category) {
    this.notifications = this.notifications.filter(n => n.category !== category);
    this.saveNotifications();
    this.notifySubscribers();
  }

  // Show browser notification
  showBrowserNotification(notification) {
    if (!this.browserNotificationsEnabled) return;

    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: notification.icon || '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'high',
        silent: !this.soundEnabled
      });

      browserNotification.onclick = () => {
        this.markAsRead(notification.id);
        if (notification.onClick) {
          notification.onClick();
        }
        browserNotification.close();
      };

      // Auto-close after duration
      if (notification.duration > 0) {
        setTimeout(() => {
          browserNotification.close();
        }, notification.duration);
      }

    } catch (error) {
      console.error('[NotificationService] Browser notification failed:', error);
    }
  }

  // Play notification sound
  playNotificationSound(type = 'info') {
    if (!this.soundEnabled || !this.audioContext) return;

    try {
      // Generate different tones for different notification types
      const frequencies = {
        info: [523.25, 659.25], // C5, E5
        success: [523.25, 659.25, 783.99], // C5, E5, G5
        warning: [466.16, 466.16], // A#4, A#4
        error: [349.23, 293.66] // F4, D4
      };

      const freq = frequencies[type] || frequencies.info;
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(freq[0], this.audioContext.currentTime);
      if (freq[1]) {
        oscillator.frequency.setValueAtTime(freq[1], this.audioContext.currentTime + 0.1);
      }
      
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
      
    } catch (error) {
      console.error('[NotificationService] Sound playback failed:', error);
    }
  }

  // Railway-specific notification methods
  addTrainAlert(data) {
    return this.addNotification({
      type: 'warning',
      title: `Train Alert - ${data.trainId}`,
      message: data.message,
      category: 'train',
      priority: data.severity === 'high' ? 'high' : 'normal',
      persistent: data.severity === 'high',
      data: {
        trainId: data.trainId,
        sectionId: data.sectionId,
        severity: data.severity
      },
      onClick: () => {
        // Navigate to train details
        window.location.href = `/trains/${data.trainId}`;
      }
    });
  }

  addSystemAlert(data) {
    return this.addNotification({
      type: data.severity === 'high' ? 'error' : 'warning',
      title: 'System Alert',
      message: data.message,
      category: 'system',
      priority: data.severity === 'high' ? 'high' : 'normal',
      persistent: data.severity === 'high',
      data: {
        severity: data.severity,
        component: data.component
      }
    });
  }

  addOptimizationNotification(data) {
    return this.addNotification({
      type: 'success',
      title: 'Optimization Complete',
      message: `Optimization completed with ${data.improvement?.toFixed(1) || 0}% improvement`,
      category: 'optimization',
      priority: 'normal',
      duration: 8000,
      data: {
        runId: data.runId,
        improvement: data.improvement,
        solvingTime: data.solvingTime
      },
      onClick: () => {
        // Navigate to optimization results
        window.location.href = `/optimization/history?runId=${data.runId}`;
      }
    });
  }

  addDelayAlert(trainId, delay, expectedArrival) {
    return this.addNotification({
      type: 'warning',
      title: `Train Delay - ${trainId}`,
      message: `Delayed by ${delay} minutes. New arrival: ${expectedArrival}`,
      category: 'delay',
      priority: delay > 15 ? 'high' : 'normal',
      persistent: delay > 30,
      data: {
        trainId,
        delay,
        expectedArrival
      }
    });
  }

  addMaintenanceAlert(sectionId, message) {
    return this.addNotification({
      type: 'info',
      title: `Maintenance Alert - Section ${sectionId}`,
      message,
      category: 'maintenance',
      priority: 'normal',
      persistent: true,
      data: {
        sectionId
      }
    });
  }

  // Subscription management
  subscribe(callback) {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  notifySubscribers() {
    this.subscribers.forEach(callback => {
      try {
        callback(this.notifications);
      } catch (error) {
        console.error('[NotificationService] Subscriber callback error:', error);
      }
    });
  }

  // Getters
  getNotifications() {
    return [...this.notifications];
  }

  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  getNotificationsByCategory(category) {
    return this.notifications.filter(n => n.category === category);
  }

  getNotificationsByType(type) {
    return this.notifications.filter(n => n.type === type);
  }

  getHighPriorityNotifications() {
    return this.notifications.filter(n => n.priority === 'high' && !n.read);
  }

  // Settings
  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
    localStorage.setItem('notificationSoundEnabled', enabled.toString());
  }

  getSoundEnabled() {
    const saved = localStorage.getItem('notificationSoundEnabled');
    return saved !== null ? saved === 'true' : this.soundEnabled;
  }

  setBrowserNotificationsEnabled(enabled) {
    this.browserNotificationsEnabled = enabled;
    localStorage.setItem('browserNotificationsEnabled', enabled.toString());
  }

  getBrowserNotificationsEnabled() {
    const saved = localStorage.getItem('browserNotificationsEnabled');
    return saved !== null ? saved === 'true' : this.browserNotificationsEnabled;
  }

  // Statistics
  getStatistics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayNotifications = this.notifications.filter(n => 
      new Date(n.timestamp) >= today
    );

    const weekNotifications = this.notifications.filter(n => 
      new Date(n.timestamp) >= thisWeek
    );

    const byCategory = {};
    this.notifications.forEach(n => {
      byCategory[n.category] = (byCategory[n.category] || 0) + 1;
    });

    return {
      total: this.notifications.length,
      unread: this.getUnreadCount(),
      today: todayNotifications.length,
      thisWeek: weekNotifications.length,
      byCategory,
      highPriority: this.getHighPriorityNotifications().length
    };
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;