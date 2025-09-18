import { useState, useEffect, useCallback, useRef } from 'react';

// Default export (primary hook)
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Advanced debounce hook
export const useAdvancedDebounce = (value, delay, options = {}) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const { immediate = false, maxWait = null } = options;
  const timeoutRef = useRef();
  const maxTimeoutRef = useRef();
  const lastCallTimeRef = useRef();

  useEffect(() => {
    const callNow = immediate && !timeoutRef.current;
    
    clearTimeout(timeoutRef.current);
    clearTimeout(maxTimeoutRef.current);

    if (callNow) {
      setDebouncedValue(value);
    }

    const later = () => {
      timeoutRef.current = null;
      if (!immediate) {
        setDebouncedValue(value);
      }
    };

    timeoutRef.current = setTimeout(later, delay);

    // MaxWait functionality
    if (maxWait && !maxTimeoutRef.current) {
      maxTimeoutRef.current = setTimeout(() => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          later();
        }
      }, maxWait);
    }

    lastCallTimeRef.current = Date.now();

    return () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(maxTimeoutRef.current);
    };
  }, [value, delay, immediate, maxWait]);

  return debouncedValue;
};

// Debounced callback hook
export const useDebouncedCallback = (callback, delay, deps = []) => {
  const timeoutRef = useRef();

  const debouncedCallback = useCallback((...args) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay, ...deps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return debouncedCallback;
};

// Debounced search hook
export const useDebouncedSearch = (searchFunction, delay = 300) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  useEffect(() => {
    if (debouncedSearchTerm) {
      setIsSearching(true);
      setError(null);
      
      const performSearch = async () => {
        try {
          const searchResults = await searchFunction(debouncedSearchTerm);
          setResults(searchResults);
        } catch (err) {
          setError(err);
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      };

      performSearch();
    } else {
      setResults([]);
      setIsSearching(false);
    }
  }, [debouncedSearchTerm, searchFunction]);

  return {
    searchTerm,
    setSearchTerm,
    results,
    isSearching,
    error,
    clearResults: () => setResults([])
  };
};

// Debounced API call hook
export const useDebouncedApiCall = (apiFunction, delay = 500) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef();

  const makeCall = useCallback((...args) => {
    clearTimeout(timeoutRef.current);
    setError(null);
    
    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await apiFunction(...args);
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }, delay);
  }, [apiFunction, delay]);

  const cancel = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return { data, loading, error, makeCall, cancel };
};

// Default export
export default useDebounce;

// Named exports for backwards compatibility
export { useDebounce };