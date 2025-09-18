/**
 * Component fixes and patches
 * Import this file in components that need the fixes
 */

// Global window fixes for missing functions
if (typeof window !== 'undefined') {
  // Add missing functions to window for backward compatibility
  window.formatTime = (date, format = 'short') => {
    if (!date) return '--';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '--';
    
    switch (format) {
      case 'short':
        return dateObj.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
      default:
        return dateObj.toLocaleString();
    }
  };
  
  // Add other missing functions as needed
  window.setSectionType = window.setSectionType || (() => {});
  window.setGranularity = window.setGranularity || (() => {});
}

// Export the fixes
export const formatTime = window.formatTime;
export const setSectionType = () => {};
export const setGranularity = () => {};