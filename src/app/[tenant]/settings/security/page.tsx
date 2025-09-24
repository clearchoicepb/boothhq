'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { useSettings } from '@/lib/settings-context';
import { 
  ArrowLeft,
  Shield,
  Settings,
  ToggleLeft,
  ToggleRight,
  Lock,
  Key,
  Eye
} from 'lucide-react';

interface SecuritySettings {
  // Password Settings
  passwordSettings: {
    requireStrongPasswords: boolean;
    minimumPasswordLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    passwordExpiryDays: number;
    preventPasswordReuse: boolean;
  };
  
  // Session Settings
  sessionSettings: {
    sessionTimeoutMinutes: number;
    rememberMeDays: number;
    maxConcurrentSessions: number;
    requireReauthForSensitiveActions: boolean;
  };
  
  // Two-Factor Authentication
  twoFactorAuth: {
    enabled: boolean;
    requiredForAdmins: boolean;
    requiredForUsers: boolean;
    backupCodesEnabled: boolean;
  };
  
  // Access Control
  accessControl: {
    ipWhitelistEnabled: boolean;
    ipWhitelist: string[];
    loginAttemptLimit: number;
    lockoutDurationMinutes: number;
    requireEmailVerification: boolean;
  };
  
  // Data Security
  dataSecurity: {
    encryptSensitiveData: boolean;
    auditLogEnabled: boolean;
    dataRetentionDays: number;
    allowDataExport: boolean;
    requireApprovalForDataExport: boolean;
  };
  
  // API Security
  apiSecurity: {
    rateLimitEnabled: boolean;
    rateLimitRequestsPerMinute: number;
    requireApiKey: boolean;
    apiKeyExpiryDays: number;
  };
}

