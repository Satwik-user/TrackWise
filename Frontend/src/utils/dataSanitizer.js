// Recursive function to sanitize data and convert validation error objects to safe strings
export const sanitizeData = (data, depth = 0) => {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[Deep Object]';
  }

  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, depth + 1));
  }

  if (typeof data === 'object') {
    // Check for validation error object pattern
    if (data.type && data.loc && data.msg && typeof data.input !== 'undefined') {
      console.warn('🚨 Found validation error object, converting to safe string:', data);
      return data.msg; // Return just the message as a string
    }

    // Check for error objects with common error patterns
    if (data.error && typeof data.error === 'string') {
      return data.error;
    }

    // For regular objects, recursively sanitize their properties
    const sanitized = {};
    Object.keys(data).forEach(key => {
      sanitized[key] = sanitizeData(data[key], depth + 1);
    });
    return sanitized;
  }

  // Fallback to string conversion for unknown types
  return String(data);
};

// Function to wrap API responses
export const sanitizeApiResponse = (response) => {
  try {
    return sanitizeData(response);
  } catch (error) {
    console.error('Error sanitizing API response:', error);
    return { error: 'Failed to sanitize response' };
  }
};

export default { sanitizeData, sanitizeApiResponse };