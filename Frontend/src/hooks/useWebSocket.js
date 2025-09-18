import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (url = null, options = {}) => {
  const {
    onOpen = () => {},
    onMessage = () => {},
    onClose = () => {},
    onError = () => {},
    shouldReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    protocols = [],
    heartbeatInterval = 30000,
    debug = false
  } = options;

  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('DISCONNECTED'); // CONNECTING, CONNECTED, DISCONNECTED, ERROR
  const [lastMessage, setLastMessage] = useState(null);
  const [messageHistory, setMessageHistory] = useState([]);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [error, setError] = useState(null);

  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const socketRef = useRef(null);
  const messageQueueRef = useRef([]);

  // Get WebSocket URL from environment or parameter
  const getWebSocketUrl = useCallback(() => {
    if (url) return url;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.REACT_APP_WS_URL || 
                 `${protocol}//${window.location.host}/ws`;
    return host;
  }, [url]);

  // Send message function
  const sendMessage = useCallback((data) => {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(message);
      if (debug) {
        console.log('[WebSocket] Message sent:', data);
      }
      return true;
    } else {
      // Queue message if not connected
      messageQueueRef.current.push(message);
      if (debug) {
        console.warn('[WebSocket] Message queued (not connected):', data);
      }
      return false;
    }
  }, [socket, debug]);

  // Send queued messages
  const sendQueuedMessages = useCallback(() => {
    while (messageQueueRef.current.length > 0 && socket?.readyState === WebSocket.OPEN) {
      const message = messageQueueRef.current.shift();
      socket.send(message);
      if (debug) {
        console.log('[WebSocket] Queued message sent:', message);
      }
    }
  }, [socket, debug]);

  // Heartbeat function
  const sendHeartbeat = useCallback(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      sendMessage({ type: 'heartbeat', timestamp: Date.now() });
    }
  }, [socket, sendMessage]);

  // Connect function
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      if (debug) {
        console.warn('[WebSocket] Already connected');
      }
      return;
    }

    try {
      setConnectionState('CONNECTING');
      setError(null);
      
      const wsUrl = getWebSocketUrl();
      if (debug) {
        console.log('[WebSocket] Connecting to:', wsUrl);
      }

      const ws = new WebSocket(wsUrl, protocols);
      socketRef.current = ws;
      setSocket(ws);

      // Connection opened
      ws.onopen = (event) => {
        setIsConnected(true);
        setConnectionState('CONNECTED');
        setReconnectCount(0);
        setError(null);
        
        if (debug) {
          console.log('[WebSocket] Connected');
        }
        
        onOpen(event);
        
        // Send queued messages
        sendQueuedMessages();
        
        // Start heartbeat
        if (heartbeatInterval > 0) {
          heartbeatIntervalRef.current = setInterval(sendHeartbeat, heartbeatInterval);
        }
      };

      // Message received
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          setMessageHistory(prev => [...prev.slice(-99), data]); // Keep last 100 messages
          
          if (debug) {
            console.log('[WebSocket] Message received:', data);
          }
          
          onMessage(data, event);
        } catch (err) {
          if (debug) {
            console.error('[WebSocket] Failed to parse message:', event.data);
          }
          onMessage(event.data, event);
        }
      };

      // Connection closed
      ws.onclose = (event) => {
        setIsConnected(false);
        setConnectionState('DISCONNECTED');
        setSocket(null);
        socketRef.current = null;
        
        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        if (debug) {
          console.log('[WebSocket] Disconnected:', event.code, event.reason);
        }
        
        onClose(event);
        
        // Attempt reconnection
        if (shouldReconnect && reconnectCount < maxReconnectAttempts && event.code !== 1000) {
          setReconnectCount(prev => prev + 1);
          const delay = reconnectInterval * Math.pow(1.5, reconnectCount); // Exponential backoff
          
          if (debug) {
            console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectCount + 1}/${maxReconnectAttempts})`);
          }
          
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      // Connection error
      ws.onerror = (event) => {
        const errorMsg = 'WebSocket connection error';
        setError(errorMsg);
        setConnectionState('ERROR');
        
        if (debug) {
          console.error('[WebSocket] Error:', event);
        }
        
        onError(event);
      };

    } catch (err) {
      setError(err.message);
      setConnectionState('ERROR');
      
      if (debug) {
        console.error('[WebSocket] Connection failed:', err);
      }
    }
  }, [
    getWebSocketUrl, 
    protocols, 
    debug, 
    onOpen, 
    onMessage, 
    onClose, 
    onError, 
    shouldReconnect, 
    maxReconnectAttempts, 
    reconnectInterval, 
    reconnectCount, 
    sendQueuedMessages, 
    sendHeartbeat, 
    heartbeatInterval
  ]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close(1000, 'Manual disconnect');
    }
    
    setSocket(null);
    setIsConnected(false);
    setConnectionState('DISCONNECTED');
    setReconnectCount(0);
    
    if (debug) {
      console.log('[WebSocket] Manually disconnected');
    }
  }, [debug]);

  // Reconnect function
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  // Subscribe to specific message types
  const subscribe = useCallback((messageType, callback) => {
    const unsubscribe = () => {
      // This would be implemented with a more sophisticated subscription system
      // For now, it's a placeholder
    };

    return unsubscribe;
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Handle page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, keep connection but reduce heartbeat
        if (debug) {
          console.log('[WebSocket] Page hidden');
        }
      } else {
        // Page is visible, restore normal heartbeat
        if (debug) {
          console.log('[WebSocket] Page visible');
        }
        if (!isConnected && shouldReconnect) {
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isConnected, shouldReconnect, connect, debug]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      if (debug) {
        console.log('[WebSocket] Network online');
      }
      if (!isConnected && shouldReconnect) {
        connect();
      }
    };

    const handleOffline = () => {
      if (debug) {
        console.log('[WebSocket] Network offline');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isConnected, shouldReconnect, connect, debug]);

  return {
    // Connection state
    socket,
    isConnected,
    connectionState,
    error,
    reconnectCount,
    
    // Data
    lastMessage,
    messageHistory,
    
    // Actions
    sendMessage,
    connect,
    disconnect,
    reconnect,
    subscribe,
    
    // Utils
    clearHistory: () => setMessageHistory([]),
    getQueueLength: () => messageQueueRef.current.length
  };
};

export default useWebSocket;