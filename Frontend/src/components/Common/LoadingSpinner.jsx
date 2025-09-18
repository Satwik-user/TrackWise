import React from 'react';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'blue', 
  message = 'Loading...', 
  centered = false,
  fullscreen = false 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'border-blue-600',
    green: 'border-green-600',
    yellow: 'border-yellow-600',
    red: 'border-red-600',
    gray: 'border-gray-600',
    white: 'border-white'
  };

  const containerClasses = [
    fullscreen && 'fixed inset-0 bg-white bg-opacity-75 z-50',
    centered && 'flex items-center justify-center',
    !fullscreen && !centered && 'inline-flex items-center'
  ].filter(Boolean).join(' ');

  const spinnerClasses = [
    'animate-spin rounded-full border-2 border-gray-200',
    sizeClasses[size],
    colorClasses[color]
  ].join(' ');

  const Spinner = () => (
    <div className="flex flex-col items-center space-y-2">
      <div className={spinnerClasses} />
      {message && (
        <span className="text-sm text-gray-600 animate-pulse">
          {message}
        </span>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className={containerClasses}>
        <Spinner />
      </div>
    );
  }

  if (centered) {
    return (
      <div className={containerClasses}>
        <Spinner />
      </div>
    );
  }

  return <Spinner />;
};

// Skeleton loading component for content placeholders
export const SkeletonLoader = ({ lines = 3, className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-200 rounded h-4 mb-2 ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};

// Card skeleton for loading cards
export const CardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-3 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  );
};

// Table skeleton for loading tables
export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-50 rounded-t-lg p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <div key={index} className="h-4 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-b-lg divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className="h-3 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoadingSpinner;