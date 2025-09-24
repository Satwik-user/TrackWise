import { useState, useEffect } from 'react';

// Universal hook to safely render any value
export const useSafeValue = (value) => {
  const [safeValue, setSafeValue] = useState('');

  useEffect(() => {
    try {
      if (value === null || value === undefined) {
        setSafeValue('');
        return;
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        setSafeValue(value);
        return;
      }

      if (Array.isArray(value)) {
        setSafeValue(`[Array with ${value.length} items]`);
        return;
      }

      if (typeof value === 'object') {
        // Check for validation error object
        if (value.type && value.loc && value.msg && typeof value.input !== 'undefined') {
          console.warn('🚨 useSafeValue caught validation error:', value);
          setSafeValue(value.msg);
          return;
        }

        // For other objects, stringify safely
        try {
          setSafeValue(JSON.stringify(value));
        } catch (e) {
          setSafeValue('[Object]');
        }
        return;
      }

      setSafeValue(String(value));
    } catch (error) {
      console.error('useSafeValue error:', error, 'Value:', value);
      setSafeValue('[Error rendering value]');
    }
  }, [value]);

  return safeValue;
};

export default useSafeValue;