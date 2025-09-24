import { EventEmitter } from 'events';

class WebSocketService extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.url = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.heartbeatInterval = 30000;
    this.messageQueue = [];
    this.subscriptions = new Map();
    
    // Timers
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    
    // Event handlers
    this.onOpenHandler = this.onOpen.bind(this);
    this.onCloseHandler = this.onClose.bind(this);
    this.onMessageHandler = this.onMessage.bind(this);
    this.onErrorHandler = this.onError.bind(this);
    
    // Page visibility handling
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Network status handling
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  // Connection management
  connect(url = null) {
    if (this.isConnected || this.isConnecting) {
      console.warn('[WebSocket] Already connected or connecting');
      return;
    }

    this.url = url || this.getDefaultUrl();
    this.isConnecting = true;
    
    try {
      console.log(`[WebSocket] Connecting to ${this.url}`);
      this.socket = new WebSocket(this.url);
      
      // Set up event listeners
      this.socket.addEventListener('open', this.onOpenHandler);
      this.socket.addEventListener('close', this.onCloseHandler);
      this.socket.addEventListener('message', this.onMessageHandler);
      this.socket.addEventListener('error', this.onErrorHandler);
      
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.isConnecting = false;
      this.emit('error', error);
    }
  }

  disconnect() {
    console.log('[WebSocket] Disconnecting...');
    
    // Clear timers
    this.clearReconnectTimer();
    this.clearHeartbeatTimer();
    
    // Close socket
    if (this.socket) {
      this.socket.removeEventListener('open', this.onOpenHandler);
      this.socket.removeEventListener('close', this.onCloseHandler);
      this.socket.removeEventListener('message', this.onMessageHandler);
      this.socket.removeEventListener('error', this.onErrorHandler);
      
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close(1000, 'Manual disconnect');
      }
      
      this.socket = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    this.emit('disconnect');
  }

  // Event handlers
  onOpen(event) {
    console.log('[WebSocket] Connected');
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Send queued messages
    this.processMessageQueue();
    
    // Restore subscriptions
    this.restoreSubscriptions();
    
    this.emit('connect', event);
  }

  onClose(event) {
    console.log(`[WebSocket] Disconnected: ${event.code} - ${event.reason}`);
    this.isConnected = false;
    this.isConnecting = false;
    
    // Clear heartbeat
    this.clearHeartbeatTimer();
    
    this.emit('disconnect', event);
    
    // Attempt reconnection if not a clean close
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  onMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Handle system messages
      if (data.type === 'heartbeat') {
        this.handleHeartbeat(data);
        return;
      }
      
      // Emit message to subscribers
      this.emit('message', data);
      
      // Handle specific message types
      if (data.type && this.subscriptions.has(data.type)) {
        const callbacks = this.subscriptions.get(data.type);
        callbacks.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error('[WebSocket] Subscription callback error:', error);
          }
        });
      }
      
    } catch (error) {
      console.error('[WebSocket] Message parsing error:', error);
      this.emit('message', event.data);
    }
  }

  onError(event) {
    console.error('[WebSocket] Error:', event);
    this.emit('error', event);
  }

  // Message handling
  send(data) {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    
    if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(message);
        return true;
      } catch (error) {
        console.error('[WebSocket] Send error:', error);
        this.messageQueue.push(message);
        return false;
      }
    } else {
      // Queue message for later
      this.messageQueue.push(message);
      console.warn('[WebSocket] Message queued (not connected)');
      return false;
    }
  }

  processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      try {
        this.socket.send(message);
      } catch (error) {
        console.error('[WebSocket] Error sending queued message:', error);
        // Put message back at the front of the queue
        this.messageQueue.unshift(message);
        break;
      }
    }
  }

  // Subscription management
  subscribe(messageType, callback) {
    if (!this.subscriptions.has(messageType)) {
      this.subscriptions.set(messageType, new Set());
    }
    
    this.subscriptions.get(messageType).add(callback);
    
    // Send subscription message if connected
    if (this.isConnected) {
      this.send({
        type: 'subscribe',
        messageType: messageType
      });
    }
    
    // Return unsubscribe function
    return () => {
      this.unsubscribe(messageType, callback);
    };
  }

  unsubscribe(messageType, callback) {
    if (this.subscriptions.has(messageType)) {
      this.subscriptions.get(messageType).delete(callback);
      
      // Remove empty subscription sets
      if (this.subscriptions.get(messageType).size === 0) {
        this.subscriptions.delete(messageType);
        
        // Send unsubscribe message if connected
        if (this.isConnected) {
          this.send({
            type: 'unsubscribe',
            messageType: messageType
          });
        }
      }
    }
  }

  restoreSubscriptions() {
    // Re-subscribe to all message types
    for (const messageType of this.subscriptions.keys()) {
      this.send({
        type: 'subscribe',
        messageType: messageType
      });
    }
  }

  // Heartbeat management
  startHeartbeat() {
    this.clearHeartbeatTimer();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'heartbeat',
          timestamp: Date.now()
        });
      }
    }, this.heartbeatInterval);
  }

  handleHeartbeat(data) {
    // Handle heartbeat response
    const now = Date.now();
    const latency = now - (data.timestamp || now);
    this.emit('heartbeat', { latency, timestamp: now });
  }

  clearHeartbeatTimer() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Reconnection management
  scheduleReconnect() {
    this.clearReconnectTimer();
    this.reconnectAttempts++;
    
    const delay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isConnected && this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect(this.url);
      }
    }, delay);
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // Page visibility handling
  handleVisibilityChange() {
    if (document.hidden) {
      console.log('[WebSocket] Page hidden');
      // Keep connection but reduce heartbeat frequency
    } else {
      console.log('[WebSocket] Page visible');
      // Restore normal heartbeat and reconnect if needed
      if (!this.isConnected && this.url) {
        this.connect(this.url);
      }
    }
  }

  // Network status handling
  handleOnline() {
    console.log('[WebSocket] Network online');
    if (!this.isConnected && this.url) {
      this.connect(this.url);
    }
  }

  handleOffline() {
    console.log('[WebSocket] Network offline');
  }

  // Utility methods
  getDefaultUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.REACT_APP_WS_URL || 
                 `${protocol}//${window.location.host}/ws`;
    return host;
  }

  getConnectionState() {
    if (this.isConnected) return 'CONNECTED';
    if (this.isConnecting) return 'CONNECTING';
    return 'DISCONNECTED';
  }

  getQueueLength() {
    return this.messageQueue.length;
  }

  // Railway-specific message helpers
  sendTrainUpdate(trainData) {
    return this.send({
      type: 'train_update',
      data: trainData,
      timestamp: Date.now()
    });
  }

  sendOptimizationRequest(params) {
    return this.send({
      type: 'optimization_request',
      data: params,
      timestamp: Date.now()
    });
  }

  subscribeToTrainUpdates(callback) {
    return this.subscribe('train_update', callback);
  }

  subscribeToOptimizationResults(callback) {
    return this.subscribe('optimization_result', callback);
  }

  subscribeToSystemAlerts(callback) {
    return this.subscribe('system_alert', callback);
  }

  subscribeToSectionUpdates(callback) {
    return this.subscribe('section_update', callback);
  }

  // Cleanup
  destroy() {
    this.disconnect();
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    // Clear all subscriptions
    this.subscriptions.clear();
    
    // Clear message queue
    this.messageQueue = [];
    
    // Remove all event listeners
    this.removeAllListeners();
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;