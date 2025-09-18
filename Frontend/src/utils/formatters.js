/**
 * Utility functions for formatting data in TrackWise
 */

// Format time functions
export const formatTime = (date, format = 'short') => {
  if (!date) return '--';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '--';
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'long':
      return dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    case 'date':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    case 'datetime':
      return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'relative':
      return getRelativeTime(dateObj);
    default:
      return dateObj.toLocaleString();
  }
};

// Get relative time (e.g., "2 minutes ago")
export const getRelativeTime = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};

// Format numbers
export const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined || isNaN(num)) return '--';
  
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

// Format currency
export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined || isNaN(amount)) return '--';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Format percentage
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  
  return `${Number(value).toFixed(decimals)}%`;
};

// Format duration (in minutes)
export const formatDuration = (minutes) => {
  if (!minutes || isNaN(minutes)) return '--';
  
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
};

// Format file size
export const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return '--';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

// Format train status
export const formatTrainStatus = (status) => {
  const statusMap = {
    'RUNNING': 'Running',
    'STOPPED': 'Stopped',
    'MAINTENANCE': 'Maintenance',
    'DELAYED': 'Delayed',
    'CANCELLED': 'Cancelled'
  };
  
  return statusMap[status] || status;
};

// Format section status
export const formatSectionStatus = (status) => {
  const statusMap = {
    'AVAILABLE': 'Available',
    'OCCUPIED': 'Occupied',
    'MAINTENANCE': 'Under Maintenance',
    'BLOCKED': 'Blocked',
    'RESERVED': 'Reserved'
  };
  
  return statusMap[status] || status;
};

// Format optimization status
export const formatOptimizationStatus = (status) => {
  const statusMap = {
    'pending': 'Pending',
    'running': 'Running',
    'completed': 'Completed',
    'failed': 'Failed',
    'cancelled': 'Cancelled'
  };
  
  return statusMap[status] || status;
};

// Truncate text
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Format speed
export const formatSpeed = (speed, unit = 'km/h') => {
  if (speed === null || speed === undefined || isNaN(speed)) return '--';
  return `${Math.round(speed)} ${unit}`;
};

// Format distance
export const formatDistance = (distance, unit = 'km') => {
  if (distance === null || distance === undefined || isNaN(distance)) return '--';
  
  if (unit === 'km' && distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  
  return `${distance.toFixed(1)} ${unit}`;
};

// Format capacity
export const formatCapacity = (current, total) => {
  if (!total || isNaN(total)) return '--';
  if (!current || isNaN(current)) current = 0;
  
  const percentage = (current / total) * 100;
  return `${current}/${total} (${percentage.toFixed(0)}%)`;
};

// Format delay
export const formatDelay = (delayMinutes) => {
  if (!delayMinutes || delayMinutes === 0) return 'On time';
  if (delayMinutes < 0) return `${Math.abs(delayMinutes)} min early`;
  return `${delayMinutes} min delayed`;
};

// Get status color
export const getStatusColor = (status, type = 'train') => {
  const colors = {
    train: {
      'RUNNING': 'green',
      'STOPPED': 'gray',
      'MAINTENANCE': 'yellow',
      'DELAYED': 'orange',
      'CANCELLED': 'red'
    },
    section: {
      'AVAILABLE': 'green',
      'OCCUPIED': 'blue',
      'MAINTENANCE': 'yellow',
      'BLOCKED': 'red',
      'RESERVED': 'orange'
    },
    optimization: {
      'pending': 'gray',
      'running': 'blue',
      'completed': 'green',
      'failed': 'red',
      'cancelled': 'orange'
    }
  };
  
  return colors[type]?.[status] || 'gray';
};

// Format API response data
export const formatApiData = (data, formatters = {}) => {
  if (!data) return data;
  
  const formatted = { ...data };
  
  Object.keys(formatters).forEach(key => {
    if (formatted[key] !== undefined) {
      formatted[key] = formatters[key](formatted[key]);
    }
  });
  
  return formatted;
};

// Export all formatters
export default {
  formatTime,
  getRelativeTime,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatDuration,
  formatFileSize,
  formatTrainStatus,
  formatSectionStatus,
  formatOptimizationStatus,
  truncateText,
  formatSpeed,
  formatDistance,
  formatCapacity,
  formatDelay,
  getStatusColor,
  formatApiData
};