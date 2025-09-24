import React from 'react';

// Comprehensive error object detector and safe renderer
const ValidationErrorBoundary = ({ children }) => {
  const processChildren = (children) => {
    if (React.isValidElement(children)) {
      return children;
    }

    if (Array.isArray(children)) {
      return children.map((child, index) => processChildren(child));
    }

    // Check for validation error object
    if (children && typeof children === 'object' && children !== null) {
      // Validation error pattern: {type, loc, msg, input}
      if (children.type && children.loc && children.msg && typeof children.input !== 'undefined') {
        console.warn('🚨 Caught validation error object:', children);
        return <span className="text-red-600 text-sm font-medium">{children.msg}</span>;
      }
      
      // Generic object pattern
      if (children.constructor === Object) {
        console.warn('🚨 Caught generic object:', children);
        try {
          return <span className="text-gray-500 text-xs">{JSON.stringify(children)}</span>;
        } catch (e) {
          return <span className="text-gray-500 text-xs">[Object]</span>;
        }
      }
    }

    // Return safe primitives
    if (typeof children === 'string' || typeof children === 'number' || typeof children === 'boolean') {
      return children;
    }

    if (children === null || children === undefined) {
      return null;
    }

    // Fallback to string conversion
    return String(children);
  };

  try {
    return processChildren(children);
  } catch (error) {
    console.error('ValidationErrorBoundary caught error:', error);
    return <span className="text-red-600">Error rendering content</span>;
  }
};

export default ValidationErrorBoundary;