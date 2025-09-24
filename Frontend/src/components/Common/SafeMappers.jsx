import React from 'react';
import SafeRenderer from './SafeRenderer';

// Safe map function that wraps each rendered item with SafeRenderer
export const safeMap = (array, mapFunction) => {
  if (!Array.isArray(array)) {
    console.warn('safeMap called with non-array:', array);
    return null;
  }
  
  return array.map((item, index) => {
    try {
      const result = mapFunction(item, index);
      
      // If the result is a React element, return it as-is
      if (React.isValidElement(result)) {
        return result;
      }
      
      // If the result contains any objects, wrap them safely
      return <SafeRenderer key={index}>{result}</SafeRenderer>;
    } catch (error) {
      console.error('Error in safeMap:', error, 'Item:', item);
      return <SafeRenderer key={index}>Error rendering item</SafeRenderer>;
    }
  });
};

// Higher-order component to wrap any component that might render validation errors
export const withValidationErrorProtection = (WrappedComponent) => {
  return function ValidationErrorProtectedComponent(props) {
    try {
      return <WrappedComponent {...props} />;
    } catch (error) {
      console.error('Component error caught by validation error protection:', error);
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600 text-sm">Error rendering component</p>
        </div>
      );
    }
  };
};

export default { safeMap, withValidationErrorProtection };