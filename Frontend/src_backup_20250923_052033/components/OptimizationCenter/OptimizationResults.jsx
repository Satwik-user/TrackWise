import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PlayIcon,
  CpuChipIcon,
  TruckIcon,
  MapIcon,
  BoltIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const OptimizationResults = ({ result, isLoading, onRerun }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDecision, setSelectedDecision] = useState(null);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!result) {
    return <EmptyState />;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'decisions', label: 'Decisions', icon: DocumentTextIcon },
    { id: 'performance', label: 'Performance', icon: BoltIcon },
    { id: 'analysis', label: 'Analysis', icon: EyeIcon }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPTIMAL':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'FEASIBLE':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'INFEASIBLE':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'ERROR':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OPTIMAL':
      case 'FEASIBLE':
        return CheckCircleIcon;
      case 'INFEASIBLE':
        return ExclamationTriangleIcon;
      case 'ERROR':
        return XCircleIcon;
      default:
        return ClockIcon;
    }
  };

  const StatusIcon = getStatusIcon(result.solution_status);
  const statusColor = getStatusColor(result.solution_status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg border ${statusColor}`}>
              <StatusIcon className="h-6 w-6" />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {result.scenario_name}
              </h2>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                <span>Status: {result.solution_status}</span>
                <span>•</span>
                <span>Solved in {result.solving_time?.toFixed(2)}s</span>
                <span>•</span>
                <span>{new Date(result.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => onRerun(result)}
              className="btn-secondary flex items-center space-x-2"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span>Rerun</span>
            </button>
            
            <button className="btn-secondary flex items-center space-x-2">
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <MetricCard
            label="Objective Value"
            value={result.objective_value?.toFixed(2) || 'N/A'}
            icon={ChartBarIcon}
            color="blue"
          />
          <MetricCard
            label="Total Delay"
            value={`${result.total_delay?.toFixed(1) || 0}m`}
            icon={ClockIcon}
            color={result.total_delay <= 300 ? 'green' : 'red'}
          />
          <MetricCard
            label="Decisions"
            value={result.decisions?.length || 0}
            icon={DocumentTextIcon}
            color="purple"
          />
          <MetricCard
            label="Trains Affected"
            value={result.trains_affected || 0}
            icon={TruckIcon}
            color="orange"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <OverviewTab key="overview" result={result} />
        )}
        
        {activeTab === 'decisions' && (
          <DecisionsTab 
            key="decisions" 
            decisions={result.decisions || []}
            selectedDecision={selectedDecision}
            onSelectDecision={setSelectedDecision}
          />
        )}
        
        {activeTab === 'performance' && (
          <PerformanceTab key="performance" result={result} />
        )}
        
        {activeTab === 'analysis' && (
          <AnalysisTab key="analysis" result={result} />
        )}
      </AnimatePresence>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ label, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    red: 'text-red-600 bg-red-100',
    purple: 'text-purple-600 bg-purple-100',
    orange: 'text-orange-600 bg-orange-100'
  };

  return (
    <div className="card p-4">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ result }) => {
  // Generate sample chart data
  const timelineData = result.timeline || [
    { time: '0:00', delay: 0, throughput: 0 },
    { time: '0:15', delay: 50, throughput: 12 },
    { time: '0:30', delay: 30, throughput: 18 },
    { time: '0:45', delay: 20, throughput: 22 },
    { time: '1:00', delay: 15, throughput: 25 }
  ];

  const improvementData = [
    { metric: 'Delay Reduction', before: 450, after: result.total_delay || 250, improvement: ((450 - (result.total_delay || 250)) / 450 * 100).toFixed(1) },
    { metric: 'Throughput Increase', before: 15, after: 22, improvement: '46.7' },
    { metric: 'Energy Efficiency', before: 75, after: 85, improvement: '13.3' },
    { metric: 'Safety Score', before: 88, after: 94, improvement: '6.8' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Summary */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Optimization Summary</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Key Improvements</h4>
            <div className="space-y-3">
              {improvementData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{item.metric}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">{item.before}</span>
                    <span className="text-sm text-gray-400">→</span>
                    <span className="text-sm font-medium text-gray-900">{item.after}</span>
                    <span className="text-sm font-medium text-green-600">+{item.improvement}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Optimization Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Algorithm:</span>
                <span className="font-medium">Mixed Integer Programming</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time Horizon:</span>
                <span className="font-medium">{Math.floor((result.time_horizon || 1800) / 60)} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Variables:</span>
                <span className="font-medium">{result.variables_count || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Constraints:</span>
                <span className="font-medium">{result.constraints_count || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gap:</span>
                <span className="font-medium">{((result.gap || 0) * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Performance Timeline</h3>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="delay" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Total Delay (min)"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="throughput" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Throughput (trains/hr)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};

// Decisions Tab Component
const DecisionsTab = ({ decisions, selectedDecision, onSelectDecision }) => {
  const decisionTypes = [...new Set(decisions.map(d => d.type))];
  const [filterType, setFilterType] = useState('all');

  const filteredDecisions = filterType === 'all' 
    ? decisions 
    : decisions.filter(d => d.type === filterType);

  const getDecisionIcon = (type) => {
    switch (type) {
      case 'SPEED_CONTROL':
        return BoltIcon;
      case 'ROUTE_CHANGE':
        return MapIcon;
      case 'SCHEDULE_ADJUSTMENT':
        return ClockIcon;
      case 'PRIORITY_OVERRIDE':
        return ExclamationTriangleIcon;
      default:
        return DocumentTextIcon;
    }
  };

  const getDecisionColor = (type) => {
    switch (type) {
      case 'SPEED_CONTROL':
        return 'text-blue-600 bg-blue-100';
      case 'ROUTE_CHANGE':
        return 'text-green-600 bg-green-100';
      case 'SCHEDULE_ADJUSTMENT':
        return 'text-yellow-600 bg-yellow-100';
      case 'PRIORITY_OVERRIDE':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Filter */}
      <div className="flex items-center space-x-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="input-field"
        >
          <option value="all">All Decision Types</option>
          {decisionTypes.map(type => (
            <option key={type} value={type}>
              {type.replace('_', ' ')}
            </option>
          ))}
        </select>
        
        <span className="text-sm text-gray-500">
          {filteredDecisions.length} of {decisions.length} decisions
        </span>
      </div>

      {/* Decisions List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Decision List</h3>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredDecisions.map((decision, index) => {
              const Icon = getDecisionIcon(decision.type);
              const color = getDecisionColor(decision.type);
              
              return (
                <div
                  key={index}
                  onClick={() => onSelectDecision(decision)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedDecision === decision 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {decision.type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        Train {decision.train_id} • Section {decision.section_id}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {decision.expected_improvement || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Decision Details */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Decision Details</h3>
          </div>
          
          {selectedDecision ? (
            <DecisionDetails decision={selectedDecision} />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <DocumentTextIcon className="h-12 w-12 mx-auto mb-3" />
              <p className="text-sm">Select a decision to view details</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Decision Details Component
const DecisionDetails = ({ decision }) => {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Decision Information</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span className="font-medium">{decision.type.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Train ID:</span>
            <span className="font-medium">{decision.train_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Section ID:</span>
            <span className="font-medium">{decision.section_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Priority:</span>
            <span className="font-medium">{decision.priority || 'Normal'}</span>
          </div>
        </div>
      </div>

      {decision.constraints && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Constraints</h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(decision.constraints, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {decision.expected_impact && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Expected Impact</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Delay Reduction:</span>
              <span className="font-medium text-green-600">
                -{decision.expected_impact.delay_reduction || 0}min
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Energy Savings:</span>
              <span className="font-medium text-blue-600">
                {decision.expected_impact.energy_savings || 0}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Performance Tab Component (Completed)
const PerformanceTab = ({ result }) => {
  const performanceMetrics = [
    { 
      label: 'Total Delay', 
      value: `${result.total_delay?.toFixed(1) || 0} min`, 
      target: '< 300 min', 
      status: (result.total_delay || 0) < 300 ? 'good' : 'warning' 
    },
    { 
      label: 'Throughput', 
      value: `${result.throughput?.toFixed(1) || 0} trains/hr`, 
      target: '> 20 trains/hr', 
      status: (result.throughput || 0) > 20 ? 'good' : 'warning' 
    },
    { 
      label: 'Energy Efficiency', 
      value: `${((result.energy_efficiency || 0) * 100).toFixed(1)}%`, 
      target: '> 85%', 
      status: (result.energy_efficiency || 0) > 0.85 ? 'good' : 'warning' 
    },
    { 
      label: 'Safety Score', 
      value: `${((result.safety_score || 0) * 100).toFixed(1)}%`, 
      target: '> 95%', 
      status: (result.safety_score || 0) > 0.95 ? 'good' : 'warning' 
    },
    { 
      label: 'Capacity Utilization', 
      value: `${((result.capacity_utilization || 0) * 100).toFixed(1)}%`, 
      target: '70-90%', 
      status: 'good' 
    },
    { 
      label: 'Punctuality Rate', 
      value: `${((result.punctuality_rate || 0) * 100).toFixed(1)}%`, 
      target: '> 90%', 
      status: (result.punctuality_rate || 0) > 0.9 ? 'good' : 'warning' 
    }
  ];

  const chartData = [
    { 
      name: 'Before', 
      delay: 450, 
      throughput: 15, 
      energy: 75, 
      safety: 88 
    },
    { 
      name: 'After', 
      delay: result.total_delay || 250, 
      throughput: result.throughput || 22, 
      energy: (result.energy_efficiency || 0.85) * 100, 
      safety: (result.safety_score || 0.94) * 100 
    }
  ];

  const radarData = [
    { metric: 'Delay', before: 40, after: 80 },
    { metric: 'Throughput', before: 60, after: 88 },
    { metric: 'Energy', before: 75, after: 85 },
    { metric: 'Safety', before: 88, after: 94 },
    { metric: 'Punctuality', before: 70, after: 90 },
    { metric: 'Capacity', before: 65, after: 85 }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {performanceMetrics.map((metric, index) => (
          <div key={index} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">{metric.label}</h4>
              <div className={`w-3 h-3 rounded-full ${
                metric.status === 'good' ? 'bg-green-500' : 
                metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
            <p className="text-xs text-gray-500">Target: {metric.target}</p>
          </div>
        ))}
      </div>

      {/* Performance Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Performance Comparison</h3>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="delay" fill="#ef4444" name="Delay (min)" />
                <Bar dataKey="throughput" fill="#10b981" name="Throughput (trains/hr)" />
                <Bar dataKey="energy" fill="#3b82f6" name="Energy Efficiency (%)" />
                <Bar dataKey="safety" fill="#8b5cf6" name="Safety Score (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Overall Performance</h3>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar 
                  name="Before" 
                  dataKey="before" 
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  fillOpacity={0.2} 
                />
                <Radar 
                  name="After" 
                  dataKey="after" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.2} 
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Constraint Violations</h3>
          </div>
          
          <div className="space-y-3">
            {result.constraint_violations?.length > 0 ? (
              result.constraint_violations.map((violation, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-red-900">{violation.constraint}</p>
                    <p className="text-xs text-red-700">{violation.description}</p>
                  </div>
                  <span className="text-sm font-medium text-red-600">
                    {violation.severity}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-green-600">
                <CheckCircleIcon className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm font-medium">No constraint violations</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Solver Statistics</h3>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Solution Status:</span>
              <span className="font-medium">{result.solution_status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Solving Time:</span>
              <span className="font-medium">{result.solving_time?.toFixed(2)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Iterations:</span>
              <span className="font-medium">{result.iterations || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Gap:</span>
              <span className="font-medium">{((result.gap || 0) * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Variables:</span>
              <span className="font-medium">{result.variables_count || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Constraints:</span>
              <span className="font-medium">{result.constraints_count || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Performance Trends</h3>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={result.performance_history || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="efficiency" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Efficiency (%)"
              />
              <Line 
                type="monotone" 
                dataKey="utilization" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Utilization (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};

// Analysis Tab Component
const AnalysisTab = ({ result }) => {
  const [selectedAnalysis, setSelectedAnalysis] = useState('sensitivity');

  const analysisTypes = [
    { id: 'sensitivity', label: 'Sensitivity Analysis', description: 'Parameter sensitivity analysis' },
    { id: 'scenarios', label: 'What-If Scenarios', description: 'Alternative scenario analysis' },
    { id: 'recommendations', label: 'Recommendations', description: 'AI-generated recommendations' },
    { id: 'risks', label: 'Risk Assessment', description: 'Identified risks and mitigation' }
  ];

  const sensitivityData = [
    { parameter: 'Weather Factor', impact: 'High', change: '-15%', description: 'Poor weather significantly affects performance' },
    { parameter: 'Traffic Density', impact: 'Medium', change: '+8%', description: 'Higher density reduces efficiency' },
    { parameter: 'Priority Weights', impact: 'Low', change: '+3%', description: 'Minimal impact on overall performance' },
    { parameter: 'Time Horizon', impact: 'Medium', change: '+12%', description: 'Longer horizons improve optimization quality' }
  ];

  const recommendations = [
    {
      category: 'Immediate Actions',
      items: [
        'Implement speed control for Train T1001 in Section SEC_003',
        'Adjust departure time for Train T1005 by +5 minutes',
        'Route Train T1008 through alternative Section SEC_007'
      ]
    },
    {
      category: 'Strategic Improvements',
      items: [
        'Consider capacity expansion for high-utilization sections',
        'Implement predictive maintenance scheduling',
        'Upgrade signaling systems for better throughput'
      ]
    },
    {
      category: 'Risk Mitigation',
      items: [
        'Establish contingency routes for critical sections',
        'Implement weather-adaptive scheduling',
        'Enhance crew training for emergency procedures'
      ]
    }
  ];

  const whatIfScenarios = [
    {
      scenario: 'Peak Hour Traffic +30%',
      impact: 'High',
      delay_increase: '+45 min',
      throughput_decrease: '-12%',
      recommendation: 'Increase buffer times and implement dynamic scheduling'
    },
    {
      scenario: 'Weather Disruption',
      impact: 'Medium',
      delay_increase: '+25 min',
      throughput_decrease: '-8%',
      recommendation: 'Activate weather contingency protocols'
    },
    {
      scenario: 'Equipment Failure',
      impact: 'High',
      delay_increase: '+60 min',
      throughput_decrease: '-20%',
      recommendation: 'Immediate rerouting and backup system activation'
    }
  ];

  const riskAssessment = [
    {
      risk: 'Signal System Failure',
      probability: 'Low',
      impact: 'High',
      mitigation: 'Backup signaling systems and manual override procedures',
      priority: 'High'
    },
    {
      risk: 'Weather Delays',
      probability: 'Medium',
      impact: 'Medium',
      mitigation: 'Weather monitoring and adaptive scheduling',
      priority: 'Medium'
    },
    {
      risk: 'Track Maintenance',
      probability: 'High',
      impact: 'Medium',
      mitigation: 'Scheduled maintenance windows and advance notifications',
      priority: 'Low'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Analysis Type Selector */}
      <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg">
        {analysisTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedAnalysis(type.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedAnalysis === type.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Analysis Content */}
      <AnimatePresence mode="wait">
        {selectedAnalysis === 'sensitivity' && (
          <motion.div
            key="sensitivity"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card"
          >
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Sensitivity Analysis</h3>
              <p className="text-sm text-gray-500">Impact of parameter changes on optimization results</p>
            </div>
            
            <div className="space-y-4">
              {sensitivityData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{item.parameter}</h4>
                    <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.impact === 'High' ? 'bg-red-100 text-red-800' :
                      item.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.impact} Impact
                    </span>
                    <span className="text-sm font-medium text-gray-900">{item.change}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {selectedAnalysis === 'scenarios' && (
          <motion.div
            key="scenarios"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card"
          >
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">What-If Scenarios</h3>
              <p className="text-sm text-gray-500">Analysis of alternative scenarios and their impacts</p>
            </div>
            
            <div className="space-y-4">
              {whatIfScenarios.map((scenario, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">{scenario.scenario}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      scenario.impact === 'High' ? 'bg-red-100 text-red-800' :
                      scenario.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {scenario.impact} Impact
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-600">Delay Increase:</span>
                      <span className="font-medium text-red-600 ml-2">{scenario.delay_increase}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Throughput Decrease:</span>
                      <span className="font-medium text-red-600 ml-2">{scenario.throughput_decrease}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <strong>Recommendation:</strong> {scenario.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {selectedAnalysis === 'recommendations' && (
          <motion.div
            key="recommendations"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {recommendations.map((category, index) => (
              <div key={index} className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">{category.category}</h3>
                </div>
                
                <div className="space-y-3">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-xs font-medium text-blue-600">{itemIndex + 1}</span>
                      </div>
                      <p className="text-sm text-gray-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {selectedAnalysis === 'risks' && (
          <motion.div
            key="risks"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card"
          >
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Risk Assessment</h3>
              <p className="text-sm text-gray-500">Identified risks and mitigation strategies</p>
            </div>
            
            <div className="space-y-4">
              {riskAssessment.map((risk, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">{risk.risk}</h4>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        risk.priority === 'High' ? 'bg-red-100 text-red-800' :
                        risk.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {risk.priority} Priority
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-600">Probability:</span>
                      <span className="font-medium ml-2">{risk.probability}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Impact:</span>
                      <span className="font-medium ml-2">{risk.impact}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <strong>Mitigation:</strong> {risk.mitigation}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Loading State Component
const LoadingState = () => {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
            <div className="flex-1">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
};

// Empty State Component
const EmptyState = () => {
  return (
    <div className="card">
      <div className="text-center py-12">
        <CpuChipIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Optimization Results</h3>
        <p className="text-gray-500 mb-6">
          Run an optimization to see detailed results and analysis here.
        </p>
        <button className="btn-primary flex items-center space-x-2 mx-auto">
          <PlayIcon className="h-4 w-4" />
          <span>Start Optimization</span>
        </button>
      </div>
    </div>
  );
};

export default OptimizationResults;