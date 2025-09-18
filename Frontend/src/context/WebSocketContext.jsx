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
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const maxReconnectAttempts = 5;
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
      const wsUrl = process.env.REACT_APP_WS_URL || `ws://localhost:8000/ws/${clientId.current}`;
      const newSocket = new WebSocket(wsUrl);

      newSocket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setWsConnected(true);
        setWsReconnecting(false);
        setReconnectAttempts(0);
        
        // Start heartbeat
        startHeartbeat(newSocket);
        
        // Subscribe to default topics
        subscribeToTopics(newSocket, ['train_positions', 'optimization_results', 'alerts']);
        
        toast.success('Real-time connection established');
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
        console.log('WebSocket disconnected:', event.reason);
        setIsConnected(false);
        setWsConnected(false);
        stopHeartbeat();
        
        if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Connection error occurred');
      };

      setSocket(newSocket);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      scheduleReconnect();
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
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      setWsReconnecting(false);
      toast.error('Failed to reconnect to server');
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