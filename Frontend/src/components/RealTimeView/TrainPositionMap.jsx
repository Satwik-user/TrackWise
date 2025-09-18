import React, { useState, useEffect, useRef } from 'react';
import {
  TruckIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

const TrainPositionMap = () => {
  const [trains, setTrains] = useState([]);
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [alerts, setAlerts] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    fetchTrainPositions();
    fetchAlerts();
    const interval = setInterval(() => {
      fetchTrainPositions();
      fetchAlerts();
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchTrainPositions = async () => {
    try {
      const response = await fetch('/api/trains/positions');
      if (!response.ok) throw new Error('Failed to fetch train positions');
      const data = await response.json();
      setTrains(data);
    } catch (error) {
      console.error('Error fetching train positions:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts/active');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const getTrainStatusColor = (status) => {
    switch (status) {
      case 'on_time':
        return 'text-green-600';
      case 'delayed':
        return 'text-red-600';
      case 'early':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const handleTrainClick = (train) => {
    setSelectedTrain(train);
  };

  return (
    <div className="bg-white rounded-lg shadow h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Train Positions</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {trains.length} trains • {alerts.length} alerts
          </span>
          <button 
            onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 3))}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
          >
            <MagnifyingGlassPlusIcon className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.5))}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
          >
            <MagnifyingGlassMinusIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div className="flex h-full">
        {/* Map Area */}
        <div ref={mapRef} className="flex-1 p-4">
          <div 
            className="h-full bg-gray-100 rounded relative overflow-hidden"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
          >
            {/* Simulated track layout */}
            <div className="absolute inset-4 border-2 border-gray-400 rounded-lg">
              <div className="w-full h-0.5 bg-gray-400 absolute top-1/4"></div>
              <div className="w-full h-0.5 bg-gray-400 absolute top-1/2"></div>
              <div className="w-full h-0.5 bg-gray-400 absolute top-3/4"></div>
            </div>

            {/* Train positions */}
            {trains.map((train, index) => (
              <div
                key={train.id}
                onClick={() => handleTrainClick(train)}
                className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${20 + (index * 15) % 60}%`,
                  top: `${25 + (index % 3) * 25}%`
                }}
              >
                <div className={`p-2 rounded-lg bg-white shadow-md border-2 ${
                  selectedTrain?.id === train.id ? 'border-blue-500' : 'border-gray-200'
                }`}>
                  <TruckIcon className={`h-5 w-5 ${getTrainStatusColor(train.status)}`} />
                </div>
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                  <span className="text-xs bg-black text-white px-1 rounded">
                    {train.train_id}
                  </span>
                </div>
              </div>
            ))}

            {/* Alert markers */}
            {alerts.map((alert, index) => (
              <div
                key={alert.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${30 + (index * 20) % 50}%`,
                  top: `${30 + (index % 2) * 40}%`
                }}
              >
                <div className="p-1 rounded-full bg-red-500 text-white">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Train Details Sidebar */}
        <div className="w-80 border-l border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Train Details</h4>
          
          {selectedTrain ? (
            <div className="space-y-4">
              <div>
                <h5 className="text-lg font-medium text-gray-900">{selectedTrain.train_id}</h5>
                <p className="text-sm text-gray-500">{selectedTrain.route}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`text-sm font-medium ${getTrainStatusColor(selectedTrain.status)}`}>
                    {selectedTrain.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Speed:</span>
                  <span className="text-sm font-medium">{selectedTrain.speed || 0} km/h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Next Station:</span>
                  <span className="text-sm font-medium">{selectedTrain.next_station || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">ETA:</span>
                  <span className="text-sm font-medium">
                    {selectedTrain.eta ? new Date(selectedTrain.eta).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MapPinIcon className="h-12 w-12 mx-auto mb-3" />
              <p className="text-sm">Click on a train to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainPositionMap;