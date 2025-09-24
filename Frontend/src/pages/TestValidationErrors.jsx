import React from 'react';
import SafeRenderer from '../components/Common/SafeRenderer';

const TestValidationErrors = () => {
  // Sample validation error objects that were causing issues
  const validationErrors = [
    {
      type: "value_error",
      loc: ["train_id"],
      msg: "Train ID is required",
      input: null
    },
    {
      type: "validation_error", 
      loc: ["section_ids", 0],
      msg: "Section ID must be a positive integer",
      input: -1
    },
    {
      type: "type_error",
      loc: ["time_horizon"],
      msg: "Time horizon must be a number",
      input: "invalid"
    }
  ];

  const sampleOptimizationResult = {
    scenario_name: "Test Scenario",
    solution_status: "OPTIMAL",
    objective_value: 123.45,
    total_delay: 250.5,
    decisions: [
      {
        type: "route_change",
        train_id: "T001", 
        section_id: "S001",
        expected_improvement: "5min reduction",
        constraints: validationErrors[0], // This would cause error rendering
        priority: "High"
      }
    ],
    constraint_violations: [
      {
        constraint: "capacity_limit",
        description: "Section S002 exceeds capacity",
        severity: "Medium",
        details: validationErrors[1] // Another error object
      }
    ]
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Validation Error Testing</h1>
      
      {/* Test 1: Direct Error Object Rendering */}
      <div className="bg-white p-4 rounded-lg border mb-6">
        <h2 className="text-lg font-semibold mb-3">Test 1: Direct Error Object Rendering</h2>
        <div className="space-y-2">
          {validationErrors.map((error, index) => (
            <div key={index} className="p-2 bg-red-50 border border-red-200 rounded">
              <span className="text-sm text-red-600">
                <SafeRenderer>{error}</SafeRenderer>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Test 2: Error Objects in Data Structures */}
      <div className="bg-white p-4 rounded-lg border mb-6">
        <h2 className="text-lg font-semibold mb-3">Test 2: Error Objects in Complex Data</h2>
        <div className="space-y-3">
          <div>
            <span className="font-medium">Decision Constraints: </span>
            <SafeRenderer>{sampleOptimizationResult.decisions[0].constraints}</SafeRenderer>
          </div>
          <div>
            <span className="font-medium">Violation Details: </span>
            <SafeRenderer>{sampleOptimizationResult.constraint_violations[0].details}</SafeRenderer>
          </div>
        </div>
      </div>

      {/* Test 3: Mixed Content Rendering */}
      <div className="bg-white p-4 rounded-lg border">
        <h2 className="text-lg font-semibold mb-3">Test 3: Mixed Content Types</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">String: </span>
            <SafeRenderer>{"Normal string"}</SafeRenderer>
          </div>
          <div>
            <span className="font-medium">Number: </span>
            <SafeRenderer>{123.45}</SafeRenderer>
          </div>
          <div>
            <span className="font-medium">Boolean: </span>
            <SafeRenderer>{true}</SafeRenderer>
          </div>
          <div>
            <span className="font-medium">Null: </span>
            <SafeRenderer>{null}</SafeRenderer>
          </div>
          <div>
            <span className="font-medium">Array: </span>
            <SafeRenderer>{["item1", "item2"]}</SafeRenderer>
          </div>
          <div>
            <span className="font-medium">Error Object: </span>
            <SafeRenderer>{validationErrors[0]}</SafeRenderer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestValidationErrors;