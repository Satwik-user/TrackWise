import React, { useState, useEffect } from 'react';
import { 
  ShieldExclamationIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  LightBulbIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';

const DisruptionAlertPanel = ({ className = '' }) => {
  const [systemRisk, setSystemRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchSystemRisk();
    const interval = setInterval(fetchSystemRisk, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchSystemRisk = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.predictions.getSystemWideRiskAssessment();
      setSystemRisk(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch system risk assessment:', err);
      setError('Unable to fetch risk assessment');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (predictions) => {
    if (!predictions || predictions.length === 0) return 'unknown';
    
    const highRiskCount = predictions.filter(p => 
      p.disruption_prediction.risk_level === 'high' || 
      p.disruption_prediction.disruption_probability > 0.7
    ).length;
    
    const moderateRiskCount = predictions.filter(p => 
      p.disruption_prediction.risk_level === 'moderate' || 
      (p.disruption_prediction.disruption_probability > 0.4 && p.disruption_prediction.disruption_probability <= 0.7)
    ).length;

    if (highRiskCount > 0) return 'high';
    if (moderateRiskCount > 2) return 'moderate';
    return 'low';
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return 'text-green-700 bg-green-50 border-green-200';
      case 'moderate': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'low': return CheckCircleIcon;
      case 'moderate': return ExclamationCircleIcon;
      case 'high': return ShieldExclamationIcon;
      default: return InformationCircleIcon;
    }
  };

  const getTopRecommendations = (predictions) => {
    if (!predictions) return [];
    
    const allRecommendations = predictions
      .filter(p => p.disruption_prediction.recommended_actions)
      .flatMap(p => p.disruption_prediction.recommended_actions)
      .filter(action => action && action.trim().length > 0);
    
    // Count frequency and return top 3
    const counts = {};
    allRecommendations.forEach(action => {
      counts[action] = (counts[action] || 0) + 1;
    });
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([action]) => action);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full mr-3"></div>
            <div className="h-6 bg-gray-200 rounded w-40"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center text-red-600 mb-4">
          <ExclamationCircleIcon className="w-6 h-6 mr-2" />
          <h3 className="text-lg font-semibold">System Risk Assessment</h3>
        </div>
        <p className="text-red-600 text-sm">{typeof error === 'string' ? error : JSON.stringify(error)}</p>
        <button
          onClick={fetchSystemRisk}
          className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  const riskLevel = getRiskLevel(systemRisk?.predictions);
  const riskColor = getRiskColor(riskLevel);
  const RiskIcon = getRiskIcon(riskLevel);
  const recommendations = getTopRecommendations(systemRisk?.predictions);

  return (
    <div className={`bg-white rounded-lg shadow-md border ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${riskColor}`}>
              <RiskIcon className="w-6 h-6" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900">System Risk Assessment</h3>
              <p className="text-sm text-gray-500">
                Real-time disruption monitoring
              </p>
            </div>
          </div>
          <button
            onClick={fetchSystemRisk}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Risk Level</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${riskColor}`}>
                {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
              </span>
            </div>
            
            {systemRisk?.predictions && (
              <div className="text-sm text-gray-600">
                Monitoring {systemRisk.predictions.length} active train{systemRisk.predictions.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {systemRisk?.predictions && systemRisk.predictions.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">High Priority Alerts</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {systemRisk.predictions
                  .filter(p => p.disruption_prediction.risk_level === 'high' || p.disruption_prediction.disruption_probability > 0.6)
                  .slice(0, 3)
                  .map((prediction, index) => (
                    <div key={index} className="flex items-center p-2 bg-red-50 border border-red-200 rounded">
                      <ShieldExclamationIcon className="w-4 h-4 text-red-600 mr-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-red-800 truncate">
                          Train {prediction.train_id}: {(prediction.disruption_prediction.disruption_probability * 100).toFixed(0)}% disruption risk
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <LightBulbIcon className="w-4 h-4 mr-1 text-yellow-500" />
                Recommended Actions
              </h4>
              <div className="space-y-2">
                {recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start p-2 bg-blue-50 border border-blue-200 rounded">
                    <InformationCircleIcon className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-gray-500">
              Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
            </span>
            <span className="text-xs text-gray-500">
              Auto-refresh: 1 min
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisruptionAlertPanel;