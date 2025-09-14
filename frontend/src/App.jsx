import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart
} from "recharts";
import { 
  Train, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Bell,
  BarChart3,
  Route,
  Signal,
  Wifi,
  Battery,
  MapPin,
  AlertTriangle,
  Activity,
  ChevronRight,
  Settings,
  Search,
  Filter,
  Zap,
  Users,
  Globe,
  Shield,
  Smartphone,
  Monitor
} from "lucide-react";

// Enhanced sample data
const delayTrendData = [
  { time: '6AM', value: 5, target: 8 },
  { time: '9AM', value: 8, target: 10 },
  { time: '12PM', value: 12, target: 15 },
  { time: '3PM', value: 15, target: 12 },
  { time: '6PM', value: 18, target: 20 },
  { time: '9PM', value: 22, target: 18 },
  { time: '12AM', value: 16, target: 14 },
  { time: '3AM', value: 12, target: 10 },
];

const throughputData = [
  { hour: "6AM", value: 75, capacity: 100 },
  { hour: "9AM", value: 85, capacity: 100 },
  { hour: "12PM", value: 92, capacity: 100 },
  { hour: "3PM", value: 88, capacity: 100 },
  { hour: "6PM", value: 95, capacity: 100 },
];

const congestionData = [
  { time: 1, normal: 85, congested: 15 },
  { time: 2, normal: 78, congested: 22 },
  { time: 3, normal: 82, congested: 18 },
  { time: 4, normal: 75, congested: 25 },
  { time: 5, normal: 88, congested: 12 },
  { time: 6, normal: 90, congested: 10 },
];

