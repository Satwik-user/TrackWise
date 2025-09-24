import { VALIDATION_RULES, REGEX_PATTERNS } from './constants';

// Basic Validation Functions
export const required = (value) => {
  if (value === null || value === undefined) return 'This field is required';
  if (typeof value === 'string' && value.trim() === '') return 'This field is required';
  if (Array.isArray(value) && value.length === 0) return 'This field is required';
  return null;
};

export const minLength = (value, min) => {
  if (!value) return null;
  if (value.length < min) return `Must be at least ${min} characters long`;
  return null;
};

export const maxLength = (value, max) => {
  if (!value) return null;
  if (value.length > max) return `Must be no more than ${max} characters long`;
  return null;
};

export const pattern = (value, regex, message = 'Invalid format') => {
  if (!value) return null;
  if (!regex.test(value)) return message;
  return null;
};

export const email = (value) => {
  if (!value) return null;
  return pattern(value, REGEX_PATTERNS.EMAIL, 'Please enter a valid email address');
};

export const url = (value) => {
  if (!value) return null;
  return pattern(value, REGEX_PATTERNS.URL, 'Please enter a valid URL');
};

export const numeric = (value) => {
  if (!value && value !== 0) return null;
  if (isNaN(Number(value))) return 'Must be a valid number';
  return null;
};

export const integer = (value) => {
  if (!value && value !== 0) return null;
  if (!Number.isInteger(Number(value))) return 'Must be a whole number';
  return null;
};

export const positive = (value) => {
  if (!value && value !== 0) return null;
  if (Number(value) <= 0) return 'Must be a positive number';
  return null;
};

export const nonNegative = (value) => {
  if (!value && value !== 0) return null;
  if (Number(value) < 0) return 'Must be zero or positive';
  return null;
};

export const min = (value, minimum) => {
  if (!value && value !== 0) return null;
  if (Number(value) < minimum) return `Must be at least ${minimum}`;
  return null;
};

export const max = (value, maximum) => {
  if (!value && value !== 0) return null;
  if (Number(value) > maximum) return `Must be no more than ${maximum}`;
  return null;
};

export const range = (value, minimum, maximum) => {
  if (!value && value !== 0) return null;
  const num = Number(value);
  if (num < minimum || num > maximum) {
    return `Must be between ${minimum} and ${maximum}`;
  }
  return null;
};

// Date Validation
export const date = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return 'Please enter a valid date';
  return null;
};

export const futureDate = (value) => {
  const dateError = date(value);
  if (dateError) return dateError;
  
  const inputDate = new Date(value);
  const now = new Date();
  
  if (inputDate <= now) return 'Date must be in the future';
  return null;
};

export const pastDate = (value) => {
  const dateError = date(value);
  if (dateError) return dateError;
  
  const inputDate = new Date(value);
  const now = new Date();
  
  if (inputDate >= now) return 'Date must be in the past';
  return null;
};

export const dateRange = (startDate, endDate) => {
  const startError = date(startDate);
  const endError = date(endDate);
  
  if (startError) return { start: startError };
  if (endError) return { end: endError };
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start >= end) return { end: 'End date must be after start date' };
  return null;
};

// Railway-specific Validators
export const trainNumber = (value) => {
  if (!value) return null;
  
  const lengthError = minLength(value, VALIDATION_RULES.TRAIN_NUMBER.MIN_LENGTH) ||
                     maxLength(value, VALIDATION_RULES.TRAIN_NUMBER.MAX_LENGTH);
  if (lengthError) return lengthError;
  
  return pattern(value, VALIDATION_RULES.TRAIN_NUMBER.PATTERN, 'Train number must contain only letters, numbers, and hyphens');
};

export const sectionCode = (value) => {
  if (!value) return null;
  
  const lengthError = minLength(value, VALIDATION_RULES.SECTION_CODE.MIN_LENGTH) ||
                     maxLength(value, VALIDATION_RULES.SECTION_CODE.MAX_LENGTH);
  if (lengthError) return lengthError;
  
  return pattern(value, VALIDATION_RULES.SECTION_CODE.PATTERN, 'Section code must contain only letters, numbers, and hyphens');
};

