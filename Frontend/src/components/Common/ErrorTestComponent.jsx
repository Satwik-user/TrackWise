import React from 'react';

const ErrorTestComponent = () => {
  // Test that validation error objects are properly handled
  const testValidationError = {
    type: 'string_type',
    loc: ['field', 0],
    msg: 'ensure this value is a string',
    input: 123
  };

  const testComplexData = {
    data: [
      {
        id: 1,
        results: {
          optimized_schedule: [
            {
              validation_error: testValidationError,
              train_id: 1
            }
          ]
        }
      }
    ]
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
      <h3 className="text-sm font-semibold text-yellow-800 mb-2">Error Handling Test</h3>
      <div className="text-xs text-yellow-700">
        <p>Testing ValidationErrorBoundary and SafeRenderer:</p>
        <p>• ValidationError object: {JSON.stringify(testValidationError)}</p>
        <p>• Complex data structure: {JSON.stringify(testComplexData)}</p>
        <p>If you see this, error handling is working!</p>
      </div>
    </div>
  );
};

export default ErrorTestComponent;