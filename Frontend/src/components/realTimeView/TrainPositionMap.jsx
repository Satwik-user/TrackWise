import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrainIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/outline';

const TrainPositionMap = ({
  trains,
  sections,
  selectedTrain,
  selectedSection,
  onTrainSelect,
  onSectionSelect,
  isAutoRefresh
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showTrainLabels, setShowTrainLabels] = useState(true);
  const [hoveredTrain, setHoveredTrain] = useState(null);
  const [hoveredSection, setHoveredSection] = useState(null);
  
  const mapRef = useRef(null);
  const animationRef = useRef(null);

  // Simulate a railway network layout
  const networkLayout = {
    width: 1200,
    height: 800,
    sections: sections.map((section, index) => ({
      ...section,
      x: 100 + (index % 4) * 250,
      y: 100 + Math.floor(index / 4) * 150,
      width: 200,
      height: 60
    })),
    connections: [
      // Define connections between sections
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 5 },
      { from: 1, to: 5 },
      { from: 2, to: 6 },
      { from: 6, to: 7 }
    ]
  };

  // Handle mouse events for pan and zoom
  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(3, prev + 0.2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.5, prev - 0.2));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Calculate train positions on sections
  const getTrainPosition = (train) => {
    const section = networkLayout.sections.find(s => s.id === train.current_section_id);
    if (!section) return null;

    const progress = (train.current_position || 0) / section.length;
    const x = section.x + (progress * section.width);
    const y = section.y + section.height / 2;

    return { x, y, section };
  };

  const getTrainColor = (train) => {
    switch (train.train_type) {
      case 'EXPRESS':
        return '#2563eb'; // blue
      case 'FREIGHT':
        return '#ea580c'; // orange
      case 'SUBURBAN':
        return '#059669'; // green
      case 'SPECIAL':
        return '#7c3aed'; // purple
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'RUNNING':
        return '#10b981';
      case 'DELAYED':
        return '#ef4444';
      case 'STOPPED':
        return '#f59e0b';
      case 'COMPLETED':
        return '#6b7280';
      default:
        return '#3b82f6';
    }
  };

  const getSectionColor = (section) => {
    if (section.maintenance_mode) return '#ef4444';
    if (!section.is_active) return '#6b7280';
    
    const utilization = section.current_occupancy / section.max_occupancy;
    if (utilization >= 1) return '#f59e0b';
    if (utilization >= 0.8) return '#eab308';
    return '#10b981';
  };

  // Animation for train movement
  useEffect(() => {
    if (!isAutoRefresh) return;

    const animate = () => {
      // Simulate small position updates for running trains
      trains.forEach(train => {
        if (train.status === 'RUNNING' && train.current_speed > 0) {
          // This would normally come from real-time updates
          // For simulation, we can add small random movements
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAutoRefresh, trains]);

  useEffect(() => {
    const mapElement = mapRef.current;
    if (!mapElement) return;

    mapElement.addEventListener('mousedown', handleMouseDown);
    mapElement.addEventListener('mousemove', handleMouseMove);
    mapElement.addEventListener('mouseup', handleMouseUp);
    mapElement.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      mapElement.removeEventListener('mousedown', handleMouseDown);
      mapElement.removeEventListener('mousemove', handleMouseMove);
      mapElement.removeEventListener('mouseup', handleMouseUp);
      mapElement.removeEventListener('wheel', handleWheel);
    };
  }, [isDragging, dragStart, panOffset]);

  return (
    <div className="relative w-full h-full bg-gray-50 overflow-hidden">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        <div className="bg-white rounded-lg shadow-md p-2 flex flex-col space-y-1">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomInIcon className="h-4 w-4" />
          </button>
          
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOutIcon className="h-4 w-4" />
          </button>
          
          <button
            onClick={handleResetView}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Reset View"
          >
            <ArrowsPointingOutIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-2">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={showTrainLabels}
              onChange={(e) => setShowTrainLabels(e.target.checked)}
              className="rounded"
            />
            <span>Show Labels</span>
          </label>
        </div>
      </div>

      {/* Map Legend */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-md p-4 max-w-xs">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Legend</h3>
        
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Express Train</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>Freight Train</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Suburban Train</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span>Special Train</span>
          </div>
          
          <div className="border-t pt-2 mt-2">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-2 bg-green-400 rounded-sm"></div>
              <span>Available Section</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-2 bg-yellow-400 rounded-sm"></div>
              <span>High Utilization</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-2 bg-red-400 rounded-sm"></div>
              <span>Maintenance</span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Map */}
      <div
        ref={mapRef}
        className="w-full h-full cursor-grab"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1200 800"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`
          }}
        >
          {/* Grid Background */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Section Connections */}
          {networkLayout.connections.map((conn, index) => {
            const fromSection = networkLayout.sections[conn.from];
            const toSection = networkLayout.sections[conn.to];
            
            if (!fromSection || !toSection) return null;

            return (
              <line
                key={index}
                x1={fromSection.x + fromSection.width}
                y1={fromSection.y + fromSection.height / 2}
                x2={toSection.x}
                y2={toSection.y + toSection.height / 2}
                stroke="#9ca3af"
                strokeWidth="3"
                strokeDasharray="5,5"
              />
            );
          })}

          {/* Railway Sections */}
          {networkLayout.sections.map((section) => (
            <g key={section.id}>
              <rect
                x={section.x}
                y={section.y}
                width={section.width}
                height={section.height}
                fill={getSectionColor(section)}
                stroke={selectedSection?.id === section.id ? '#2563eb' : '#374151'}
                strokeWidth={selectedSection?.id === section.id ? 3 : 1}
                rx="8"
                className="cursor-pointer transition-all duration-200"
                onClick={() => onSectionSelect(section)}
                onMouseEnter={() => setHoveredSection(section)}
                onMouseLeave={() => setHoveredSection(null)}
              />
              
              {/* Section Label */}
              <text
                x={section.x + section.width / 2}
                y={section.y + section.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-medium fill-white pointer-events-none"
              >
                {section.section_code}
              </text>

              {/* Section Status Indicators */}
              {section.maintenance_mode && (
                <ExclamationTriangleIcon 
                  x={section.x + section.width - 20}
                  y={section.y + 5}
                  className="h-4 w-4 text-red-600"
                />
              )}

              {/* Occupancy Indicator */}
              <rect
                x={section.x}
                y={section.y + section.height - 8}
                width={(section.current_occupancy / section.max_occupancy) * section.width}
                height="4"
                fill="#2563eb"
                rx="2"
              />
            </g>
          ))}

          {/* Trains */}
          {trains.map((train) => {
            const position = getTrainPosition(train);
            if (!position) return null;

            const isSelected = selectedTrain?.id === train.id;
            const isHovered = hoveredTrain?.id === train.id;
            const trainColor = getTrainColor(train);
            const statusColor = getStatusColor(train.status);

            return (
              <g key={train.id}>
                {/* Train Icon */}
                <motion.circle
                  cx={position.x}
                  cy={position.y}
                  r={isSelected || isHovered ? 12 : 8}
                  fill={trainColor}
                  stroke={statusColor}
                  strokeWidth={isSelected ? 4 : 2}
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => onTrainSelect(train)}
                  onMouseEnter={() => setHoveredTrain(train)}
                  onMouseLeave={() => setHoveredTrain(null)}
                  animate={{
                    scale: isSelected || isHovered ? 1.2 : 1,
                    r: isSelected || isHovered ? 12 : 8
                  }}
                  transition={{ duration: 0.2 }}
                />

                {/* Train Number Label */}
                {(showTrainLabels || isSelected || isHovered) && (
                  <text
                    x={position.x}
                    y={position.y - 20}
                    textAnchor="middle"
                    className="text-xs font-medium fill-gray-900 pointer-events-none"
                  >
                    {train.train_number}
                  </text>
                )}

                {/* Speed Indicator for Running Trains */}
                {train.status === 'RUNNING' && train.current_speed > 0 && (
                  <text
                    x={position.x}
                    y={position.y + 25}
                    textAnchor="middle"
                    className="text-xs fill-gray-600 pointer-events-none"
                  >
                    {train.current_speed.toFixed(0)} km/h
                  </text>
                )}

                {/* Direction Indicator */}
                {train.status === 'RUNNING' && (
                  <motion.line
                    x1={position.x + 12}
                    y1={position.y}
                    x2={position.x + 20}
                    y2={position.y}
                    stroke={statusColor}
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                    animate={{
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}
              </g>
            );
          })}

          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#10b981"
              />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Hover Tooltips */}
      <AnimatePresence>
        {hoveredTrain && (
          <TrainTooltip train={hoveredTrain} />
        )}
        
        {hoveredSection && (
          <SectionTooltip section={hoveredSection} />
        )}
      </AnimatePresence>

      {/* Map Info */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3 text-sm">
        <div className="text-gray-600">
          Zoom: {(zoomLevel * 100).toFixed(0)}% | 
          Trains: {trains.length} | 
          Sections: {sections.length}
        </div>
      </div>
    </div>
  );
};

// Train Tooltip Component
const TrainTooltip = ({ train }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute z-20 bg-white rounded-lg shadow-lg border p-3 pointer-events-none"
      style={{
        left: '50%',
        top: '20%',
        transform: 'translateX(-50%)'
      }}
    >
      <div className="text-sm">
        <div className="font-medium text-gray-900 mb-1">{train.train_number}</div>
        <div className="text-gray-600 mb-2">{train.train_name}</div>
        
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={`font-medium ${
              train.status === 'RUNNING' ? 'text-green-600' :
              train.status === 'DELAYED' ? 'text-red-600' :
              train.status === 'STOPPED' ? 'text-yellow-600' :
              'text-gray-600'
            }`}>
              {train.status}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Speed:</span>
            <span>{train.current_speed?.toFixed(1) || 0} km/h</span>
          </div>
          
          <div className="flex justify-between">
            <span>Type:</span>
            <span>{train.train_type}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Priority:</span>
            <span>{train.priority}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Section Tooltip Component
const SectionTooltip = ({ section }) => {
  const utilizationPercent = ((section.current_occupancy / section.max_occupancy) * 100).toFixed(0);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute z-20 bg-white rounded-lg shadow-lg border p-3 pointer-events-none"
      style={{
        left: '50%',
        top: '20%',
        transform: 'translateX(-50%)'
      }}
    >
      <div className="text-sm">
        <div className="font-medium text-gray-900 mb-1">{section.section_code}</div>
        <div className="text-gray-600 mb-2">{section.section_name}</div>
        
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Occupancy:</span>
            <span>{section.current_occupancy}/{section.max_occupancy}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Utilization:</span>
            <span className={`font-medium ${
              utilizationPercent >= 100 ? 'text-red-600' :
              utilizationPercent >= 80 ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {utilizationPercent}%
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Length:</span>
            <span>{section.length}m</span>
          </div>
          
          <div className="flex justify-between">
            <span>Max Speed:</span>
            <span>{section.max_speed} km/h</span>
          </div>
          
          {section.maintenance_mode && (
            <div className="text-red-600 font-medium">
              Under Maintenance
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TrainPositionMap;