export const trainName = (value) => {
  if (!value) return null;
  
  return minLength(value, VALIDATION_RULES.TRAIN_NAME.MIN_LENGTH) ||
         maxLength(value, VALIDATION_RULES.TRAIN_NAME.MAX_LENGTH);
};

export const sectionName = (value) => {
  if (!value) return null;
  
  return minLength(value, VALIDATION_RULES.SECTION_NAME.MIN_LENGTH) ||
         maxLength(value, VALIDATION_RULES.SECTION_NAME.MAX_LENGTH);
};

export const speed = (value) => {
  const numError = numeric(value);
  if (numError) return numError;
  
  return range(value, 0, 500); // 0-500 km/h
};

export const capacity = (value) => {
  const intError = integer(value);
  if (intError) return intError;
  
  return range(value, 1, 50); // 1-50 trains capacity
};

export const delay = (value) => {
  const numError = numeric(value);
  if (numError) return numError;
  
  return range(value, 0, 1440); // 0-1440 minutes (24 hours)
};

export const priority = (value) => {
  const intError = integer(value);
  if (intError) return intError;
  
  return range(value, 1, 5); // Priority levels 1-5
};

export const coordinates = (lat, lng) => {
  const latError = range(lat, -90, 90);
  const lngError = range(lng, -180, 180);
  
  if (latError) return { latitude: 'Latitude must be between -90 and 90' };
  if (lngError) return { longitude: 'Longitude must be between -180 and 180' };
  
  return null;
};

// Password Validation
export const password = (value) => {
  if (!value) return null;
  
  const lengthError = minLength(value, VALIDATION_RULES.PASSWORD.MIN_LENGTH);
  if (lengthError) return lengthError;
  
  if (!VALIDATION_RULES.PASSWORD.PATTERN.test(value)) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
  }
  
  return null;
};

export const confirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
};

// File Validation
export const fileSize = (file, maxSize = 10 * 1024 * 1024) => { // 10MB default
  if (!file) return null;
  if (file.size > maxSize) {
    const mb = Math.round(maxSize / (1024 * 1024));
    return `File size must be less than ${mb}MB`;
  }
  return null;
};

export const fileType = (file, allowedTypes = ['csv', 'xlsx', 'json']) => {
  if (!file) return null;
  
  const extension = file.name.split('.').pop().toLowerCase();
  if (!allowedTypes.includes(extension)) {
    return `File type must be one of: ${allowedTypes.join(', ')}`;
  }
  return null;
};

// Array Validation
export const arrayMinLength = (array, min) => {
  if (!Array.isArray(array)) return null;
  if (array.length < min) return `Must select at least ${min} item${min !== 1 ? 's' : ''}`;
  return null;
};

export const arrayMaxLength = (array, max) => {
  if (!Array.isArray(array)) return null;
  if (array.length > max) return `Must select no more than ${max} item${max !== 1 ? 's' : ''}`;
  return null;
};

export const uniqueArray = (array) => {
  if (!Array.isArray(array)) return null;
  if (array.length !== new Set(array).size) return 'Duplicate items are not allowed';
  return null;
};

