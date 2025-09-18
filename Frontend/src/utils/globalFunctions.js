/**
 * Global utility functions for TrackWise
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

// Mock functions for missing state setters
export const setSectionType = (type) => {
  console.log('setSectionType called with:', type);
  // This would normally be connected to your state management
};

export const setGranularity = (granularity) => {
  console.log('setGranularity called with:', granularity);
  // This would normally be connected to your state management
};

// Add these to window for global access
if (typeof window !== 'undefined') {
  window.formatTime = formatTime;
  window.setSectionType = setSectionType;
  window.setGranularity = setGranularity;
}

export default {
  formatTime,
  getRelativeTime,
  setSectionType,
  setGranularity
};