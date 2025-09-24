import React from 'react';

// Safe wrapper component that prevents validation error objects from being rendered
export const SafeRenderer = ({ children }) => {
  if (React.isValidElement(children)) {
    return children;
  }

  if (typeof children === 'string' || typeof children === 'number' || typeof children === 'boolean') {
    return children;
  }

  if (children === null || children === undefined) {
    return null;
  }

  if (Array.isArray(children)) {
    return children.map((child, index) => (
      <SafeRenderer key={index}>{child}</SafeRenderer>
    ));
  }

  if (typeof children === 'object') {
    // Check if this is a validation error object
    if (children.type && children.loc && children.msg && children.input) {
      return <span className="text-red-600 text-sm">{children.msg}</span>;
    }
    
    // For other objects, stringify them safely
    try {
      return <span className="text-gray-500 text-xs">{JSON.stringify(children)}</span>;
    } catch (err) {
      return <span className="text-gray-500 text-xs">[Object]</span>;
    }
  }

  return String(children);
};

// Hook to safely render any value
export const useSafeRender = (value) => {
  return React.useMemo(() => {
    if (typeof value === 'object' && value !== null) {
      if (value.type && value.loc && value.msg && value.input) {
        return value.msg; // Return just the message for validation errors
      }
      return JSON.stringify(value);
    }
    return value;
  }, [value]);
};

export default SafeRenderer;