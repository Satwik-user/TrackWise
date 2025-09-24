import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ChartBarIcon,
  ArrowRightIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';
import ConfirmationDialog from '../Common/ConfirmationDialog';
import SafeRenderer from '../Common/SafeRenderer';

const DecisionPanel = ({ optimizationResults = null, onApplyDecision, onRejectDecision }) => {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState('apply');
  const [impactAnalysis, setImpactAnalysis] = useState(null);

  useEffect(() => {
    if (optimizationResults) {
      generateDecisions(optimizationResults);
    }
  }, [optimizationResults]);

  const generateDecisions = async (results) => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/optimization/decisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ optimizationResults: results }),
      });

      if (!response.ok) throw new Error('Failed to generate decisions');

      const data = await response.json();
      setDecisions(data.decisions || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Decision generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDecisionIcon = (type) => {
    switch (type) {
      case 'ROUTE_CHANGE':
        return <ArrowRightIcon className="h-5 w-5 text-blue-500" />;
      case 'SCHEDULE_ADJUSTMENT':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'PRIORITY_CHANGE':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'CAPACITY_OPTIMIZATION':
        return <ChartBarIcon className="h-5 w-5 text-green-500" />;
      case 'EMERGENCY_ACTION':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <LightBulbIcon className="h-5 w-5 text-purple-500" />;
    }
  };

  const getDecisionPriority = (priority) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
    switch (priority) {
      case 'HIGH':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'MEDIUM':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'LOW':
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getImpactColor = (impact) => {
    if (impact > 15) return 'text-green-600';
    if (impact > 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleDecisionAction = async (decision, action) => {
    setSelectedDecision(decision);
    setActionType(action);
    
    // Fetch impact analysis
    try {
      const response = await fetch(`/api/v1/optimization/decisions/${decision.id}/impact`);
      if (response.ok) {
        const impact = await response.json();
        setImpactAnalysis(impact);
      }
    } catch (err) {
      console.error('Impact analysis error:', err);
    }
    
    setShowConfirmDialog(true);
  };

  const confirmDecisionAction = async () => {
    if (!selectedDecision) return;

    try {
      setLoading(true);
      
      if (actionType === 'apply') {
        await onApplyDecision(selectedDecision);
      } else {
        await onRejectDecision(selectedDecision);
      }
      
      // Remove decision from list after action
      setDecisions(prev => prev.filter(d => d.id !== selectedDecision.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
      setSelectedDecision(null);
      setImpactAnalysis(null);
    }
  };

  const DecisionCard = ({ decision }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          {getDecisionIcon(decision.type)}
          <div className="ml-3">
            <h4 className="text-sm font-medium text-gray-900">{decision.title}</h4>
            <p className="text-xs text-gray-500">{decision.type.replace('_', ' ')}</p>
          </div>
        </div>
        <span className={getDecisionPriority(decision.priority)}>
          {decision.priority}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 mb-3">
        {decision.description}
      </p>

      {/* Affected Entities */}
      <div className="mb-3">
        <p className="text-xs font-medium text-gray-600 mb-1">Affected:</p>
        <div className="flex flex-wrap gap-1">
          {decision.affectedTrains && decision.affectedTrains.map(trainId => (
            <span key={trainId} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Train <SafeRenderer>{trainId}</SafeRenderer>
            </span>
          ))}
          {decision.affectedSections && decision.affectedSections.map(sectionId => (
            <span key={sectionId} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              Section <SafeRenderer>{sectionId}</SafeRenderer>
            </span>
          ))}
        </div>
      </div>

      {/* Impact Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-xs text-gray-600">Expected Impact</p>
          <p className={`text-sm font-semibold ${getImpactColor(decision.expectedImpact)}`}>
            {decision.expectedImpact > 0 ? '+' : ''}{decision.expectedImpact.toFixed(1)}%
          </p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-xs text-gray-600">Confidence</p>
          <p className="text-sm font-semibold text-gray-900">
            {(decision.confidence * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Time Sensitivity */}
      {decision.timeWindow && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-600 mb-1">Time Window:</p>
          <div className="flex items-center text-xs text-gray-700">
            <ClockIcon className="h-3 w-3 mr-1" />
            {decision.timeWindow.start && decision.timeWindow.end ? (
              `${new Date(decision.timeWindow.start).toLocaleTimeString()} - ${new Date(decision.timeWindow.end).toLocaleTimeString()}`
            ) : (
              'Immediate action required'
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={() => handleDecisionAction(decision, 'apply')}
          disabled={loading}
          className="flex-1 btn btn-primary btn-sm"
        >
          <PlayIcon className="h-3 w-3 mr-1" />
          Apply
        </button>
        <button
          onClick={() => handleDecisionAction(decision, 'reject')}
          disabled={loading}
          className="flex-1 btn btn-outline btn-sm"
        >
          <XCircleIcon className="h-3 w-3 mr-1" />
          Reject
        </button>
      </div>
    </div>
  );

  if (loading && decisions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <LoadingSpinner size="large" message="Generating optimization decisions..." centered />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="text-center py-8">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Generating Decisions</h3>
          <p className="text-gray-600 mb-4">
            <SafeRenderer>{error}</SafeRenderer>
          </p>
          <button
            onClick={() => optimizationResults && generateDecisions(optimizationResults)}
            className="btn btn-primary"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!optimizationResults) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="text-center py-8">
          <LightBulbIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Optimization Results</h3>
          <p className="text-gray-600">
            Run an optimization to see recommended decisions and actions.
          </p>
        </div>
      </div>
    );
  }

  if (decisions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="text-center py-8">
          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Actions Required</h3>
          <p className="text-gray-600">
            Current optimization results don't suggest any immediate actions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Optimization Decisions</h3>
          <p className="text-sm text-gray-600 mt-1">
            Review and apply recommended optimization decisions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {decisions.length} decision{decisions.length !== 1 ? 's' : ''} pending
          </span>
          <button
            onClick={() => optimizationResults && generateDecisions(optimizationResults)}
            className="btn btn-outline btn-sm"
            disabled={loading}
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Decision Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <p className="text-sm font-medium text-red-900">High Priority</p>
              <p className="text-lg font-bold text-red-700">
                {decisions.filter(d => d.priority === 'HIGH').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 text-yellow-500 mr-2" />
            <div>
              <p className="text-sm font-medium text-yellow-900">Medium Priority</p>
              <p className="text-lg font-bold text-yellow-700">
                {decisions.filter(d => d.priority === 'MEDIUM').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-900">Low Priority</p>
              <p className="text-lg font-bold text-green-700">
                {decisions.filter(d => d.priority === 'LOW').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <ChartBarIcon className="h-5 w-5 text-blue-500 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-900">Avg Impact</p>
              <p className="text-lg font-bold text-blue-700">
                {decisions.length > 0 ? 
                  `${(decisions.reduce((sum, d) => sum + d.expectedImpact, 0) / decisions.length).toFixed(1)}%`
                  : '0%'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Decisions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {decisions
          .sort((a, b) => {
            // Sort by priority (HIGH > MEDIUM > LOW) then by impact
            const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
              return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            return b.expectedImpact - a.expectedImpact;
          })
          .map((decision) => (
            <DecisionCard key={decision.id} decision={decision} />
          ))}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmDecisionAction}
        title={`${actionType === 'apply' ? 'Apply' : 'Reject'} Decision`}
        type={actionType === 'apply' ? 'info' : 'warning'}
        isLoading={loading}
      >
        {selectedDecision && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-700 mb-2">
                Are you sure you want to {actionType} this decision?
              </p>
              <div className="bg-gray-50 p-3 rounded border">
                <p className="font-medium text-gray-900">{selectedDecision.title}</p>
                <p className="text-sm text-gray-600">{selectedDecision.description}</p>
              </div>
            </div>

            {impactAnalysis && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Impact Analysis</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-2 rounded">
                    <p className="text-xs text-blue-600">Delay Reduction</p>
                    <p className="font-semibold text-blue-900">
                      {impactAnalysis.delayReduction?.toFixed(1) || 0}%
                    </p>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <p className="text-xs text-green-600">Efficiency Gain</p>
                    <p className="font-semibold text-green-900">
                      {impactAnalysis.efficiencyGain?.toFixed(1) || 0}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {actionType === 'apply' && selectedDecision.risks && selectedDecision.risks.length > 0 && (
              <div>
                <h4 className="font-medium text-red-900 mb-2">Potential Risks</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {selectedDecision.risks.map((risk, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-1 h-1 bg-red-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </ConfirmationDialog>
    </div>
  );
};

export default DecisionPanel;