export default function SecuritySettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { settings: globalSettings, updateSettings, loading: settingsLoading } = useSettings();
  
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SecuritySettings>({
    // Password Settings
    passwordSettings: {
      requireStrongPasswords: true,
      minimumPasswordLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      passwordExpiryDays: 90,
      preventPasswordReuse: true
    },
    
    // Session Settings
    sessionSettings: {
      sessionTimeoutMinutes: 480, // 8 hours
      rememberMeDays: 30,
      maxConcurrentSessions: 3,
      requireReauthForSensitiveActions: true
    },
    
    // Two-Factor Authentication
    twoFactorAuth: {
      enabled: false,
      requiredForAdmins: false,
      requiredForUsers: false,
      backupCodesEnabled: true
    },
    
    // Access Control
    accessControl: {
      ipWhitelistEnabled: false,
      ipWhitelist: [],
      loginAttemptLimit: 5,
      lockoutDurationMinutes: 15,
      requireEmailVerification: true
    },
    
    // Data Security
    dataSecurity: {
      encryptSensitiveData: true,
      auditLogEnabled: true,
      dataRetentionDays: 2555, // 7 years
      allowDataExport: true,
      requireApprovalForDataExport: false
    },
    
    // API Security
    apiSecurity: {
      rateLimitEnabled: true,
      rateLimitRequestsPerMinute: 100,
      requireApiKey: true,
      apiKeyExpiryDays: 365
    }
  });

  const handleToggle = (path: string) => {
    setSettings(prev => {
      const keys = path.split('.');
      const newSettings = { ...prev };
      let current = newSettings as Record<string, unknown>;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] as Record<string, unknown>;
      }
      
      current[keys[keys.length - 1]] = !(current[keys[keys.length - 1]] as boolean);
      return newSettings;
    });
  };

  const handleSelect = (path: string, value: string | number | boolean) => {
    setSettings(prev => {
      const keys = path.split('.');
      const newSettings = { ...prev };
      let current = newSettings as Record<string, unknown>;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] as Record<string, unknown>;
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  // Load settings from global context
  useEffect(() => {
    if (globalSettings.security) {
      setSettings(globalSettings.security);
    }
  }, [globalSettings, settingsLoading]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...globalSettings,
        security: settings
      });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Show loading state if settings are still loading
  if (settingsLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#347dc4] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link 
                  href={`/${tenantSubdomain}/settings`}
                  className="flex items-center text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Settings
                </Link>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                    <Shield className="h-6 w-6 mr-3 text-[#347dc4]" />
                    Security Settings
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage user permissions, data access, and security settings
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-8">
            
            {/* Password Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Lock className="h-5 w-5 mr-2 text-[#347dc4]" />
                Password Settings
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Require Strong Passwords</label>
                      <p className="text-xs text-gray-500">Enforce strong password requirements</p>
                    </div>
                    <button
                      onClick={() => handleToggle('passwordSettings.requireStrongPasswords')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.passwordSettings.requireStrongPasswords ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Minimum Password Length</label>
                    <p className="text-xs text-gray-500">Minimum number of characters</p>
                    <input
                      type="number"
                      min="6"
                      max="32"
                      value={settings.passwordSettings.minimumPasswordLength}
                      onChange={(e) => handleSelect('passwordSettings.minimumPasswordLength', parseInt(e.target.value) || 8)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Require Uppercase</label>
                      <p className="text-xs text-gray-500">Require at least one uppercase letter</p>
                    </div>
                    <button
                      onClick={() => handleToggle('passwordSettings.requireUppercase')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.passwordSettings.requireUppercase ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Require Numbers</label>
                      <p className="text-xs text-gray-500">Require at least one number</p>
                    </div>
                    <button
                      onClick={() => handleToggle('passwordSettings.requireNumbers')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.passwordSettings.requireNumbers ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Require Special Characters</label>
                      <p className="text-xs text-gray-500">Require at least one special character</p>
                    </div>
                    <button
                      onClick={() => handleToggle('passwordSettings.requireSpecialChars')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.passwordSettings.requireSpecialChars ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Password Expiry (Days)</label>
                    <p className="text-xs text-gray-500">Days before password expires (0 = never)</p>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={settings.passwordSettings.passwordExpiryDays}
                      onChange={(e) => handleSelect('passwordSettings.passwordExpiryDays', parseInt(e.target.value) || 0)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Prevent Password Reuse</label>
                      <p className="text-xs text-gray-500">Prevent using previous passwords</p>
                    </div>
                    <button
                      onClick={() => handleToggle('passwordSettings.preventPasswordReuse')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.passwordSettings.preventPasswordReuse ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Key className="h-5 w-5 mr-2 text-[#347dc4]" />
                Session Settings
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Session Timeout (Minutes)</label>
                    <p className="text-xs text-gray-500">Minutes of inactivity before session expires</p>
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={settings.sessionSettings.sessionTimeoutMinutes}
                      onChange={(e) => handleSelect('sessionSettings.sessionTimeoutMinutes', parseInt(e.target.value) || 480)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Remember Me (Days)</label>
                    <p className="text-xs text-gray-500">Days to remember user login</p>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={settings.sessionSettings.rememberMeDays}
                      onChange={(e) => handleSelect('sessionSettings.rememberMeDays', parseInt(e.target.value) || 30)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Max Concurrent Sessions</label>
                    <p className="text-xs text-gray-500">Maximum number of simultaneous sessions per user</p>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={settings.sessionSettings.maxConcurrentSessions}
                      onChange={(e) => handleSelect('sessionSettings.maxConcurrentSessions', parseInt(e.target.value) || 3)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Require Re-authentication</label>
                      <p className="text-xs text-gray-500">Require password for sensitive actions</p>
                    </div>
                    <button
                      onClick={() => handleToggle('sessionSettings.requireReauthForSensitiveActions')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.sessionSettings.requireReauthForSensitiveActions ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-[#347dc4]" />
                Two-Factor Authentication
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Enable 2FA</label>
                      <p className="text-xs text-gray-500">Allow users to enable two-factor authentication</p>
                    </div>
                    <button
                      onClick={() => handleToggle('twoFactorAuth.enabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.twoFactorAuth.enabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Required for Admins</label>
                      <p className="text-xs text-gray-500">Force administrators to use 2FA</p>
                    </div>
                    <button
                      onClick={() => handleToggle('twoFactorAuth.requiredForAdmins')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.twoFactorAuth.requiredForAdmins ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Required for Users</label>
                      <p className="text-xs text-gray-500">Force all users to use 2FA</p>
                    </div>
                    <button
                      onClick={() => handleToggle('twoFactorAuth.requiredForUsers')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.twoFactorAuth.requiredForUsers ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Backup Codes</label>
                      <p className="text-xs text-gray-500">Allow backup codes for account recovery</p>
                    </div>
                    <button
                      onClick={() => handleToggle('twoFactorAuth.backupCodesEnabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.twoFactorAuth.backupCodesEnabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Access Control */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="h-5 w-5 mr-2 text-[#347dc4]" />
                Access Control
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">IP Whitelist</label>
                      <p className="text-xs text-gray-500">Restrict access to specific IP addresses</p>
                    </div>
                    <button
                      onClick={() => handleToggle('accessControl.ipWhitelistEnabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.accessControl.ipWhitelistEnabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Login Attempt Limit</label>
                    <p className="text-xs text-gray-500">Maximum failed login attempts before lockout</p>
                    <input
                      type="number"
                      min="3"
                      max="10"
                      value={settings.accessControl.loginAttemptLimit}
                      onChange={(e) => handleSelect('accessControl.loginAttemptLimit', parseInt(e.target.value) || 5)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Lockout Duration (Minutes)</label>
                    <p className="text-xs text-gray-500">Minutes to lock account after failed attempts</p>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={settings.accessControl.lockoutDurationMinutes}
                      onChange={(e) => handleSelect('accessControl.lockoutDurationMinutes', parseInt(e.target.value) || 15)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Email Verification</label>
                      <p className="text-xs text-gray-500">Require email verification for new accounts</p>
                    </div>
                    <button
                      onClick={() => handleToggle('accessControl.requireEmailVerification')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.accessControl.requireEmailVerification ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Security */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Security</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Encrypt Sensitive Data</label>
                      <p className="text-xs text-gray-500">Encrypt sensitive data at rest</p>
                    </div>
                    <button
                      onClick={() => handleToggle('dataSecurity.encryptSensitiveData')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.dataSecurity.encryptSensitiveData ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Audit Logging</label>
                      <p className="text-xs text-gray-500">Log all user actions and system events</p>
                    </div>
                    <button
                      onClick={() => handleToggle('dataSecurity.auditLogEnabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.dataSecurity.auditLogEnabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Data Retention (Days)</label>
                    <p className="text-xs text-gray-500">Days to retain audit logs and old data</p>
                    <input
                      type="number"
                      min="30"
                      max="3650"
                      value={settings.dataSecurity.dataRetentionDays}
                      onChange={(e) => handleSelect('dataSecurity.dataRetentionDays', parseInt(e.target.value) || 2555)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Allow Data Export</label>
                      <p className="text-xs text-gray-500">Allow users to export their data</p>
                    </div>
                    <button
                      onClick={() => handleToggle('dataSecurity.allowDataExport')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.dataSecurity.allowDataExport ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button 
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2 bg-[#347dc4] text-white rounded-md hover:bg-[#2c6ba8] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
