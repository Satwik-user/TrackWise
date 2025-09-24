// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api/v1';
export const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';

// Application Constants
export const APP_NAME = 'TrackWise Railway Optimization';
export const APP_VERSION = process.env.REACT_APP_VERSION || '1.0.0';
export const APP_DESCRIPTION = 'Advanced Railway Traffic Optimization System';

// Railway System Constants
export const TRAIN_TYPES = {
  EXPRESS: 'Express',
  FREIGHT: 'Freight',
  SUBURBAN: 'Suburban',
  SPECIAL: 'Special'
};

export const TRAIN_STATUS = {
  SCHEDULED: 'Scheduled',
  RUNNING: 'Running',
  DELAYED: 'Delayed',
  STOPPED: 'Stopped',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

export const SECTION_TYPES = {
  MAIN_LINE: 'Main Line',
  BRANCH_LINE: 'Branch Line',
  SIDING: 'Siding',
  YARD: 'Yard',
  DEPOT: 'Depot',
  JUNCTION: 'Junction',
  STATION: 'Station',
  TERMINAL: 'Terminal'
};

export const SECTION_STATUS = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  MAINTENANCE: 'Maintenance',
  BLOCKED: 'Blocked',
  RESERVED: 'Reserved'
};

// Optimization Constants
export const OPTIMIZATION_TYPES = {
  REAL_TIME: 'Real-time Optimization',
  SCHEDULE: 'Schedule Optimization',
  ROUTE: 'Route Optimization',
  CAPACITY: 'Capacity Optimization',
  EMERGENCY: 'Emergency Optimization'
};

export const OPTIMIZATION_STATUS = {
  PENDING: 'Pending',
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled'
};

export const SOLVER_TYPES = {
  CPSAT: 'CP-SAT Solver',
  HEURISTIC: 'Heuristic Solver',
  HYBRID: 'Hybrid Solver'
};

// Priority Levels
export const PRIORITY_LEVELS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
  EMERGENCY: 5
};

export const PRIORITY_LABELS = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Critical',
  5: 'Emergency'
};

export const PRIORITY_COLORS = {
  1: 'text-green-600 bg-green-100',
  2: 'text-blue-600 bg-blue-100',
  3: 'text-yellow-600 bg-yellow-100',
  4: 'text-orange-600 bg-orange-100',
  5: 'text-red-600 bg-red-100'
};

// Notification Types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

export const NOTIFICATION_CATEGORIES = {
  GENERAL: 'general',
  TRAIN: 'train',
  SYSTEM: 'system',
  OPTIMIZATION: 'optimization',
  MAINTENANCE: 'maintenance',
  DELAY: 'delay',
  SECURITY: 'security'
};

// Time Constants
export const TIME_FORMATS = {
  SHORT: 'HH:mm',
  MEDIUM: 'HH:mm:ss',
  LONG: 'YYYY-MM-DD HH:mm:ss',
  DATE_ONLY: 'YYYY-MM-DD',
  DISPLAY: 'MMM DD, YYYY HH:mm'
};

export const DATE_RANGES = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: '7d',
  LAST_30_DAYS: '30d',
  LAST_3_MONTHS: '3m',
  LAST_6_MONTHS: '6m',
  LAST_YEAR: '1y',
  CUSTOM: 'custom'
};

export const REFRESH_INTERVALS = {
  REAL_TIME: 1000,      // 1 second
  FREQUENT: 5000,       // 5 seconds
  NORMAL: 30000,        // 30 seconds
  SLOW: 60000,          // 1 minute
  VERY_SLOW: 300000     // 5 minutes
};

// Data Validation Constants
export const VALIDATION_RULES = {
  TRAIN_NUMBER: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 20,
    PATTERN: /^[A-Z0-9-]+$/i
  },
  SECTION_CODE: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 10,
    PATTERN: /^[A-Z0-9-]+$/i
  },
  TRAIN_NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100
  },
  SECTION_NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  }
};

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['csv', 'xlsx', 'xls', 'json'],
  SUPPORTED_FORMATS: {
    CSV: 'text/csv',
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    XLS: 'application/vnd.ms-excel',
    JSON: 'application/json'
  }
};

// Chart Colors
export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  DANGER: '#ef4444',
  INFO: '#06b6d4',
  PURPLE: '#8b5cf6',
  PINK: '#ec4899',
  GRAY: '#6b7280'
};

export const CHART_COLOR_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#06b6d4', '#ec4899', '#6b7280',
  '#84cc16', '#f97316', '#14b8a6', '#8b5cf6'
];

// Status Colors for UI
export const STATUS_COLORS = {
  TRAIN: {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    RUNNING: 'bg-green-100 text-green-800',
    DELAYED: 'bg-yellow-100 text-yellow-800',
    STOPPED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800'
  },
  SECTION: {
    AVAILABLE: 'bg-green-100 text-green-800',
    OCCUPIED: 'bg-red-100 text-red-800',
    MAINTENANCE: 'bg-yellow-100 text-yellow-800',
    BLOCKED: 'bg-red-100 text-red-800',
    RESERVED: 'bg-blue-100 text-blue-800'
  },
  OPTIMIZATION: {
    PENDING: 'bg-yellow-100 text-yellow-800',
    RUNNING: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800'
  }
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100],
  MAX_VISIBLE_PAGES: 7
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'userData',
  USER_PREFERENCES: 'userPreferences',
  NOTIFICATIONS: 'notifications',
  PERSISTENT_NOTIFICATIONS: 'persistentNotifications',
  NOTIFICATION_SETTINGS: 'notificationSettings',
  TABLE_SETTINGS: 'tableSettings',
  DASHBOARD_LAYOUT: 'dashboardLayout',
  THEME: 'theme',
  LANGUAGE: 'language'
};

// WebSocket Message Types
export const WS_MESSAGE_TYPES = {
  HEARTBEAT: 'heartbeat',
  TRAIN_UPDATE: 'train_update',
  SECTION_UPDATE: 'section_update',
  OPTIMIZATION_RESULT: 'optimization_result',
  SYSTEM_ALERT: 'system_alert',
  NOTIFICATION: 'notification',
  DELAY_ALERT: 'delay_alert',
  MAINTENANCE_ALERT: 'maintenance_alert',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe'
};

// Error Codes
export const ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Default Settings
export const DEFAULT_SETTINGS = {
  THEME: 'light',
  LANGUAGE: 'en',
  TIMEZONE: 'UTC',
  DATE_FORMAT: 'YYYY-MM-DD',
  TIME_FORMAT: '24h',
  CURRENCY: 'USD',
  NOTIFICATIONS_ENABLED: true,
  SOUND_ENABLED: true,
  BROWSER_NOTIFICATIONS: false,
  AUTO_REFRESH: true,
  REFRESH_INTERVAL: 30000,
  ITEMS_PER_PAGE: 10
};

// Railway Metrics
export const METRICS = {
  DELAY_THRESHOLDS: {
    ON_TIME: 5,      // <= 5 minutes delay
    MINOR: 15,       // 5-15 minutes delay
    MAJOR: 30,       // 15-30 minutes delay
    SEVERE: 60       // > 30 minutes delay
  },
  UTILIZATION_THRESHOLDS: {
    LOW: 40,         // < 40% utilization
    OPTIMAL: 70,     // 40-70% utilization
    HIGH: 90,        // 70-90% utilization
    CRITICAL: 100    // > 90% utilization
  },
  PERFORMANCE_THRESHOLDS: {
    EXCELLENT: 95,   // > 95% performance
    GOOD: 85,        // 85-95% performance
    AVERAGE: 75,     // 75-85% performance
    POOR: 65         // < 75% performance
  }
};

