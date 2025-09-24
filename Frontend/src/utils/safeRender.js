// Safe rendering utility for handling validation error objects
export const renderSafely = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'object') {
    // Handle validation error objects with {type, loc, msg, input} structure
    if (value.msg && typeof value.msg === 'string') {
      return value.msg;
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(item => renderSafely(item)).join(', ');
    }
    
    // For other objects, stringify them
    try {
      return JSON.stringify(value);
    } catch (err) {
      return '[Object]';
    }
  }
  
  return String(value);
};

// React component for safe rendering
export const SafeRender = ({ value, fallback = '' }) => {
  return renderSafely(value) || fallback;
};

export default { renderSafely, SafeRender };