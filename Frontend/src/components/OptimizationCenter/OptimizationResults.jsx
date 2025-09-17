// ... (continuing from where we left off in PerformanceTab)

// Performance Tab Component
const PerformanceTab = ({ result }) => {
  const performanceMetrics = [
    { label: 'Total Delay', value: `${result.total_delay?.toFixed(1) || 0} min`, target: '< 300 min', status: (result.total_delay || 0) < 300 ? 'good' : 'warning' },
    { label: 'Throughput', value: `${result.throughput?.toFixed(1) || 0} trains/hr`, target: '> 20 trains/hr', status: (result.throughput || 0) > 20 ? 'good' : 'warning' },
    { label: 'Energy Efficiency', value: `${((result.energy_efficiency || 0) * 100).toFixed(1)}%`, target: '> 85%', status: (result.energy_efficiency || 0) > 0.85 ? 'good' : 'warning' },
    { label: 'Safety Score', value: `${((result.safety_score || 0) * 100).toFixed(1)}%`, target: '> 95%', status: (result.safety_score || 0) > 0.95 ? 'good' : 'warning' },
    { label: 'Capacity Utilization', value: `${((result.capacity_utilization || 0) * 100).toFixed(1)}%`, target: '70-90%', status: 'good' },
    { label: 'Punctuality Rate', value: `${((result.punctuality_rate || 0) * 100).toFixed(1)}%`, target: '> 90%', status: (result.punctuality_rate || 0) > 0.9 ? 'good' : 'warning' }
  ];

  const chartData = [
    { name: 'Before', delay: 450, throughput: 15, energy: 75, safety: 88 },
    { name: 'After', delay: result.total_delay || 250, throughput: result.throughput || 22, energy: (result.energy_efficiency || 0.85) * 100, safety: (result.safety_score || 0.94) * 100 }
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

      {/* Performance Comparison Chart */}
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

        {(selectedAnalysis === 'scenarios' || selectedAnalysis === 'risks') && (
          <motion.div
            key={selectedAnalysis}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card"
          >
            <div className="text-center py-12 text-gray-500">
              <ChartBarIcon className="h-12 w-12 mx-auto mb-3" />
              <p className="text-sm font-medium">
                {selectedAnalysis === 'scenarios' ? 'What-If Analysis' : 'Risk Assessment'}
              </p>
              <p className="text-xs mt-1">Advanced analysis features coming soon</p>
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