import React from 'react';

// Emergency component to test validation error rendering
const ValidationErrorTest = () => {
  // Simulate validation error objects that might be causing issues
  const testValidationError = {
    type: "value_error",
    loc: ["test_field"],
    msg: "This is a test validation error",
    input: null
  };

  const testArray = [
    "normal string",
    123,
    testValidationError,
    { normalObject: "test" },
    null,
    undefined
  ];

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
      <h3 className="text-lg font-bold mb-2">Validation Error Testing Component</h3>
      <p className="text-sm text-gray-600 mb-4">This component tests various data types to identify validation error objects:</p>
      
      <div className="space-y-2">
        {testArray.map((item, index) => (
          <div key={index} className="p-2 bg-white border rounded">
            <span className="text-xs text-gray-500">Item {index}: </span>
            <span className="font-mono">
              {/* This should be safe now with our ValidationErrorBoundary */}
              {typeof item === 'object' && item !== null && item.type && item.loc && item.msg ? 
                `[Validation Error: ${item.msg}]` : 
                String(item)
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ValidationErrorTest;