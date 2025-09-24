import React, { useState, useEffect } from 'react';
import { 
  LightBulbIcon,
  ChevronRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CogIcon,
  ArrowPathIcon,
  FireIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';

const ControllerRecommendationsPanel = ({ className = '' }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchRecommendations();
    const interval = setInterval(fetchRecommendations, 120000); // Update every 2 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get system-wide recommendations from multiple sources
      const [sections, trains, riskAssessment] = await Promise.all([
        apiService.sections.getAll(),
        apiService.trains.getAll(),
        apiService.predictions.getSystemWideRiskAssessment()
      ]);

      const generatedRecommendations = await generateRecommendations(sections.data, trains.data, riskAssessment);
      setRecommendations(generatedRecommendations);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      setError('Unable to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async (sections, trains, riskData) => {
    const recommendations = [];

    // 1. Traffic Flow Optimization
    const congestionSections = sections.filter(s => s.occupancy_rate > 0.8);
    if (congestionSections.length > 0) {
      recommendations.push({
        id: 'traffic-optimization',
        title: 'Optimize Traffic Flow',
        description: `${congestionSections.length} sections are experiencing high congestion (>80% occupancy)`,
        category: 'optimization',
        priority: 'high',
        action: 'Recommend speed adjustments and route diversions',
        impact: 'Reduce delays by 15-25%',
        timeToImplement: '5-10 minutes',
        affectedSections: congestionSections.map(s => s.id),
        icon: CogIcon,
        actionable: true
      });
    }

    // 2. Delay Prevention
    const delayedTrains = trains.filter(t => t.delay_minutes > 5);
    if (delayedTrains.length > 0) {
      recommendations.push({
        id: 'delay-prevention',
        title: 'Address Delayed Trains',
        description: `${delayedTrains.length} trains are significantly delayed (>5 minutes)`,
        category: 'operations',
        priority: 'high',
        action: 'Implement priority scheduling and speed optimization',
        impact: 'Improve punctuality by 10-20%',
        timeToImplement: '2-5 minutes',
        affectedTrains: delayedTrains.map(t => t.id),
        icon: ClockIcon,
        actionable: true
      });
    }

    // 3. Safety Improvements
    const highSpeedSections = sections.filter(s => s.current_utilization > 0.9 && s.speed_limit > 100);
    if (highSpeedSections.length > 0) {
      recommendations.push({
        id: 'safety-improvements',
        title: 'Enhanced Safety Monitoring',
        description: `${highSpeedSections.length} high-speed sections are at maximum capacity`,
        category: 'safety',
        priority: 'medium',
        action: 'Increase safety buffer distances and monitoring frequency',
        impact: 'Reduce safety incidents by 30%',
        timeToImplement: '10-15 minutes',
        affectedSections: highSpeedSections.map(s => s.id),
        icon: ShieldCheckIcon,
        actionable: true
      });
    }

    // 4. Energy Efficiency
    const energyOptimization = trains.filter(t => t.current_speed > t.optimal_speed * 1.1);
    if (energyOptimization.length > 0) {
      recommendations.push({
        id: 'energy-optimization',
        title: 'Optimize Energy Consumption',
        description: `${energyOptimization.length} trains are operating above optimal speed`,
        category: 'efficiency',
        priority: 'medium',
        action: 'Adjust speed profiles for energy-efficient operation',
        impact: 'Reduce energy costs by 8-12%',
        timeToImplement: '3-8 minutes',
        affectedTrains: energyOptimization.map(t => t.id),
        icon: CogIcon,
        actionable: true
      });
    }

    // 5. Predictive Maintenance
    const maintenanceAlerts = sections.filter(s => s.last_maintenance && 
      (Date.now() - new Date(s.last_maintenance).getTime()) > 30 * 24 * 60 * 60 * 1000);
    if (maintenanceAlerts.length > 0) {
      recommendations.push({
        id: 'predictive-maintenance',
        title: 'Schedule Preventive Maintenance',
        description: `${maintenanceAlerts.length} sections are due for maintenance`,
        category: 'maintenance',
        priority: 'low',
        action: 'Schedule maintenance during low-traffic periods',
        impact: 'Prevent 95% of potential failures',
        timeToImplement: '24-48 hours',
        affectedSections: maintenanceAlerts.map(s => s.id),
        icon: CogIcon,
        actionable: false
      });
    }

    // 6. ML-based risk mitigation
    if (riskData?.predictions) {
      const highRiskPredictions = riskData.predictions.filter(p => 
        p.disruption_prediction.risk_level === 'high'
      );
      
      if (highRiskPredictions.length > 0) {
        recommendations.push({
          id: 'risk-mitigation',
          title: 'Mitigate Disruption Risks',
          description: `ML models predict high disruption risk for ${highRiskPredictions.length} trains`,
          category: 'prediction',
          priority: 'high',
          action: 'Apply recommended mitigation strategies from ML analysis',
          impact: 'Prevent 70-80% of predicted disruptions',
          timeToImplement: '1-3 minutes',
          affectedTrains: highRiskPredictions.map(p => p.train_id),
          icon: FireIcon,
          actionable: true
        });
      }
    }

    // Sort by priority and return
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    return recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-700 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-700 bg-green-50 border-green-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'optimization': return CogIcon;
      case 'operations': return ClockIcon;
      case 'safety': return ShieldCheckIcon;
      case 'efficiency': return LightBulbIcon;
      case 'maintenance': return CogIcon;
      case 'prediction': return FireIcon;
      default: return LightBulbIcon;
    }
  };

  const categories = [
    { id: 'all', name: 'All Recommendations' },
    { id: 'optimization', name: 'Optimization' },
    { id: 'operations', name: 'Operations' },
    { id: 'safety', name: 'Safety' },
    { id: 'efficiency', name: 'Efficiency' },
    { id: 'prediction', name: 'ML Predictions' }
  ];

  const filteredRecommendations = selectedCategory === 'all' 
    ? recommendations 
    : recommendations.filter(r => r.category === selectedCategory);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full mr-3"></div>
            <div className="h-6 bg-gray-200 rounded w-48"></div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center text-red-600 mb-4">
          <ExclamationTriangleIcon className="w-6 h-6 mr-2" />
          <h3 className="text-lg font-semibold">Controller Recommendations</h3>
        </div>
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={fetchRecommendations}
          className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <LightBulbIcon className="w-6 h-6 text-yellow-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Controller Recommendations</h3>
              <p className="text-sm text-gray-500">AI-powered operational insights</p>
            </div>
          </div>
          <button
            onClick={fetchRecommendations}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Recommendations List */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {filteredRecommendations.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">All Good!</h4>
              <p className="text-gray-500">No recommendations at this time. System is operating optimally.</p>
            </div>
          ) : (
            filteredRecommendations.map((recommendation) => {
              const IconComponent = getCategoryIcon(recommendation.category);
              const priorityColor = getPriorityColor(recommendation.priority);

              return (
                <div
                  key={recommendation.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <IconComponent className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">
                          {recommendation.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {recommendation.description}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColor}`}>
                      {recommendation.priority.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Action:</span>
                      <p className="text-gray-600">{recommendation.action}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Impact:</span>
                      <p className="text-gray-600">{recommendation.impact}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Time:</span>
                      <p className="text-gray-600">{recommendation.timeToImplement}</p>
                    </div>
                  </div>

                  {recommendation.actionable && (
                    <div className="mt-4 pt-3 border-t">
                      <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                        Implement Recommendation
                        <ChevronRightIcon className="ml-2 w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-xs text-gray-500">
            Last updated: {lastUpdated?.toLocaleTimeString()}
          </span>
          <span className="text-xs text-gray-500">
            Auto-refresh: 2 min
          </span>
        </div>
      </div>
    </div>
  );
};

export default ControllerRecommendationsPanel;