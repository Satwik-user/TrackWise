import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [hasEverConnected, setHasEverConnected] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const maxReconnectAttempts = 3;
  const reconnectDelay = 3000; // 3 seconds

  const {
    setWsConnected,
    setWsReconnecting,
    addAlert,
    updateTrain,
    updateSection,
    addOptimizationRun,
    updateMetrics,
    preferences
  } = useAppStore();

  const clientId = useRef(`client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const connect = () => {
    try {
      const wsUrl = process.env.REACT_APP_WS_URL || `ws://localhost:8000/api/ws/connect`;
      const newSocket = new WebSocket(wsUrl);

      newSocket.onopen = (event) => {
        console.log('WebSocket connected');
        setSocket(newSocket);
        setIsConnected(true);
        setHasEverConnected(true);
        setReconnectAttempts(0);
        setWsConnected(true);
        setWsReconnecting(false);
        
        // Subscribe to topics if preferences exist
        if (preferences && preferences.notifications) {
          subscribeToTopics(newSocket, Object.keys(preferences.notifications));
        }
        
        startHeartbeat(newSocket);
      };

      newSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      newSocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setSocket(null);
        setIsConnected(false);
        setWsConnected(false);
        stopHeartbeat();
        
        // Only attempt reconnection if it wasn't a normal close
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      newSocket.onerror = (error) => {
        // Silent error handling - WebSocket is optional
        console.log('WebSocket connection failed (silent mode)');
      };

    } catch (error) {
      // Silent error handling - WebSocket is optional 
      console.log('Failed to create WebSocket connection (silent mode)');
    }
  };

  const disconnect = () => {
    if (socket) {
      socket.close(1000, 'Client disconnecting');
      setSocket(null);
    }
    stopHeartbeat();
    clearTimeout(reconnectTimeoutRef.current);
  };

  const scheduleReconnect = () => {
    // Only reconnect if we had a successful connection before
    if (reconnectAttempts >= maxReconnectAttempts || !hasEverConnected) {
      console.log('Skipping reconnection - either max attempts reached or never connected');
      setWsReconnecting(false);
      return;
    }

    setWsReconnecting(true);
    setReconnectAttempts(prev => prev + 1);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`Reconnection attempt ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
      connect();
    }, reconnectDelay * Math.pow(2, reconnectAttempts)); // Exponential backoff
  };

  const startHeartbeat = (ws) => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 30 seconds
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  const subscribeToTopics = (ws, topics) => {
    topics.forEach(topic => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        topic: topic
      }));
    });
  };

  const handleMessage = (message) => {
    const { type, data, topic } = message;

    switch (type) {
      case 'connection_established':
        console.log('Connection established:', data);
        break;

      case 'topic_update':
        handleTopicUpdate(topic, data);
        break;

      case 'alert':
        handleAlert(message);
        break;

      case 'train_update':
        handleTrainUpdate(data);
        break;

      case 'optimization_completed':
        handleOptimizationCompleted(data);
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.log('Unhandled message type:', type);
    }
  };

  const handleTopicUpdate = (topic, data) => {
    switch (topic) {
      case 'train_positions':
        if (data.trains) {
          data.trains.forEach(train => {
            updateTrain(train.train_id, {
              current_position: train.position,
              current_speed: train.speed,
              status: train.status,
              current_section_id: train.section_id
            });
          });
        }
        break;

      case 'optimization_results':
        if (data.run_id) {
          addOptimizationRun(data);
        }
        break;

      case 'system_metrics':
        updateMetrics(data);
        break;

      case 'alerts':
        if (data.alerts) {
          data.alerts.forEach(alert => {
            addAlert({
              id: alert.id,
              type: alert.type,
              message: alert.message,
              timestamp: alert.timestamp,
              active: true
            });
          });
        }
        break;

      default:
        console.log('Unhandled topic:', topic, data);
    }
  };

  const handleAlert = (alertMessage) => {
    const { alert_type, message, data } = alertMessage;
    
    addAlert({
      id: `alert_${Date.now()}`,
      type: alert_type,
      message: message,
      data: data,
      timestamp: new Date().toISOString(),
      active: true
    });

    // Show toast notification if enabled
    if (preferences.showNotifications) {
      switch (alert_type) {
        case 'ERROR':
          toast.error(message);
          break;
        case 'WARNING':
          toast.error(message, { icon: '⚠️' });
          break;
        case 'INFO':
          toast(message, { icon: 'ℹ️' });
          break;
        default:
          toast(message);
      }
    }
  };

  const handleTrainUpdate = (trainData) => {
    updateTrain(trainData.train_id, trainData);
  };

  const handleOptimizationCompleted = (result) => {
    addOptimizationRun(result);
    
    if (preferences.showNotifications) {
      toast.success(`Optimization completed: ${result.status}`);
    }
  };

  // WebSocket API methods
  const subscribe = (topic) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'subscribe',
        topic: topic
      }));
    }
  };

  const unsubscribe = (topic) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'unsubscribe',
        topic: topic
      }));
    }
  };

  const sendMessage = (message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected. Message not sent:', message);
    }
  };

  const getStatus = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'get_status' }));
    }
  };

  // Initialize connection on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []);

  // Handle visibility change to manage connection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, reduce activity
        stopHeartbeat();
      } else {
        // Page is visible, restore full activity
        if (socket && socket.readyState === WebSocket.OPEN) {
          startHeartbeat(socket);
        } else if (!socket || socket.readyState === WebSocket.CLOSED) {
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket]);

  const contextValue = {
    socket,
    isConnected,
    reconnectAttempts,
    maxReconnectAttempts,
    clientId: clientId.current,
    
    // Methods
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendMessage,
    getStatus,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};