// User Roles and Permissions
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  OPERATOR: 'operator',
  ANALYST: 'analyst',
  VIEWER: 'viewer'
};

export const PERMISSIONS = {
  MANAGE_TRAINS: 'manage_trains',
  MANAGE_SECTIONS: 'manage_sections',
  RUN_OPTIMIZATION: 'run_optimization',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_USERS: 'manage_users',
  SYSTEM_SETTINGS: 'system_settings',
  EXPORT_DATA: 'export_data',
  IMPORT_DATA: 'import_data',
  MANAGE_SCHEDULES: 'manage_schedules',
  EMERGENCY_OVERRIDE: 'emergency_override'
};

// Export Formats
export const EXPORT_FORMATS = {
  CSV: 'csv',
  XLSX: 'xlsx',
  JSON: 'json',
  PDF: 'pdf'
};

// Map and Visualization
export const MAP_SETTINGS = {
  DEFAULT_ZOOM: 10,
  MIN_ZOOM: 5,
  MAX_ZOOM: 18,
  DEFAULT_CENTER: [40.7128, -74.0060], // New York coordinates as example
  MARKER_COLORS: {
    STATION: '#3b82f6',
    JUNCTION: '#f59e0b',
    DEPOT: '#10b981',
    MAINTENANCE: '#ef4444'
  }
};

// Performance Monitoring
export const PERFORMANCE = {
  API_TIMEOUT: 30000,           // 30 seconds
  WEBSOCKET_TIMEOUT: 5000,      // 5 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,            // 1 second
  DEBOUNCE_DELAY: 300,          // 300ms
  THROTTLE_DELAY: 1000          // 1 second
};

// Feature Flags
export const FEATURES = {
  REAL_TIME_UPDATES: true,
  ML_PREDICTIONS: true,
  ADVANCED_ANALYTICS: true,
  EXPORT_FUNCTIONALITY: true,
  DARK_MODE: true,
  MOBILE_SUPPORT: true,
  OFFLINE_MODE: false,
  BETA_FEATURES: false
};

// Regex Patterns
export const REGEX_PATTERNS = {
  TRAIN_NUMBER: /^[A-Z0-9-]{2,20}$/i,
  SECTION_CODE: /^[A-Z0-9-]{2,10}$/i,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]{10,}$/,
  TIME_24H: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
  URL: /^https?:\/\/.+/
};

// Environment
export const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production'
};

export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY: '/auth/verify',
    PROFILE: '/auth/profile'
  },
  TRAINS: {
    BASE: '/trains',
    IMPORT: '/trains/import',
    EXPORT: '/trains/export',
    TEMPLATE: '/trains/template'
  },
  SECTIONS: {
    BASE: '/sections',
    IMPORT: '/sections/import',
    EXPORT: '/sections/export',
    TEMPLATE: '/sections/template'
  },
  OPTIMIZATION: {
    BASE: '/optimization',
    RUN: '/optimization/run',
    HISTORY: '/optimization/history',
    DECISIONS: '/optimization/decisions'
  },
  ANALYTICS: {
    BASE: '/analytics',
    DASHBOARD: '/analytics/dashboard',
    DELAYS: '/analytics/delays',
    THROUGHPUT: '/analytics/throughput',
    UTILIZATION: '/analytics/utilization'
  }
};

export default {
  API_BASE_URL,
  WS_BASE_URL,
  APP_NAME,
  APP_VERSION,
  TRAIN_TYPES,
  TRAIN_STATUS,
  SECTION_TYPES,
  OPTIMIZATION_TYPES,
  NOTIFICATION_TYPES,
  TIME_FORMATS,
  VALIDATION_RULES,
  CHART_COLORS,
  STATUS_COLORS,
  STORAGE_KEYS,
  ERROR_CODES,
  DEFAULT_SETTINGS,
  USER_ROLES,
  PERMISSIONS,
  FEATURES,
  IS_DEVELOPMENT,
  IS_PRODUCTION
};