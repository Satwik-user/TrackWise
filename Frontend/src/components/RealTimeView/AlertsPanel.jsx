import React, { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const AlertsPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts/active');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Unknown';
    const date = new Date(timeString);
    return date.toLocaleTimeString();
  };

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return ExclamationTriangleIcon;
      case 'warning':
        return ExclamationCircleIcon;
      default:
        return InformationCircleIcon;
    }
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  if (loading) {
    return <div>Loading alerts...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Active Alerts</h3>
      </div>
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <InformationCircleIcon className="h-8 w-8 mx-auto mb-2" />
            <p>No active alerts</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const AlertIcon = getAlertIcon(alert.severity);
            const alertColor = getAlertColor(alert.severity);
            
            return (
              <div key={alert.id} className="p-6">
                <div className="flex items-start">
                  <div className={`p-2 rounded-lg ${alertColor}`}>
                    <AlertIcon className="h-5 w-5" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatTime(alert.timestamp)} - {alert.section}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;