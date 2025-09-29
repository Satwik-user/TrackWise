import React, { useState, useEffect } from 'react';
import DelayPredictionCard from '../components/Dashboard/DelayPredictionCard';
import DisruptionAlertPanel from '../components/Dashboard/DisruptionAlertPanel';
import EnhancedKPIPanel from '../components/Dashboard/EnhancedKPIPanel';
// import ControllerRecommendationsPanel from '../components/Dashboard/ControllerRecommendationsPanel';
import AuditLogPanel from '../components/Dashboard/AuditLogPanel';
import { apiService } from '../services/apiService';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sampleTrain, setSampleTrain] = useState(null);
  const [sampleSection, setSampleSection] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch sample data for the delay prediction card
      const [trains, sections] = await Promise.all([
        apiService.trains.getAll(),
        apiService.sections.getAll()
      ]);

      // Get the first active train and its current section for demo
      const activeTrain = trains.data?.find(t => t.status === 'active') || trains.data?.[0];
      const currentSection = sections.data?.find(s => s.id === activeTrain?.current_section_id) || sections.data?.[0];

      if (activeTrain) {
        setSampleTrain({
          id: activeTrain.id,
          type: activeTrain.type || 'passenger',
          priority: activeTrain.priority || 'normal',
          speed: activeTrain.current_speed || 80,
          position: activeTrain.position || 0
        });
      }

      if (currentSection) {
        setSampleSection({
          id: currentSection.id,
          name: currentSection.name,
          length: currentSection.length || 1000,
          speed_limit: currentSection.speed_limit || 100
        });
      }

      // Try to fetch dashboard analytics data
      try {
        const data = await apiService.analytics.getDashboard();
        setDashboardData(data);
      } catch (error) {
        console.warn('Analytics endpoint not available, using basic data');
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow h-64"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Railway Control Dashboard</h1>
        <p className="text-gray-600 mt-2">AI-powered railway operations management and monitoring</p>
      </div>

      {/* Top Row - Quick Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {/* ML Delay Prediction */}
        {sampleTrain && sampleSection && (
          <DelayPredictionCard 
            train={sampleTrain} 
            section={sampleSection}
            className="lg:col-span-1"
          />
        )}
        
        {/* System-wide Risk Assessment */}
        <DisruptionAlertPanel className="lg:col-span-1" />
        
  {/* Controller Recommendations removed as requested */}
      </div>

      {/* Middle Row - Comprehensive KPIs */}
      <div className="mb-8">
        <EnhancedKPIPanel />
      </div>

      {/* Bottom Row - Audit Log and System Status */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Audit Log - Takes up 2/3 of the space */}
        <AuditLogPanel className="xl:col-span-2" />
        
        {/* System Status Summary */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-green-800">Core Systems</span>
              </div>
              <span className="text-sm text-green-600">Operational</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-blue-800">ML Predictions</span>
              </div>
              <span className="text-sm text-blue-600">Active</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-yellow-800">Optimization Engine</span>
              </div>
              <span className="text-sm text-yellow-600">Running</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-purple-800">Real-time Monitoring</span>
              </div>
              <span className="text-sm text-purple-600">Connected</span>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">🚂</p>
              <p className="text-sm text-gray-600 mt-2">TrackWise Railway System</p>
              <p className="text-xs text-gray-500">Real-time AI-powered control</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;