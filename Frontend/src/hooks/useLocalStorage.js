import { useState, useEffect, useCallback } from 'react';

const useLocalStorage = (key, initialValue = null, options = {}) => {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    defaultValue = initialValue,
    syncAcrossTabs = true
  } = options;

  // Get initial value from localStorage or use default
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      return deserialize(item);
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  // Set value in state and localStorage
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      setStoredValue(valueToStore);
      
      if (valueToStore === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, serialize(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, serialize, storedValue]);

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(defaultValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, defaultValue]);

  // Check if key exists in localStorage
  const hasValue = useCallback(() => {
    return window.localStorage.getItem(key) !== null;
  }, [key]);

  // Get raw value without deserialization
  const getRawValue = useCallback(() => {
    return window.localStorage.getItem(key);
  }, [key]);

  // Set raw value without serialization
  const setRawValue = useCallback((value) => {
    try {
      if (value === null || value === undefined) {
        window.localStorage.removeItem(key);
        setStoredValue(defaultValue);
      } else {
        window.localStorage.setItem(key, value);
        setStoredValue(deserialize(value));
      }
    } catch (error) {
      console.error(`Error setting raw localStorage key "${key}":`, error);
    }
  }, [key, defaultValue, deserialize]);

  // Listen for storage changes across tabs
  useEffect(() => {
    if (!syncAcrossTabs) return;

    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== serialize(storedValue)) {
        try {
          if (e.newValue === null) {
            setStoredValue(defaultValue);
          } else {
            setStoredValue(deserialize(e.newValue));
          }
        } catch (error) {
          console.error(`Error syncing localStorage key "${key}" across tabs:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, storedValue, defaultValue, serialize, deserialize, syncAcrossTabs]);

  return [
    storedValue,
    setValue,
    {
      remove: removeValue,
      hasValue,
      getRawValue,
      setRawValue
    }
  ];
};

// Specialized hooks for common use cases
export const useLocalStorageState = (key, initialValue) => {
  return useLocalStorage(key, initialValue);
};

export const useLocalStorageObject = (key, initialValue = {}) => {
  return useLocalStorage(key, initialValue, {
    serialize: JSON.stringify,
    deserialize: JSON.parse
  });
};

export const useLocalStorageArray = (key, initialValue = []) => {
  return useLocalStorage(key, initialValue, {
    serialize: JSON.stringify,
    deserialize: JSON.parse
  });
};

export const useLocalStorageString = (key, initialValue = '') => {
  return useLocalStorage(key, initialValue, {
    serialize: (value) => value,
    deserialize: (value) => value
  });
};

export const useLocalStorageNumber = (key, initialValue = 0) => {
  return useLocalStorage(key, initialValue, {
    serialize: (value) => value.toString(),
    deserialize: (value) => parseFloat(value) || 0
  });
};

export const useLocalStorageBoolean = (key, initialValue = false) => {
  return useLocalStorage(key, initialValue, {
    serialize: (value) => value.toString(),
    deserialize: (value) => value === 'true'
  });
};

// Hook for managing user preferences
export const useUserPreferences = () => {
  const [preferences, setPreferences] = useLocalStorageObject('userPreferences', {
    theme: 'light',
    language: 'en',
    notifications: true,
    autoRefresh: true,
    refreshInterval: 30000,
    itemsPerPage: 10,
    timeFormat: '24h',
    dateFormat: 'MM/DD/YYYY'
  });

  const updatePreference = useCallback((key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  }, [setPreferences]);

  const resetPreferences = useCallback(() => {
    setPreferences({
      theme: 'light',
      language: 'en',
      notifications: true,
      autoRefresh: true,
      refreshInterval: 30000,
      itemsPerPage: 10,
      timeFormat: '24h',
      dateFormat: 'MM/DD/YYYY'
    });
  }, [setPreferences]);

  return {
    preferences,
    setPreferences,
    updatePreference,
    resetPreferences
  };
};

export default useLocalStorage;