import React from 'react';
import { motion } from 'framer-motion';

const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  subtitle, 
  color = 'blue',
  onClick 
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      text: 'text-blue-900'
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      text: 'text-green-900'
    },
    orange: {
      bg: 'bg-orange-50',
      icon: 'text-orange-600',
      text: 'text-orange-900'
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
      text: 'text-purple-900'
    },
    red: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
      text: 'text-red-900'
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`card ${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-all duration-200`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div className={`flex-shrink-0 ${colors.bg} rounded-lg p-3`}>
          <Icon className={`h-6 w-6 ${colors.icon}`} />
        </div>
        
        <div className="ml-4 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
            
            {trend && (
              <div className="text-right">
                <div className={`inline-flex items-center text-sm font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  <svg
                    className={`w-4 h-4 mr-1 ${
                      trend.isPositive ? 'transform rotate-0' : 'transform rotate-180'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {Math.abs(trend.value).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MetricCard;