import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  LightBulbIcon,
  ClockIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { apiService } from '../../services/apiService';

const DecisionSupportDashboard = () => {
  const [systemStatus, setSystemStatus] = useState({ status: 'loading' });
  const [recommendations, setRecommendations] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [kpis, setKpis] = useState({
    on_time_performance: 0,
    capacity_utilization: 0,
    delay_minutes: 0,
    efficiency_score: 0
  });
  const [alerts, setAlerts] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [scenarioResults, setScenarioResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch system status
  const fetchSystemStatus = async () => {
    try {
      const status = await apiService.decisions.getStatus();
      setSystemStatus(status);
    } catch (error) {
      console.error('Failed to fetch system status:', error);
      setSystemStatus({ status: 'error', message: 'Failed to connect to decision system' });
    }
  };

  // Fetch recommendations
  const fetchRecommendations = async () => {
    try {
      const recs = await apiService.decisions.getRecommendations();
      setRecommendations(recs || []);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    }
  };

  // Fetch KPIs
  const fetchKPIs = async () => {
    try {
      const kpiData = await apiService.decisions.getKPIs();
      setKpis(kpiData || kpis);
    } catch (error) {
      console.error('Failed to fetch KPIs:', error);
    }
  };

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      const alertData = await apiService.decisions.getAlerts();
      setAlerts(alertData || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  // Fetch what-if scenarios
  const fetchScenarios = async () => {
    try {
      const scenarioData = await apiService.decisions.getScenarios();
      setScenarios(scenarioData || []);
    } catch (error) {
      console.error('Failed to fetch scenarios:', error);
    }
  };

  // Run what-if scenario
  const runScenario = async (scenarioId) => {
    setIsLoading(true);
    try {
      const results = await apiService.decisions.runScenario(scenarioId);
      setScenarioResults(results);
      setSelectedScenario(scenarioId);
      toast.success('Scenario analysis completed');
    } catch (error) {
      toast.error(`Failed to run scenario: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply recommendation
  const applyRecommendation = async (recommendationId) => {
    setIsLoading(true);
    try {
      const result = await apiService.decisions.applyRecommendation(recommendationId);
      toast.success(result.message || 'Recommendation applied successfully');
      await fetchRecommendations(); // Refresh recommendations
      await fetchKPIs(); // Refresh KPIs
    } catch (error) {
      toast.error(`Failed to apply recommendation: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh data
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchSystemStatus(),
        fetchRecommendations(),
        fetchKPIs(),
        fetchAlerts(),
        fetchScenarios()
      ]);
    };

    fetchData();

    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'critical': return ExclamationTriangleIcon;
      case 'warning': return InformationCircleIcon;
      case 'info': return CheckCircleIcon;
      default: return InformationCircleIcon;
    }
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'warning': return 'yellow';
      case 'info': return 'blue';
      default: return 'gray';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return ArrowTrendingUpIcon;
      case 'medium': return ArrowTrendingUpIcon;
      case 'low': return ArrowTrendingDownIcon;
      default: return ArrowTrendingUpIcon;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <LightBulbIcon className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Decision Support Center</h1>
              <p className="text-sm text-gray-500">AI-powered recommendations and strategic insights</p>
            </div>
          </div>
          
          {/* System Status */}
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
            systemStatus.status === 'active' ? 'bg-green-100' : 
            systemStatus.status === 'error' ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              systemStatus.status === 'active' ? 'bg-green-500' : 
              systemStatus.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
            }`} />
            <span className={`font-medium ${
              systemStatus.status === 'active' ? 'text-green-800' : 
              systemStatus.status === 'error' ? 'text-red-800' : 'text-gray-800'
            }`}>
              {systemStatus.status === 'active' ? 'System Active' : 
               systemStatus.status === 'error' ? 'System Error' : 'Loading...'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* KPI Dashboard */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{(kpis.on_time_performance || 0).toFixed(1)}%</div>
                <div className="text-sm text-gray-600">On-Time Performance</div>
                <div className="mt-1">
                  <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 inline" />
                  <span className="text-xs text-green-600 ml-1">+2.3%</span>
                </div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{(kpis.capacity_utilization || 0).toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Capacity Utilization</div>
                <div className="mt-1">
                  <ArrowTrendingUpIcon className="h-4 w-4 text-blue-500 inline" />
                  <span className="text-xs text-blue-600 ml-1">+1.7%</span>
                </div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-3xl font-bold text-yellow-600">{(kpis.delay_minutes || 0).toFixed(0)}m</div>
                <div className="text-sm text-gray-600">Average Delay</div>
                <div className="mt-1">
                  <ArrowTrendingDownIcon className="h-4 w-4 text-green-500 inline" />
                  <span className="text-xs text-green-600 ml-1">-0.8m</span>
                </div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{(kpis.efficiency_score || 0).toFixed(1)}</div>
                <div className="text-sm text-gray-600">Efficiency Score</div>
                <div className="mt-1">
                  <ArrowTrendingUpIcon className="h-4 w-4 text-purple-500 inline" />
                  <span className="text-xs text-purple-600 ml-1">+0.5</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Alerts</h2>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {alerts.length > 0 ? (
                alerts.map((alert, index) => {
                  const AlertIcon = getAlertIcon(alert.severity);
                  const color = getAlertColor(alert.severity);
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border-l-4 border-${color}-500 bg-${color}-50`}
                    >
                      <div className="flex items-start space-x-3">
                        <AlertIcon className={`h-5 w-5 text-${color}-600 mt-0.5`} />
                        <div className="flex-1">
                          <h3 className={`font-medium text-${color}-800`}>{alert.title}</h3>
                          <p className={`text-sm text-${color}-700 mt-1`}>{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'Now'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p>All systems operational</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Recommendations</h2>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recommendations.length > 0 ? (
                recommendations.map((rec, index) => {
                  const PriorityIcon = getPriorityIcon(rec.priority);
                  const color = getPriorityColor(rec.priority);
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <PriorityIcon className={`h-4 w-4 text-${color}-600`} />
                            <span className={`text-xs font-medium text-${color}-600 uppercase`}>
                              {rec.priority} Priority
                            </span>
                          </div>
                          <h3 className="font-medium text-gray-900">{rec.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>Impact: {rec.impact}</span>
                            <span>Confidence: {rec.confidence}%</span>
                          </div>
                        </div>
                        <button
                          onClick={() => applyRecommendation(rec.id)}
                          disabled={isLoading}
                          className="ml-3 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <LightBulbIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p>No recommendations available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* What-If Scenarios */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">What-If Analysis</h2>
            
            <div className="space-y-3">
              {scenarios.length > 0 ? (
                scenarios.map((scenario, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{scenario.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
                        <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                          <ClockIcon className="h-3 w-3" />
                          <span>Duration: {scenario.duration}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => runScenario(scenario.id)}
                        disabled={isLoading}
                        className="flex items-center space-x-1 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                      >
                        <PlayIcon className="h-4 w-4" />
                        <span>Run</span>
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p>No scenarios available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scenario Results */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Analysis Results</h2>
            
            {scenarioResults ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900">Scenario: {selectedScenario}</h3>
                  <p className="text-sm text-blue-700 mt-1">{scenarioResults.summary}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-xl font-bold text-green-600">
                      {scenarioResults.metrics?.improvement || '+5.2%'}
                    </div>
                    <div className="text-xs text-gray-600">Expected Improvement</div>
                  </div>
                  
                  <div className="text-center p-3 bg-yellow-50 rounded">
                    <div className="text-xl font-bold text-yellow-600">
                      {scenarioResults.metrics?.cost || '$2.1K'}
                    </div>
                    <div className="text-xs text-gray-600">Implementation Cost</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Key Insights:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {scenarioResults.insights?.map((insight, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-blue-500">•</span>
                        <span>{insight}</span>
                      </li>
                    )) || [
                      <li key="1" className="flex items-start space-x-2">
                        <span className="text-blue-500">•</span>
                        <span>Reduced average delay by 15%</span>
                      </li>,
                      <li key="2" className="flex items-start space-x-2">
                        <span className="text-blue-500">•</span>
                        <span>Improved capacity utilization</span>
                      </li>
                    ]}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p>Run a scenario to see analysis results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DecisionSupportDashboard;