// Complex Validation Functions
export const validateForm = (data, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const fieldRules = Array.isArray(rules[field]) ? rules[field] : [rules[field]];
    const value = data[field];
    
    for (const rule of fieldRules) {
      let error = null;
      
      if (typeof rule === 'function') {
        error = rule(value);
      } else if (typeof rule === 'object') {
        const { validator, params = [] } = rule;
        error = validator(value, ...params);
      }
      
      if (error) {
        errors[field] = error;
        break; // Stop at first error for this field
      }
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateTrainData = (train) => {
  const rules = {
    trainNumber: [required, trainNumber],
    trainName: [required, trainName],
    trainType: [required],
    maxSpeed: [required, numeric, positive],
    capacity: [required, integer, positive]
  };
  
  if (train.scheduledDeparture) {
    rules.scheduledDeparture = [date, futureDate];
  }
  
  if (train.scheduledArrival) {
    rules.scheduledArrival = [date, futureDate];
    
    // Check if arrival is after departure
    if (train.scheduledDeparture && train.scheduledArrival) {
      const depDate = new Date(train.scheduledDeparture);
      const arrDate = new Date(train.scheduledArrival);
      
      if (arrDate <= depDate) {
        return {
          isValid: false,
          errors: {
            scheduledArrival: 'Arrival time must be after departure time'
          }
        };
      }
    }
  }
  
  return validateForm(train, rules);
};

export const validateSectionData = (section) => {
  const rules = {
    sectionCode: [required, sectionCode],
    sectionName: [required, sectionName],
    sectionType: [required],
    length: [required, numeric, positive],
    maxSpeed: [required, numeric, positive],
    maxOccupancy: [required, integer, positive]
  };
  
  if (section.coordinates) {
    const coordError = coordinates(section.coordinates.latitude, section.coordinates.longitude);
    if (coordError) {
      return {
        isValid: false,
        errors: coordError
      };
    }
  }
  
  return validateForm(section, rules);
};

export const validateOptimizationParams = (params) => {
  const rules = {
    optimizationType: [required],
    timeHorizon: [required, integer, positive],
    maxSolvingTime: [required, integer, positive]
  };
  
  if (params.trainIds && params.trainIds.length === 0) {
    return {
      isValid: false,
      errors: {
        trainIds: 'At least one train must be selected'
      }
    };
  }
  
  if (params.sectionIds && params.sectionIds.length === 0) {
    return {
      isValid: false,
      errors: {
        sectionIds: 'At least one section must be selected'
      }
    };
  }
  
  return validateForm(params, rules);
};

export const validateUserData = (user) => {
  const rules = {
    username: [required, (value) => minLength(value, 3) || maxLength(value, 50)],
    email: [required, email],
    fullName: [required, (value) => minLength(value, 2) || maxLength(value, 100)],
    role: [required]
  };
  
  if (user.password) {
    rules.password = [required, password];
    
    if (user.confirmPassword) {
      const confirmError = confirmPassword(user.password, user.confirmPassword);
      if (confirmError) {
        return {
          isValid: false,
          errors: {
            confirmPassword: confirmError
          }
        };
      }
    }
  }
  
  return validateForm(user, rules);
};

// Async Validation (for unique checks, etc.)
export const asyncValidateUnique = async (value, checkFunction, errorMessage = 'This value already exists') => {
  if (!value) return null;
  
  try {
    const exists = await checkFunction(value);
    return exists ? errorMessage : null;
  } catch (error) {
    return 'Unable to verify uniqueness';
  }
};

// Custom Validation Helpers
export const createValidator = (validatorFn, message) => {
  return (value) => {
    if (!value && value !== 0) return null;
    return validatorFn(value) ? null : message;
  };
};

export const combineValidators = (...validators) => {
  return (value) => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) return error;
    }
    return null;
  };
};

export const conditionalValidator = (condition, validator) => {
  return (value, formData) => {
    if (!condition(formData)) return null;
    return validator(value);
  };
};

// Export all validators
export default {
  // Basic
  required,
  minLength,
  maxLength,
  pattern,
  email,
  url,
  numeric,
  integer,
  positive,
  nonNegative,
  min,
  max,
  range,
  
  // Date
  date,
  futureDate,
  pastDate,
  dateRange,
  
  // Railway
  trainNumber,
  sectionCode,
  trainName,
  sectionName,
  speed,
  capacity,
  delay,
  priority,
  coordinates,
  
  // Security
  password,
  confirmPassword,
  
  // Files
  fileSize,
  fileType,
  
  // Arrays
  arrayMinLength,
  arrayMaxLength,
  uniqueArray,
  
  // Complex
  validateForm,
  validateTrainData,
  validateSectionData,
  validateOptimizationParams,
  validateUserData,
  
  // Async
  asyncValidateUnique,
  
  // Helpers
  createValidator,
  combineValidators,
  conditionalValidator
};