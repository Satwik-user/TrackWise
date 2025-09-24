import { formatDate, formatNumber, formatFileSize } from './formatters';
import { CHART_COLOR_PALETTE, TRAIN_STATUS, SECTION_STATUS } from './constants';

// General Utility Functions
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

export const deepEqual = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
};

export const isEmpty = (value) => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

export const isValidJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

// Array Utilities
export const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const group = typeof key === 'function' ? key(item) : item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
};

export const sortBy = (array, key, direction = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = typeof key === 'function' ? key(a) : a[key];
    const bVal = typeof key === 'function' ? key(b) : b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export const unique = (array, key = null) => {
  if (!key) return [...new Set(array)];
  
  const seen = new Set();
  return array.filter(item => {
    const value = typeof key === 'function' ? key(item) : item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

export const chunk = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const flatten = (array) => {
  return array.reduce((flat, item) => {
    return flat.concat(Array.isArray(item) ? flatten(item) : item);
  }, []);
};

export const partition = (array, predicate) => {
  const passed = [];
  const failed = [];
  array.forEach(item => {
    (predicate(item) ? passed : failed).push(item);
  });
  return [passed, failed];
};

// Object Utilities
export const pick = (obj, keys) => {
  const result = {};
  keys.forEach(key => {
    if (key in obj) result[key] = obj[key];
  });
  return result;
};

export const omit = (obj, keys) => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

export const mapValues = (obj, mapper) => {
  const result = {};
  Object.keys(obj).forEach(key => {
    result[key] = mapper(obj[key], key);
  });
  return result;
};

export const merge = (...objects) => {
  return Object.assign({}, ...objects);
};

export const get = (obj, path, defaultValue = undefined) => {
  const keys = Array.isArray(path) ? path : path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result == null || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result === undefined ? defaultValue : result;
};

export const set = (obj, path, value) => {
  const keys = Array.isArray(path) ? path : path.split('.');
  const lastKey = keys.pop();
  
  let current = obj;
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[lastKey] = value;
  return obj;
};

// String Utilities
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const camelCase = (str) => {
  return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '');
};

export const kebabCase = (str) => {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
};

export const snakeCase = (str) => {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
};

export const truncate = (str, length = 50, suffix = '...') => {
  if (!str || str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
};

export const slugify = (str) => {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const randomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Number Utilities
export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

export const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const randomFloat = (min, max, decimals = 2) => {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
};

export const sum = (numbers) => {
  return numbers.reduce((total, num) => total + num, 0);
};

export const average = (numbers) => {
  return numbers.length > 0 ? sum(numbers) / numbers.length : 0;
};

export const median = (numbers) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

export const percentile = (numbers, p) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  
  if (Math.floor(index) === index) {
    return sorted[index];
  }
  
  const lower = sorted[Math.floor(index)];
  const upper = sorted[Math.ceil(index)];
  return lower + (upper - lower) * (index - Math.floor(index));
};

// Date Utilities
export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addHours = (date, hours) => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

export const addMinutes = (date, minutes) => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

export const startOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const endOfDay = (date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

export const isSameDay = (date1, date2) => {
  return startOfDay(date1).getTime() === startOfDay(date2).getTime();
};

export const daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1 - date2) / oneDay));
};

export const formatDateRange = (startDate, endDate) => {
  if (isSameDay(startDate, endDate)) {
    return formatDate(startDate, 'MMM DD, YYYY');
  }
  
  if (startDate.getFullYear() === endDate.getFullYear()) {
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${formatDate(startDate, 'MMM DD')} - ${formatDate(endDate, 'DD, YYYY')}`;
    }
    return `${formatDate(startDate, 'MMM DD')} - ${formatDate(endDate, 'MMM DD, YYYY')}`;
  }
  
  return `${formatDate(startDate, 'MMM DD, YYYY')} - ${formatDate(endDate, 'MMM DD, YYYY')}`;
};

// Color Utilities
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const rgbToHex = (r, g, b) => {
  return `#${[r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
};

export const getContrastColor = (hexColor) => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#000000';
  
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 155 ? '#000000' : '#ffffff';
};

export const getColorFromPalette = (index) => {
  return CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length];
};

// Railway-specific Utilities
export const calculateETA = (currentTime, speed, distance) => {
  if (speed <= 0) return null;
  
  const timeToTravel = (distance / speed) * 60; // minutes
  return addMinutes(new Date(currentTime), timeToTravel);
};

export const calculateDelay = (scheduledTime, actualTime) => {
  if (!scheduledTime || !actualTime) return 0;
  
  const scheduled = new Date(scheduledTime);
  const actual = new Date(actualTime);
  
  return Math.max(0, Math.round((actual - scheduled) / (1000 * 60))); // minutes
};

export const getTrainStatusColor = (status, delay = 0) => {
  if (status === TRAIN_STATUS.DELAYED || delay > 5) {
    return delay > 30 ? '#dc2626' : '#f59e0b'; // red or yellow
  }
  
  switch (status) {
    case TRAIN_STATUS.RUNNING:
      return '#10b981'; // green
    case TRAIN_STATUS.SCHEDULED:
      return '#3b82f6'; // blue
    case TRAIN_STATUS.STOPPED:
      return '#ef4444'; // red
    case TRAIN_STATUS.COMPLETED:
      return '#6b7280'; // gray
    case TRAIN_STATUS.CANCELLED:
      return '#dc2626'; // red
    default:
      return '#6b7280'; // gray
  }
};

