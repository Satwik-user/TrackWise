import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CogIcon,
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  ServerIcon,
  ChartBarIcon,
  KeyIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  ClockIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { preferences, updatePreferences } = useAppStore();

  const tabs = [
    {
      id: 'general',
      label: 'General',
      icon: CogIcon,
      description: 'Basic application settings'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: BellIcon,
      description: 'Alert and notification preferences'
    },
    {
      id: 'display',
      label: 'Display',
      icon: PaintBrushIcon,
      description: 'Theme and appearance settings'
    },
    {
      id: 'optimization',
      label: 'Optimization',
      icon: ChartBarIcon,
      description: 'Optimization engine configuration'
    },
    {
      id: 'security',
      label: 'Security',
      icon: ShieldCheckIcon,
      description: 'Security and access control'
    },
    {
      id: 'system',
      label: 'System',
      icon: ServerIcon,
      description: 'System and performance settings'
    }
  ];

  const [settings, setSettings] = useState({
    // General Settings
    refreshInterval: preferences.refreshInterval || 30000,
    autoRefresh: preferences.autoRefresh !== undefined ? preferences.autoRefresh : true,
    language: preferences.language || 'en',
    timezone: preferences.timezone || 'UTC',
    dateFormat: preferences.dateFormat || 'YYYY-MM-DD',
    timeFormat: preferences.timeFormat || '24h',

    // Notification Settings
    showNotifications: preferences.showNotifications !== undefined ? preferences.showNotifications : true,
    soundEnabled: preferences.soundEnabled !== undefined ? preferences.soundEnabled : true,
    emailNotifications: preferences.emailNotifications !== undefined ? preferences.emailNotifications : false,
    criticalAlerts: preferences.criticalAlerts !== undefined ? preferences.criticalAlerts : true,
    optimizationAlerts: preferences.optimizationAlerts !== undefined ? preferences.optimizationAlerts : true,
    systemAlerts: preferences.systemAlerts !== undefined ? preferences.systemAlerts : true,

    // Display Settings
    theme: preferences.theme || 'light',
    compactMode: preferences.compactMode !== undefined ? preferences.compactMode : false,
    showAnimations: preferences.showAnimations !== undefined ? preferences.showAnimations : true,
    chartStyle: preferences.chartStyle || 'modern',
    density: preferences.density || 'comfortable',

    // Optimization Settings
    defaultOptimizationType: preferences.defaultOptimizationType || 'REAL_TIME',
    maxOptimizationTime: preferences.maxOptimizationTime || 30,
    autoOptimize: preferences.autoOptimize !== undefined ? preferences.autoOptimize : false,
    optimizationFrequency: preferences.optimizationFrequency || 3600,
    useMlPredictions: preferences.useMlPredictions !== undefined ? preferences.useMlPredictions : true,

    // Security Settings
    sessionTimeout: preferences.sessionTimeout || 8,
    twoFactorAuth: preferences.twoFactorAuth !== undefined ? preferences.twoFactorAuth : false,
    passwordExpiry: preferences.passwordExpiry || 90,
    auditLogging: preferences.auditLogging !== undefined ? preferences.auditLogging : true,

    // System Settings
    maxConcurrentOptimizations: preferences.maxConcurrentOptimizations || 3,
    dataRetentionPeriod: preferences.dataRetentionPeriod || 365,
    backupFrequency: preferences.backupFrequency || 24,
    performanceMode: preferences.performanceMode || 'balanced'
  });

  useEffect(() => {
    // Check if settings have changed
    const hasChanges = Object.keys(settings).some(key => {
      return settings[key] !== preferences[key];
    });
    setIsDirty(hasChanges);
  }, [settings, preferences]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updatePreferences(settings);
      setIsDirty(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Settings save error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      // Reset to default values
      const defaultSettings = {
        refreshInterval: 30000,
        autoRefresh: true,
        language: 'en',
        timezone: 'UTC',
        showNotifications: true,
        theme: 'light',
        // ... other defaults
      };
      setSettings(defaultSettings);
      toast.success('Settings reset to defaults');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <CogIcon className="h-7 w-7 mr-2 text-blue-600" />
              Settings
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure application preferences and system settings
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {isDirty && (
              <div className="flex items-center space-x-2 text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-lg">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span>Unsaved changes</span>
              </div>
            )}
            
            <button
              onClick={handleReset}
              className="btn-secondary"
            >
              Reset to Defaults
            </button>
            
            <button
              onClick={handleSave}
              disabled={!isDirty || isLoading}
              className="btn-primary flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap ${
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
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'general' && (
              <GeneralSettings
                key="general"
                settings={settings}
                onSettingChange={handleSettingChange}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationSettings
                key="notifications"
                settings={settings}
                onSettingChange={handleSettingChange}
              />
            )}

            {activeTab === 'display' && (
              <DisplaySettings
                key="display"
                settings={settings}
                onSettingChange={handleSettingChange}
              />
            )}

            {activeTab === 'optimization' && (
              <OptimizationSettings
                key="optimization"
                settings={settings}
                onSettingChange={handleSettingChange}
              />
            )}

            {activeTab === 'security' && (
              <SecuritySettings
                key="security"
                settings={settings}
                onSettingChange={handleSettingChange}
              />
            )}

            {activeTab === 'system' && (
              <SystemSettings
                key="system"
                settings={settings}
                onSettingChange={handleSettingChange}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// General Settings Component
const GeneralSettings = ({ settings, onSettingChange }) => {
  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'zh', label: '中文' },
    { value: 'ja', label: '日本語' }
  ];

  const timezones = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time' },
    { value: 'Europe/Paris', label: 'Central European Time' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
    { value: 'Asia/Shanghai', label: 'China Standard Time' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <SettingsSection
        title="Data Refresh"
        description="Control how frequently data is updated"
        icon={ClockIcon}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auto Refresh
            </label>
            <ToggleSwitch
              enabled={settings.autoRefresh}
              onChange={(value) => onSettingChange('autoRefresh', value)}
              description="Automatically refresh data in the background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Refresh Interval
            </label>
            <select
              value={settings.refreshInterval}
              onChange={(e) => onSettingChange('refreshInterval', parseInt(e.target.value))}
              className="input-field"
              disabled={!settings.autoRefresh}
            >
              <option value={5000}>5 seconds</option>
              <option value={15000}>15 seconds</option>
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
              <option value={300000}>5 minutes</option>
            </select>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Localization"
        description="Language and regional settings"
        icon={GlobeAltIcon}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              value={settings.language}
              onChange={(e) => onSettingChange('language', e.target.value)}
              className="input-field"
            >
              {languages.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => onSettingChange('timezone', e.target.value)}
              className="input-field"
            >
              {timezones.map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Format
            </label>
            <select
              value={settings.dateFormat}
              onChange={(e) => onSettingChange('dateFormat', e.target.value)}
              className="input-field"
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="DD MMM YYYY">DD MMM YYYY</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Format
            </label>
            <select
              value={settings.timeFormat}
              onChange={(e) => onSettingChange('timeFormat', e.target.value)}
              className="input-field"
            >
              <option value="24h">24-hour (14:30)</option>
              <option value="12h">12-hour (2:30 PM)</option>
            </select>
          </div>
        </div>
      </SettingsSection>
    </motion.div>
  );
};

// Notification Settings Component
const NotificationSettings = ({ settings, onSettingChange }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <SettingsSection
        title="General Notifications"
        description="Control when and how you receive notifications"
        icon={BellIcon}
      >
        <div className="space-y-4">
          <ToggleSwitch
            enabled={settings.showNotifications}
            onChange={(value) => onSettingChange('showNotifications', value)}
            label="Enable Notifications"
            description="Show in-app notifications for important events"
          />

          <ToggleSwitch
            enabled={settings.soundEnabled}
            onChange={(value) => onSettingChange('soundEnabled', value)}
            label="Sound Notifications"
            description="Play sound alerts for critical notifications"
            disabled={!settings.showNotifications}
          />

          <ToggleSwitch
            enabled={settings.emailNotifications}
            onChange={(value) => onSettingChange('emailNotifications', value)}
            label="Email Notifications"
            description="Send email alerts for system events"
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Alert Types"
        description="Choose which types of alerts to receive"
        icon={ExclamationTriangleIcon}
      >
        <div className="space-y-4">
          <ToggleSwitch
            enabled={settings.criticalAlerts}
            onChange={(value) => onSettingChange('criticalAlerts', value)}
            label="Critical System Alerts"
            description="Emergency situations and system failures"
          />

          <ToggleSwitch
            enabled={settings.optimizationAlerts}
            onChange={(value) => onSettingChange('optimizationAlerts', value)}
            label="Optimization Alerts"
            description="Optimization completion and failure notifications"
          />

          <ToggleSwitch
            enabled={settings.systemAlerts}
            onChange={(value) => onSettingChange('systemAlerts', value)}
            label="System Status Alerts"
            description="System maintenance and performance notifications"
          />
        </div>
      </SettingsSection>
    </motion.div>
  );
};

// Display Settings Component
const DisplaySettings = ({ settings, onSettingChange }) => {
  const themes = [
    { value: 'light', label: 'Light', description: 'Clean and bright interface' },
    { value: 'dark', label: 'Dark', description: 'Easy on the eyes in low light' },
    { value: 'auto', label: 'Auto', description: 'Matches system preference' }
  ];

  const densityOptions = [
    { value: 'compact', label: 'Compact', description: 'More content, less spacing' },
    { value: 'comfortable', label: 'Comfortable', description: 'Balanced spacing' },
    { value: 'spacious', label: 'Spacious', description: 'More spacing, easier to read' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <SettingsSection
        title="Appearance"
        description="Customize the look and feel of the application"
        icon={PaintBrushIcon}
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Theme
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {themes.map((theme) => (
                <div
                  key={theme.value}
                  onClick={() => onSettingChange('theme', theme.value)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    settings.theme === theme.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`w-4 h-4 rounded-full ${
                      theme.value === 'light' ? 'bg-white border-2 border-gray-300' :
                      theme.value === 'dark' ? 'bg-gray-800' :
                      'bg-gradient-to-r from-white to-gray-800'
                    }`} />
                    <span className="font-medium text-gray-900">{theme.label}</span>
                  </div>
                  <p className="text-sm text-gray-500">{theme.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Interface Density
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {densityOptions.map((density) => (
                <div
                  key={density.value}
                  onClick={() => onSettingChange('density', density.value)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    settings.density === density.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900 mb-1">{density.label}</div>
                  <p className="text-sm text-gray-500">{density.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <ToggleSwitch
              enabled={settings.compactMode}
              onChange={(value) => onSettingChange('compactMode', value)}
              label="Compact Mode"
              description="Use condensed layouts to show more information"
            />

            <ToggleSwitch
              enabled={settings.showAnimations}
              onChange={(value) => onSettingChange('showAnimations', value)}
              label="Animations"
              description="Enable smooth transitions and animations"
            />
          </div>
        </div>
      </SettingsSection>
    </motion.div>
  );
};

// Optimization Settings Component
const OptimizationSettings = ({ settings, onSettingChange }) => {
  const optimizationTypes = [
    { value: 'REAL_TIME', label: 'Real-time' },
    { value: 'STRATEGIC', label: 'Strategic' },
    { value: 'PREDICTIVE', label: 'Predictive' },
    { value: 'EMERGENCY', label: 'Emergency' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <SettingsSection
        title="Default Optimization"
        description="Configure default optimization behavior"
        icon={ChartBarIcon}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Optimization Type
            </label>
            <select
              value={settings.defaultOptimizationType}
              onChange={(e) => onSettingChange('defaultOptimizationType', e.target.value)}
              className="input-field"
            >
              {optimizationTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Optimization Time (seconds)
            </label>
            <input
              type="number"
              min="5"
              max="300"
              value={settings.maxOptimizationTime}
              onChange={(e) => onSettingChange('maxOptimizationTime', parseInt(e.target.value))}
              className="input-field"
            />
          </div>
        </div>

        <div className="space-y-4 mt-6">
          <ToggleSwitch
            enabled={settings.autoOptimize}
            onChange={(value) => onSettingChange('autoOptimize', value)}
            label="Auto Optimization"
            description="Automatically run optimization at regular intervals"
          />

          {settings.autoOptimize && (
            <div className="ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Optimization Frequency (seconds)
              </label>
              <input
                type="number"
                min="60"
                max="86400"
                value={settings.optimizationFrequency}
                onChange={(e) => onSettingChange('optimizationFrequency', parseInt(e.target.value))}
                className="input-field"
              />
            </div>
          )}

          // ... (continuing from where we left off in OptimizationSettings)

          <ToggleSwitch
            enabled={settings.useMlPredictions}
            onChange={(value) => onSettingChange('useMlPredictions', value)}
            label="Use ML Predictions"
            description="Enable machine learning predictions for better optimization"
          />
        </div>
      </SettingsSection>
    </motion.div>
  );
};

// Security Settings Component
const SecuritySettings = ({ settings, onSettingChange }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <SettingsSection
        title="Authentication & Access"
        description="Manage authentication and access control settings"
        icon={KeyIcon}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Timeout (hours)
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={settings.sessionTimeout}
              onChange={(e) => onSettingChange('sessionTimeout', parseInt(e.target.value))}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password Expiry (days)
            </label>
            <input
              type="number"
              min="30"
              max="365"
              value={settings.passwordExpiry}
              onChange={(e) => onSettingChange('passwordExpiry', parseInt(e.target.value))}
              className="input-field"
            />
          </div>
        </div>

        <div className="space-y-4 mt-6">
          <ToggleSwitch
            enabled={settings.twoFactorAuth}
            onChange={(value) => onSettingChange('twoFactorAuth', value)}
            label="Two-Factor Authentication"
            description="Require additional verification for login"
          />

          <ToggleSwitch
            enabled={settings.auditLogging}
            onChange={(value) => onSettingChange('auditLogging', value)}
            label="Audit Logging"
            description="Log all user actions for security auditing"
          />
        </div>
      </SettingsSection>
    </motion.div>
  );
};

// System Settings Component
const SystemSettings = ({ settings, onSettingChange }) => {
  const performanceModes = [
    { value: 'performance', label: 'Performance', description: 'Prioritize speed and responsiveness' },
    { value: 'balanced', label: 'Balanced', description: 'Balance between performance and resource usage' },
    { value: 'efficiency', label: 'Efficiency', description: 'Optimize for lower resource consumption' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <SettingsSection
        title="Performance & Resources"
        description="Configure system performance and resource usage"
        icon={ServerIcon}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Concurrent Optimizations
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={settings.maxConcurrentOptimizations}
              onChange={(e) => onSettingChange('maxConcurrentOptimizations', parseInt(e.target.value))}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Retention Period (days)
            </label>
            <input
              type="number"
              min="30"
              max="3650"
              value={settings.dataRetentionPeriod}
              onChange={(e) => onSettingChange('dataRetentionPeriod', parseInt(e.target.value))}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backup Frequency (hours)
            </label>
            <input
              type="number"
              min="1"
              max="168"
              value={settings.backupFrequency}
              onChange={(e) => onSettingChange('backupFrequency', parseInt(e.target.value))}
              className="input-field"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Performance Mode
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {performanceModes.map((mode) => (
              <div
                key={mode.value}
                onClick={() => onSettingChange('performanceMode', mode.value)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  settings.performanceMode === mode.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900 mb-1">{mode.label}</div>
                <p className="text-sm text-gray-500">{mode.description}</p>
              </div>
            ))}
          </div>
        </div>
      </SettingsSection>
    </motion.div>
  );
};

// Settings Section Component
const SettingsSection = ({ title, description, icon: Icon, children }) => {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center space-x-3">
          <Icon className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};

// Toggle Switch Component
const ToggleSwitch = ({ enabled, onChange, label, description, disabled = false }) => {
  return (
    <div className={`flex items-center justify-between ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
      
      <button
        type="button"
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};

export default Settings;