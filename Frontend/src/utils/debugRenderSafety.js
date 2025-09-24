// Debug utility to find validation error objects in component props/state
export const debugRenderSafety = (obj, path = 'root') => {
  if (obj === null || obj === undefined) {
    return;
  }
  
  if (typeof obj !== 'object') {
    return;
  }
  
  // Check if this looks like a validation error object
  if (obj.type && obj.loc && obj.msg && obj.input) {
    console.warn(`Found validation error object at ${path}:`, obj);
    return;
  }
  
  // Check arrays
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      debugRenderSafety(item, `${path}[${index}]`);
    });
    return;
  }
  
  // Check object properties
  Object.entries(obj).forEach(([key, value]) => {
    debugRenderSafety(value, `${path}.${key}`);
  });
};

// Hook to debug component props for validation error objects
export const useRenderSafetyDebug = (props, componentName) => {
  React.useEffect(() => {
    debugRenderSafety(props, componentName);
  }, [props, componentName]);
};

export default { debugRenderSafety, useRenderSafetyDebug };