export const getSectionStatusColor = (status, utilization = 0) => {
  switch (status) {
    case SECTION_STATUS.AVAILABLE:
      return utilization > 80 ? '#f59e0b' : '#10b981'; // yellow or green
    case SECTION_STATUS.OCCUPIED:
      return '#ef4444'; // red
    case SECTION_STATUS.MAINTENANCE:
      return '#f59e0b'; // yellow
    case SECTION_STATUS.BLOCKED:
      return '#dc2626'; // red
    case SECTION_STATUS.RESERVED:
      return '#3b82f6'; // blue
    default:
      return '#6b7280'; // gray
  }
};

export const calculateSectionUtilization = (currentOccupancy, maxCapacity) => {
  if (maxCapacity <= 0) return 0;
  return Math.round((currentOccupancy / maxCapacity) * 100);
};

export const generateTrainRoute = (startSection, endSection, sections) => {
  // Simple pathfinding - in a real implementation, you'd use Dijkstra or A*
  // This is a placeholder that assumes sections are connected linearly
  const startIndex = sections.findIndex(s => s.id === startSection);
  const endIndex = sections.findIndex(s => s.id === endSection);
  
  if (startIndex === -1 || endIndex === -1) return [];
  
  const route = [];
  const step = startIndex < endIndex ? 1 : -1;
  
  for (let i = startIndex; i !== endIndex + step; i += step) {
    route.push(sections[i]);
  }
  
  return route;
};

export const estimateOptimizationTime = (trainsCount, sectionsCount, complexity = 'medium') => {
  const baseTime = {
    low: 1,
    medium: 3,
    high: 10
  };
  
  const factor = baseTime[complexity] || baseTime.medium;
  const estimated = factor * Math.sqrt(trainsCount * sectionsCount);
  
  return Math.max(5, Math.round(estimated)); // minimum 5 seconds
};

// Browser/Environment Utilities
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      return true;
    } catch (err) {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
};

export const downloadFile = (data, filename, type = 'text/plain') => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  
  return {
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
    isTablet: /iPad|Android(?!.*Mobile)/i.test(ua),
    isDesktop: !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
    browser: getBrowserName(ua),
    os: getOSName(ua)
  };
};

const getBrowserName = (ua) => {
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Opera')) return 'Opera';
  return 'Unknown';
};

const getOSName = (ua) => {
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS')) return 'iOS';
  return 'Unknown';
};

export const getStorageUsage = () => {
  try {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return {
      used: total,
      usedFormatted: formatFileSize(total),
      available: 5 * 1024 * 1024 - total, // Assuming 5MB limit
      availableFormatted: formatFileSize(5 * 1024 * 1024 - total)
    };
  } catch (error) {
    return {
      used: 0,
      usedFormatted: '0 Bytes',
      available: 0,
      availableFormatted: '0 Bytes'
    };
  }
};

// Performance Utilities
export const measurePerformance = (fn, name = 'function') => {
  return (...args) => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  };
};

export const createMemoized = (fn, keyFn = (...args) => JSON.stringify(args)) => {
  const cache = new Map();
  
  return (...args) => {
    const key = keyFn(...args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// URL Utilities
export const getQueryParam = (name, url = window.location.href) => {
  const urlObj = new URL(url);
  return urlObj.searchParams.get(name);
};

export const setQueryParam = (name, value, url = window.location.href) => {
  const urlObj = new URL(url);
  urlObj.searchParams.set(name, value);
  return urlObj.toString();
};

export const removeQueryParam = (name, url = window.location.href) => {
  const urlObj = new URL(url);
  urlObj.searchParams.delete(name);
  return urlObj.toString();
};

// Export all helpers
export default {
  // General
  debounce,
  throttle,
  deepClone,
  deepEqual,
  isEmpty,
  isValidJSON,
  
  // Arrays
  groupBy,
  sortBy,
  unique,
  chunk,
  flatten,
  partition,
  
  // Objects
  pick,
  omit,
  mapValues,
  merge,
  get,
  set,
  
  // Strings
  capitalize,
  camelCase,
  kebabCase,
  snakeCase,
  truncate,
  slugify,
  randomString,
  
  // Numbers
  clamp,
  randomInt,
  randomFloat,
  sum,
  average,
  median,
  percentile,
  
  // Dates
  addDays,
  addHours,
  addMinutes,
  startOfDay,
  endOfDay,
  isSameDay,
  daysBetween,
  formatDateRange,
  
  // Colors
  hexToRgb,
  rgbToHex,
  getContrastColor,
  getColorFromPalette,
  
  // Railway
  calculateETA,
  calculateDelay,
  getTrainStatusColor,
  getSectionStatusColor,
  calculateSectionUtilization,
  generateTrainRoute,
  estimateOptimizationTime,
  
  // Browser
  copyToClipboard,
  downloadFile,
  getDeviceInfo,
  getStorageUsage,
  
  // Performance
  measurePerformance,
  createMemoized,
  
  // URL
  getQueryParam,
  setQueryParam,
  removeQueryParam
};