export default function App() {
  const [activeView, setActiveView] = useState("overview");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState("desktop"); // "mobile" or "desktop"

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleViewChange = (view) => {
    setIsLoading(true);
    setTimeout(() => {
      setActiveView(view);
      setIsLoading(false);
    }, 150);
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === "mobile" ? "desktop" : "mobile");
  };

  // Enhanced Mobile Status Bar Component
  const StatusBar = () => (
    <div className="status-bar">
      <span className="status-time">{currentTime.toLocaleTimeString().slice(0, 5)}</span>
      <div className="status-indicators">
        <div className="signal-strength">
          {[1,2,3,4].map(i => (
            <div key={i} className={`signal-bar ${i <= 3 ? 'active' : ''}`}></div>
          ))}
        </div>
        <Wifi className="status-icon" />
        <div className="battery-container">
          <Battery className="battery-icon" />
          <div className="battery-level"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-fullscreen">
      {/* View Mode Toggle */}
      <div className="view-toggle">
        <button
          onClick={toggleViewMode}
          className={`toggle-btn ${viewMode === "mobile" ? "active" : ""}`}
          title="Switch to Mobile View"
        >
          <Smartphone className="toggle-icon" />
          <span>Mobile</span>
        </button>
        <button
          onClick={toggleViewMode}
          className={`toggle-btn ${viewMode === "desktop" ? "active" : ""}`}
          title="Switch to Desktop View"
        >
          <Monitor className="toggle-icon" />
          <span>Desktop</span>
        </button>
      </div>

      {/* Mobile View */}
      {viewMode === "mobile" && (
        <div className="mobile-layout-fullscreen">
          <div className="mobile-device-fullscreen">
            <StatusBar />
            
            <div className="mobile-content">
              {/* Enhanced Header */}
              <div className="mobile-header">
                <div className="header-content">
                  <h1 className="main-title">AI Rail Traffic Control</h1>
                  <p className="subtitle">Real-time railway management system</p>
                </div>
                <div className="header-actions">
                  <button className="action-btn">
                    <Search className="action-icon" />
                  </button>
                  <button className="action-btn">
                    <Settings className="action-icon" />
                  </button>
                </div>
              </div>

              {/* Enhanced Navigation */}
              <div className="navigation-container">
                <div className="nav-pills">
                  {[
                    { id: "overview", label: "Overview", icon: BarChart3 },
                    { id: "live", label: "Live", icon: MapPin },
                    { id: "alerts", label: "Alerts", icon: Bell },
                    { id: "analytics", label: "Analytics", icon: TrendingUp },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleViewChange(tab.id)}
                      className={`nav-pill ${activeView === tab.id ? 'active' : ''}`}
                    >
                      <tab.icon className="nav-icon" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Area with Loading State */}
              <div className="content-area">
                {isLoading ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">Loading...</p>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    {activeView === "overview" && (
                      <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="view-content"
                      >
                        {/* Enhanced On-Time Status Card */}
                        <div className="status-card success">
                          <div className="status-header">
                            <div className="status-icon-container">
                              <CheckCircle className="status-icon" />
                            </div>
                            <div className="status-info">
                              <h3 className="status-title">On-Time Performance</h3>
                              <p className="status-description">87% of trains running on schedule</p>
                              <div className="status-trend">
                                <TrendingUp className="trend-icon" />
                                <span>+3.2% from yesterday</span>
                              </div>
                            </div>
                          </div>
                          <div className="status-progress">
                            <div className="progress-bar">
                              <div className="progress-fill" style={{width: '87%'}}></div>
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Quick Stats Grid */}
                        <div className="stats-grid">
                          <div className="stat-card">
                            <div className="stat-header">
                              <Clock className="stat-icon delay" />
                              <div className="stat-trend positive">↓ 15%</div>
                            </div>
                            <div className="stat-value">12</div>
                            <div className="stat-label">avg delay (min)</div>
                            <div className="stat-sparkline">
                              <div className="sparkline-bar" style={{height: '60%'}}></div>
                              <div className="sparkline-bar" style={{height: '40%'}}></div>
                              <div className="sparkline-bar" style={{height: '30%'}}></div>
                              <div className="sparkline-bar" style={{height: '20%'}}></div>
                            </div>
                          </div>
                          
                          <div className="stat-card">
                            <div className="stat-header">
                              <BarChart3 className="stat-icon capacity" />
                              <div className="stat-trend positive">↑ 8%</div>
                            </div>
                            <div className="stat-value">94%</div>
                            <div className="stat-label">capacity usage</div>
                            <div className="stat-sparkline">
                              <div className="sparkline-bar" style={{height: '80%'}}></div>
                              <div className="sparkline-bar" style={{height: '90%'}}></div>
                              <div className="sparkline-bar" style={{height: '100%'}}></div>
                              <div className="sparkline-bar" style={{height: '95%'}}></div>
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Delay Alerts */}
                        <div className="card">
                          <div className="card-header">
                            <h3 className="card-title">Active Delays</h3>
                            <div className="card-badge">2 active</div>
                          </div>
                          
                          <div className="alerts-list">
                            <div className="alert-item critical">
                              <div className="alert-indicator"></div>
                              <div className="alert-icon-container">
                                <Train className="alert-icon" />
                              </div>
                              <div className="alert-content">
                                <div className="alert-title">Train 205</div>
                                <div className="alert-subtitle">Central → North</div>
                                <div className="alert-meta">
                                  <span className="alert-time">Started 15m ago</span>
                                  <span className="alert-cause">Signal delay</span>
                                </div>
                              </div>
                              <div className="alert-status">
                                <div className="delay-time">15 min</div>
                                <div className="delay-label">late</div>
                              </div>
                            </div>
                            
                            <div className="alert-item warning">
                              <div className="alert-indicator"></div>
                              <div className="alert-icon-container">
                                <Train className="alert-icon" />
                              </div>
                              <div className="alert-content">
                                <div className="alert-title">Train 307</div>
                                <div className="alert-subtitle">East → West</div>
                                <div className="alert-meta">
                                  <span className="alert-time">Started 8m ago</span>
                                  <span className="alert-cause">Track maintenance</span>
                                </div>
                              </div>
                              <div className="alert-status">
                                <div className="delay-time">8 min</div>
                                <div className="delay-label">late</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Performance Chart */}
                        <div className="card">
                          <div className="card-header">
                            <h3 className="card-title">Daily Performance</h3>
                            <div className="chart-legend">
                              <div className="legend-item">
                                <div className="legend-color actual"></div>
                                <span>Actual</span>
                              </div>
                              <div className="legend-item">
                                <div className="legend-color target"></div>
                                <span>Target</span>
                              </div>
                            </div>
                          </div>
                          <div className="chart-container">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={delayTrendData}>
                                <defs>
                                  <linearGradient id="delayGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <Area 
                                  type="monotone" 
                                  dataKey="value" 
                                  stroke="#ef4444" 
                                  strokeWidth={3}
                                  fill="url(#delayGradient)"
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="target" 
                                  stroke="#64748b" 
                                  strokeWidth={2}
                                  strokeDasharray="5 5"
                                  dot={false}
                                />
                                <XAxis 
                                  dataKey="time" 
                                  axisLine={false} 
                                  tickLine={false}
                                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                                />
                                <YAxis hide />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeView === "live" && (
                      <motion.div
                        key="live"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="view-content"
                      >
                        <div className="card">
                          <div className="card-header">
                            <h3 className="card-title">Live Train Tracker</h3>
                            <div className="card-badge live">Live</div>
                          </div>
                          
                          {/* Enhanced Track Visualization */}
                          <div className="track-container">
                            <div className="track-line"></div>
                            
                            {/* Animated trains */}
                            <motion.div 
                              className="train-marker success"
                              style={{ left: '25%' }}
                              animate={{ x: [0, 10, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <Train className="train-icon" />
                              <div className="train-label">307</div>
                            </motion.div>
                            
                            <motion.div 
                              className="train-marker critical"
                              style={{ left: '65%' }}
                              animate={{ x: [0, -5, 0] }}
                              transition={{ duration: 3, repeat: Infinity }}
                            >
                              <Train className="train-icon" />
                              <div className="train-label">205</div>
                            </motion.div>
                            
                            {/* Stations */}
                            <div className="station-marker start">
                              <div className="station-dot"></div>
                              <div className="station-label">Central</div>
                            </div>
                            <div className="station-marker end">
                              <div className="station-dot"></div>
                              <div className="station-label">North</div>
                            </div>
                          </div>

                          {/* Enhanced Train Status List */}
                          <div className="train-list">
                            {[
                              { id: "205", status: "delayed", delay: 15, route: "Central → North", speed: 45, eta: "14:45" },
                              { id: "307", status: "ontime", delay: 0, route: "East → West", speed: 60, eta: "14:32" },
                              { id: "412", status: "approaching", delay: 2, route: "South → Central", speed: 55, eta: "14:38" },
                            ].map((train) => (
                              <div key={train.id} className={`train-item ${train.status}`}>
                                <div className="train-info">
                                  <div className="train-header">
                                    <div className="train-number">Train {train.id}</div>
                                    <div className={`train-status ${train.status}`}>
                                      {train.status === 'ontime' ? 'On Time' :
                                       train.status === 'delayed' ? `${train.delay}m late` : 'Approaching'}
                                    </div>
                                  </div>
                                  <div className="train-route">{train.route}</div>
                                  <div className="train-meta">
                                    <span>Speed: {train.speed} km/h</span>
                                    <span>ETA: {train.eta}</span>
                                  </div>
                                </div>
                                <div className="train-actions">
                                  <ChevronRight className="action-arrow" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeView === "alerts" && (
                      <motion.div
                        key="alerts"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="view-content"
                      >
                        <div className="alerts-header">
                          <h2 className="view-title">System Alerts</h2>
                          <div className="alerts-filter">
                            <button className="filter-btn active">All</button>
                            <button className="filter-btn">Critical</button>
                            <button className="filter-btn">Warnings</button>
                          </div>
                        </div>

                        <div className="alerts-container">
                          {[
                            { 
                              type: "critical", 
                              icon: AlertTriangle, 
                              title: "Signal System Failure", 
                              message: "Junction 7 experiencing complete signal failure. Manual override activated.", 
                              time: "2 min ago", 
                              location: "Junction 7",
                              affected: "3 trains"
                            },
                            { 
                              type: "warning", 
                              icon: Clock, 
                              title: "Schedule Disruption", 
                              message: "Train 205 delayed due to track congestion in central district.", 
                              time: "5 min ago", 
                              location: "Central District",
                              affected: "1 train"
                            },
                            { 
                              type: "info", 
                              icon: Zap, 
                              title: "AI Route Optimization", 
                              message: "System suggests rerouting Train 412 for improved efficiency.", 
                              time: "8 min ago", 
                              location: "Network-wide",
                              affected: "Optimization"
                            },
                            { 
                              type: "warning", 
                              icon: Users, 
                              title: "High Passenger Volume", 
                              message: "Platform 3 reaching capacity limits during rush hour.", 
                              time: "12 min ago", 
                              location: "Platform 3",
                              affected: "Platform"
                            },
                          ].map((alert, index) => (
                            <div key={index} className={`alert-card ${alert.type}`}>
                              <div className="alert-card-header">
                                <div className="alert-card-icon">
                                  <alert.icon className="icon" />
                                </div>
                                <div className="alert-card-info">
                                  <h4 className="alert-card-title">{alert.title}</h4>
                                  <div className="alert-card-meta">
                                    <span className="alert-time">{alert.time}</span>
                                    <span className="alert-separator">•</span>
                                    <span className="alert-location">{alert.location}</span>
                                  </div>
                                </div>
                                <div className="alert-card-actions">
                                  <button className="alert-action-btn">
                                    <ChevronRight className="action-icon" />
                                  </button>
                                </div>
                              </div>
                              <p className="alert-card-message">{alert.message}</p>
                              <div className="alert-card-footer">
                                <div className="alert-affected">Affected: {alert.affected}</div>
                                <div className="alert-actions-list">
                                  <button className="alert-btn primary">Resolve</button>
                                  <button className="alert-btn secondary">Details</button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {activeView === "analytics" && (
                      <motion.div
                        key="analytics"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="view-content"
                      >
                        <div className="analytics-header">
                          <h2 className="view-title">Performance Analytics</h2>
                          <div className="time-selector">
                            <button className="time-btn active">Today</button>
                            <button className="time-btn">Week</button>
                            <button className="time-btn">Month</button>
                          </div>
                        </div>

                        <div className="card">
                          <div className="card-header">
                            <h3 className="card-title">Hourly Throughput</h3>
                            <div className="throughput-summary">
                              <span className="throughput-value">8.2k</span>
                              <span className="throughput-label">passengers/hour</span>
                            </div>
                          </div>
                          <div className="chart-container">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={throughputData}>
                                <defs>
                                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                  </linearGradient>
                                </defs>
                                <Bar 
                                  dataKey="value" 
                                  fill="url(#barGradient)"
                                  radius={[8, 8, 0, 0]}
                                />
                                <XAxis 
                                  dataKey="hour" 
                                  axisLine={false} 
                                  tickLine={false}
                                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                                />
                                <YAxis hide />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="analytics-grid">
                          <div className="analytics-card">
                            <div className="analytics-icon success">
                              <TrendingUp className="icon" />
                            </div>
                            <div className="analytics-value">+23%</div>
                            <div className="analytics-label">Efficiency Gain</div>
                            <div className="analytics-change positive">vs last month</div>
                          </div>
                          
                          <div className="analytics-card">
                            <div className="analytics-icon primary">
                              <Users className="icon" />
                            </div>
                            <div className="analytics-value">1.2M</div>
                            <div className="analytics-label">Passengers/Day</div>
                            <div className="analytics-change positive">+5.3% growth</div>
                          </div>

                          <div className="analytics-card">
                            <div className="analytics-icon warning">
                              <Shield className="icon" />
                            </div>
                            <div className="analytics-value">99.7%</div>
                            <div className="analytics-label">Safety Score</div>
                            <div className="analytics-change neutral">industry leading</div>
                          </div>

                          <div className="analytics-card">
                            <div className="analytics-icon info">
                              <Globe className="icon" />
                            </div>
                            <div className="analytics-value">847</div>
                            <div className="analytics-label">Daily Routes</div>
                            <div className="analytics-change positive">+12 optimized</div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop View */}
      {viewMode === "desktop" && (
        <div className="desktop-layout-fullscreen">
          <div className="desktop-container-fullscreen">
            <div className="desktop-header">
              <div className="header-left">
                <h1 className="desktop-title">AI Rail Traffic Control Dashboard</h1>
                <p className="desktop-subtitle">Real-Time Insights for Smarter Train Management</p>
              </div>
              <div className="header-right">
                <div className="header-stats">
                  <div className="header-stat">
                    <div className="stat-value">98.7%</div>
                    <div className="stat-label">System Health</div>
                  </div>
                  <div className="header-stat">
                    <div className="stat-value">1,247</div>
                    <div className="stat-label">Active Trains</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="desktop-grid">
              {/* Train Delays Card */}
              <div className="desktop-card">
                <div className="desktop-card-header">
                  <h3>Train Delays</h3>
                  <div className="card-badge warning">Monitoring</div>
                </div>
                <div className="metric-display">
                  <div className="metric-value">12 min</div>
                  <div className="metric-label">avg delay</div>
                  <div className="metric-trend positive">↓ 15% today</div>
                </div>
                <div className="desktop-chart">
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={delayTrendData}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                      />
                      <XAxis 
                        dataKey="time" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Section Throughput Card */}
              <div className="desktop-card">
                <div className="desktop-card-header">
                  <h3>Section Throughput</h3>
                  <div className="card-badge success">Optimal</div>
                </div>
                <div className="metric-display">
                  <div className="metric-value">85%</div>
                  <div className="metric-label">capacity utilization</div>
                  <div className="metric-trend positive">↑ 8% today</div>
                </div>
                <div className="desktop-chart">
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={throughputData}>
                      <Bar 
                        dataKey="value" 
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                      <XAxis 
                        dataKey="hour" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Congestion Alerts Card */}
              <div className="desktop-card">
                <div className="desktop-card-header">
                  <h3>Congestion Alerts</h3>
                  <div className="card-badge critical">3 Active</div>
                </div>
                <div className="metric-display">
                  <div className="metric-value">3</div>
                  <div className="metric-label">sections congested</div>
                  <div className="metric-trend negative">↑ 2 from morning</div>
                </div>
                <div className="desktop-chart">
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={congestionData}>
                      <defs>
                        <linearGradient id="normalGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="congestedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area 
                        type="monotone" 
                        dataKey="normal" 
                        stackId="1"
                        stroke="#22c55e" 
                        fill="url(#normalGradient)"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="congested" 
                        stackId="1"
                        stroke="#ef4444" 
                        fill="url(#congestedGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Live Train Tracker Card */}
              <div className="desktop-card tracker">
                <div className="desktop-card-header">
                  <h3>Live Train Tracker</h3>
                  <div className="card-badge live">Live</div>
                </div>
                <div className="desktop-track-container">
                  <div className="desktop-track">
                    <div className="track-segment"></div>
                    <motion.div 
                      className="desktop-train success"
                      animate={{ x: [0, 20, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <Train className="train-icon" />
                    </motion.div>
                    <motion.div 
                      className="desktop-train warning"
                      style={{ left: '60%' }}
                      animate={{ x: [0, -10, 0] }}
                      transition={{ duration: 4, repeat: Infinity }}
                    >
                      <Train className="train-icon" />
                    </motion.div>
                  </div>
                </div>
                <div className="train-summary">
                  <div className="summary-item">
                    <span className="summary-label">Active Trains:</span>
                    <span className="summary-value">247</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">On Schedule:</span>
                    <span className="summary-value">89%</span>
                  </div>
                </div>
              </div>

              {/* Predictive Insights Card */}
              <div className="desktop-card insights">
                <div className="desktop-card-header">
                  <h3>Predictive Insights</h3>
                  <div className="card-badge info">AI Powered</div>
                </div>
                <div className="insights-list">
                  <div className="insight-item">
                    <div className="insight-icon">
                      <Clock className="icon" />
                    </div>
                    <div className="insight-content">
                      <div className="insight-title">Upcoming Delays</div>
                      <div className="insight-description">Train 205 - Predicted 20min delay</div>
                    </div>
                  </div>
                  <div className="insight-item">
                    <div className="insight-icon">
                      <Route className="icon" />
                    </div>
                    <div className="insight-content">
                      <div className="insight-title">Route Optimization</div>
                      <div className="insight-description">3 routes can be optimized</div>
                    </div>
                  </div>
                  <div className="insight-item">
                    <div className="insight-icon">
                      <Users className="icon" />
                    </div>
                    <div className="insight-content">
                      <div className="insight-title">Passenger Flow</div>
                      <div className="insight-description">High volume expected at 6PM</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Suggested Actions Card */}
              <div className="desktop-card actions">
                <div className="desktop-card-header">
                  <h3>Suggested Actions</h3>
                  <div className="card-badge warning">3 Pending</div>
                </div>
                <div className="actions-list">
                  <div className="action-item high">
                    <div className="action-priority"></div>
                    <div className="action-content">
                      <div className="action-title">Reroute Train 204</div>
                      <div className="action-description">Reduce congestion in central district</div>
                      <div className="action-impact">Impact: -15min delay</div>
                    </div>
                    <button className="action-btn primary">Apply</button>
                  </div>
                  <div className="action-item medium">
                    <div className="action-priority"></div>
                    <div className="action-content">
                      <div className="action-title">Adjust Signal Timing</div>
                      <div className="action-description">Junction 5 optimization</div>
                      <div className="action-impact">Impact: +12% throughput</div>
                    </div>
                    <button className="action-btn secondary">Review</button>
                  </div>
                  <div className="action-item low">
                    <div className="action-priority"></div>
                    <div className="action-content">
                      <div className="action-title">Schedule Maintenance</div>
                      <div className="action-description">Track 3 preventive care</div>
                      <div className="action-impact">Scheduled: 2AM-4AM</div>
                    </div>
                    <button className="action-btn tertiary">Schedule</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}