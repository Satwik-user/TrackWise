import axios from 'axios';
import toast from 'react-hot-toast';

// Configure axios defaults
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp
    config.metadata = { startTime: new Date() };
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = new Date() - response.config.metadata.startTime;
    console.log(`API Request to ${response.config.url} took ${duration}ms`);
    
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          toast.error('Unauthorized - Please login again');
          // Redirect to login or clear auth
          localStorage.removeItem('auth_token');
          break;
        case 403:
          toast.error('Access forbidden');
          break;
        case 404:
          toast.error('Resource not found');
          break;
        case 422:
          toast.error(data.detail || 'Validation error');
          break;
        case 500:
          toast.error('Server error - Please try again later');
          break;
        default:
          toast.error(data.detail || 'An error occurred');
      }
    } else if (error.request) {
      toast.error('Network error - Please check your connection');
    } else {
      toast.error('Request failed');
    }
    
    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Health check
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  },

  // Train Management
  trains: {
    async getAll(params = {}) {
      const response = await api.get('/api/v1/trains', { params });
      return response.data;
    },

    async getById(trainId) {
      const response = await api.get(`/api/v1/trains/${trainId}`);
      return response.data;
    },

    async create(trainData) {
      const response = await api.post('/api/v1/trains', trainData);
      return response.data;
    },

    async update(trainId, updates) {
      const response = await api.put(`/api/v1/trains/${trainId}`, updates);
      return response.data;
    },

    async delete(trainId) {
      const response = await api.delete(`/api/v1/trains/${trainId}`);
      return response.data;
    },

    async getPosition(trainId) {
      const response = await api.get(`/api/v1/trains/${trainId}/position`);
      return response.data;
    },

    async updatePosition(trainId, position, speed, sectionId) {
      const response = await api.post(`/api/v1/trains/${trainId}/position`, null, {
        params: { position, speed, section_id: sectionId }
      });
      return response.data;
    },

    async getSchedule(trainId) {
      const response = await api.get(`/api/v1/trains/${trainId}/schedule`);
      return response.data;
    },

    async createSchedule(trainId, scheduleData) {
      const response = await api.post(`/api/v1/trains/${trainId}/schedule`, scheduleData);
      return response.data;
    },

    async getLivePositions(sectionIds) {
      const params = sectionIds ? { section_ids: sectionIds } : {};
      const response = await api.get('/api/v1/trains/live/positions', { params });
      return response.data;
    },

    async getDelaySummary(hours = 24) {
      const response = await api.get('/api/v1/trains/delays/summary', {
        params: { hours }
      });
      return response.data;
    },
  },

  // Section Management
  sections: {
    async getAll(params = {}) {
      const response = await api.get('/api/v1/sections', { params });
      return response.data;
    },

    async getById(sectionId) {
      const response = await api.get(`/api/v1/sections/${sectionId}`);
      return response.data;
    },

    async create(sectionData) {
      const response = await api.post('/api/v1/sections', sectionData);
      return response.data;
    },

    async update(sectionId, updates) {
      const response = await api.put(`/api/v1/sections/${sectionId}`, updates);
      return response.data;
    },

    async delete(sectionId) {
      const response = await api.delete(`/api/v1/sections/${sectionId}`);
      return response.data;
    },
  },

  // Optimization
  optimization: {
    async runOptimization(requestData) {
      const response = await api.post('/api/v1/optimization/optimize', requestData);
      return response.data;
    },

    async getRuns(params = {}) {
      const response = await api.get('/api/v1/optimization/runs', { params });
      return response.data;
    },

    async getRun(runId) {
      const response = await api.get(`/api/v1/optimization/runs/${runId}`);
      return response.data;
    },

    async getDecisions(params = {}) {
      const response = await api.get('/api/v1/optimization/decisions', { params });
      return response.data;
    },

    async getDecision(decisionId) {
      const response = await api.get(`/api/v1/optimization/decisions/${decisionId}`);
      return response.data;
    },

    async updateDecision(decisionId, updates, controllerId) {
      const response = await api.put(
        `/api/v1/optimization/decisions/${decisionId}`,
        updates,
        { params: { controller_id: controllerId } }
      );
      return response.data;
    },

    async predict(requestData) {
      const response = await api.post('/api/v1/optimization/predict', requestData);
      return response.data;
    },

    async getCurrentMetrics(sectionIds) {
      const params = sectionIds ? { section_ids: sectionIds } : {};
      const response = await api.get('/api/v1/optimization/metrics/current', { params });
      return response.data;
    },

    async simulate(scenarioData) {
      const response = await api.post('/api/v1/optimization/simulate', scenarioData);
      return response.data;
    },

    async getRecommendations(sectionId, timeHorizon = 1800) {
      const response = await api.get(`/api/v1/optimization/recommendations/${sectionId}`, {
        params: { time_horizon: timeHorizon }
      });
      return response.data;
    },
  },

  // Analytics
  analytics: {
    async getPerformanceOverview(hours = 24, sectionIds) {
      const params = { hours };
      if (sectionIds) params.section_ids = sectionIds;
      const response = await api.get('/api/v1/analytics/performance/overview', { params });
      return response.data;
    },

    async getDelayAnalysis(hours = 24, trainType, priority) {
      const params = { hours };
      if (trainType) params.train_type = trainType;
      if (priority) params.priority = priority;
      const response = await api.get('/api/v1/analytics/delays/analysis', { params });
      return response.data;
    },

    async getThroughputTrends(hours = 24, sectionIds, interval = 'hour') {
      const params = { hours, interval };
      if (sectionIds) params.section_ids = sectionIds;
      const response = await api.get('/api/v1/analytics/throughput/trends', { params });
      return response.data;
    },

    async getOptimizationEffectiveness(hours = 24) {
      const response = await api.get('/api/v1/analytics/optimization/effectiveness', {
        params: { hours }
      });
      return response.data;
    },

    async getSectionUtilization(hours = 24, includeInactive = false) {
      const response = await api.get('/api/v1/analytics/sections/utilization', {
        params: { hours, include_inactive: includeInactive }
      });
      return response.data;
    },

    async exportPerformanceReport(hours = 24, format = 'json') {
      const response = await api.get('/api/v1/analytics/export/performance-report', {
        params: { hours, format }
      });
      return response.data;
    },
  },

  // Simulation
  simulation: {
    async runScenario(scenarioData) {
      const response = await api.post('/api/v1/simulation/scenario', scenarioData);
      return response.data;
    },

    async getScenarios() {
      const response = await api.get('/api/v1/simulation/scenarios');
      return response.data;
    },

    async getScenario(scenarioId) {
      const response = await api.get(`/api/v1/simulation/scenarios/${scenarioId}`);
      return response.data;
    },
  },
};

// Initialize services
export const initializeServices = async () => {
  try {
    console.log('Initializing API services...');
    
    // Test connection
    const health = await apiService.healthCheck();
    console.log('API Health:', health);
    
    return true;
  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw new Error('Could not connect to backend services');
  }
};

export default api;