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