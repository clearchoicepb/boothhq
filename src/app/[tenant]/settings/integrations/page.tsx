'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { useSettings } from '@/lib/settings-context';
import { 
  ArrowLeft,
  Globe,
  Settings,
  ToggleLeft,
  ToggleRight,
  Key,
  Zap,
  Shield
} from 'lucide-react';

interface IntegrationSettings {
  // API Settings
  apiSettings: {
    enableApi: boolean;
    apiVersion: string;
    rateLimitPerHour: number;
    requireApiKey: boolean;
    allowWebhooks: boolean;
    webhookSecret: string;
  };
  
  // Third-party Integrations
  thirdPartyIntegrations: {
    googleCalendar: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
    };
    slack: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
    };
    zapier: {
      enabled: boolean;
      apiKey: string;
    };
    hubspot: {
      enabled: boolean;
      apiKey: string;
    };
  };
  
  // Webhook Settings
  webhookSettings: {
    leadCreated: boolean;
    contactCreated: boolean;
    eventScheduled: boolean;
    paymentReceived: boolean;
    invoiceOverdue: boolean;
    webhookUrl: string;
    retryAttempts: number;
    timeoutSeconds: number;
  };
  
  // SSO Settings
  ssoSettings: {
    enableSso: boolean;
    provider: 'google' | 'microsoft' | 'okta' | 'custom';
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    autoProvisionUsers: boolean;
  };
}

export default function IntegrationsSettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { settings: globalSettings, updateSettings, loading: settingsLoading } = useSettings();
  
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<IntegrationSettings>({
    // API Settings
    apiSettings: {
      enableApi: true,
      apiVersion: 'v1',
      rateLimitPerHour: 1000,
      requireApiKey: true,
      allowWebhooks: true,
      webhookSecret: ''
    },
    
    // Third-party Integrations
    thirdPartyIntegrations: {
      googleCalendar: {
        enabled: false,
        clientId: '',
        clientSecret: ''
      },
      slack: {
        enabled: false,
        webhookUrl: '',
        channel: ''
      },
      zapier: {
        enabled: false,
        apiKey: ''
      },
      hubspot: {
        enabled: false,
        apiKey: ''
      }
    },
    
    // Webhook Settings
    webhookSettings: {
      leadCreated: true,
      contactCreated: true,
      eventScheduled: true,
      paymentReceived: true,
      invoiceOverdue: true,
      webhookUrl: '',
      retryAttempts: 3,
      timeoutSeconds: 30
    },
    
    // SSO Settings
    ssoSettings: {
      enableSso: false,
      provider: 'google',
      clientId: '',
      clientSecret: '',
      redirectUri: '',
      autoProvisionUsers: false
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
    if (globalSettings.integrations) {
      setSettings(globalSettings.integrations);
    }
  }, [globalSettings, settingsLoading]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...globalSettings,
        integrations: settings
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
                    <Globe className="h-6 w-6 mr-3 text-[#347dc4]" />
                    Integrations Settings
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Connect with external services and configure API settings
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-8">
            
            {/* API Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Key className="h-5 w-5 mr-2 text-[#347dc4]" />
                API Settings
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Enable API</label>
                      <p className="text-xs text-gray-500">Allow external access via API</p>
                    </div>
                    <button
                      onClick={() => handleToggle('apiSettings.enableApi')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.apiSettings.enableApi ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">API Version</label>
                    <p className="text-xs text-gray-500">Current API version</p>
                    <select
                      value={settings.apiSettings.apiVersion}
                      onChange={(e) => handleSelect('apiSettings.apiVersion', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    >
                      <option value="v1">v1</option>
                      <option value="v2">v2</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Rate Limit (per hour)</label>
                    <p className="text-xs text-gray-500">Maximum API requests per hour</p>
                    <input
                      type="number"
                      min="100"
                      max="10000"
                      value={settings.apiSettings.rateLimitPerHour}
                      onChange={(e) => handleSelect('apiSettings.rateLimitPerHour', parseInt(e.target.value) || 1000)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Require API Key</label>
                      <p className="text-xs text-gray-500">Require API key for all requests</p>
                    </div>
                    <button
                      onClick={() => handleToggle('apiSettings.requireApiKey')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.apiSettings.requireApiKey ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Allow Webhooks</label>
                      <p className="text-xs text-gray-500">Enable webhook functionality</p>
                    </div>
                    <button
                      onClick={() => handleToggle('apiSettings.allowWebhooks')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.apiSettings.allowWebhooks ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Webhook Secret</label>
                    <p className="text-xs text-gray-500">Secret key for webhook verification</p>
                    <input
                      type="password"
                      value={settings.apiSettings.webhookSecret}
                      onChange={(e) => handleSelect('apiSettings.webhookSecret', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Third-party Integrations */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-[#347dc4]" />
                Third-party Integrations
              </h2>
              
              <div className="space-y-6">
                {/* Google Calendar */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900">Google Calendar</h3>
                    <button
                      onClick={() => handleToggle('thirdPartyIntegrations.googleCalendar.enabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.thirdPartyIntegrations.googleCalendar.enabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  {settings.thirdPartyIntegrations.googleCalendar.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Client ID</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.googleCalendar.clientId}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.googleCalendar.clientId', e.target.value)}
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Client Secret</label>
                        <input
                          type="password"
                          value={settings.thirdPartyIntegrations.googleCalendar.clientSecret}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.googleCalendar.clientSecret', e.target.value)}
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Slack */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900">Slack</h3>
                    <button
                      onClick={() => handleToggle('thirdPartyIntegrations.slack.enabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.thirdPartyIntegrations.slack.enabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  {settings.thirdPartyIntegrations.slack.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Webhook URL</label>
                        <input
                          type="url"
                          value={settings.thirdPartyIntegrations.slack.webhookUrl}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.slack.webhookUrl', e.target.value)}
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Channel</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.slack.channel}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.slack.channel', e.target.value)}
                          placeholder="#general"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Zapier */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900">Zapier</h3>
                    <button
                      onClick={() => handleToggle('thirdPartyIntegrations.zapier.enabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.thirdPartyIntegrations.zapier.enabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  {settings.thirdPartyIntegrations.zapier.enabled && (
                    <div>
                      <label className="text-sm font-medium text-gray-900">API Key</label>
                      <input
                        type="password"
                        value={settings.thirdPartyIntegrations.zapier.apiKey}
                        onChange={(e) => handleSelect('thirdPartyIntegrations.zapier.apiKey', e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      />
                    </div>
                  )}
                </div>

                {/* HubSpot */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900">HubSpot</h3>
                    <button
                      onClick={() => handleToggle('thirdPartyIntegrations.hubspot.enabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.thirdPartyIntegrations.hubspot.enabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  {settings.thirdPartyIntegrations.hubspot.enabled && (
                    <div>
                      <label className="text-sm font-medium text-gray-900">API Key</label>
                      <input
                        type="password"
                        value={settings.thirdPartyIntegrations.hubspot.apiKey}
                        onChange={(e) => handleSelect('thirdPartyIntegrations.hubspot.apiKey', e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Webhook Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-[#347dc4]" />
                Webhook Settings
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Lead Created</label>
                      <p className="text-xs text-gray-500">Send webhook when lead is created</p>
                    </div>
                    <button
                      onClick={() => handleToggle('webhookSettings.leadCreated')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.webhookSettings.leadCreated ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Contact Created</label>
                      <p className="text-xs text-gray-500">Send webhook when contact is created</p>
                    </div>
                    <button
                      onClick={() => handleToggle('webhookSettings.contactCreated')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.webhookSettings.contactCreated ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Event Scheduled</label>
                      <p className="text-xs text-gray-500">Send webhook when event is scheduled</p>
                    </div>
                    <button
                      onClick={() => handleToggle('webhookSettings.eventScheduled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.webhookSettings.eventScheduled ? (
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
                      <label className="text-sm font-medium text-gray-900">Payment Received</label>
                      <p className="text-xs text-gray-500">Send webhook when payment is received</p>
                    </div>
                    <button
                      onClick={() => handleToggle('webhookSettings.paymentReceived')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.webhookSettings.paymentReceived ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Invoice Overdue</label>
                      <p className="text-xs text-gray-500">Send webhook when invoice becomes overdue</p>
                    </div>
                    <button
                      onClick={() => handleToggle('webhookSettings.invoiceOverdue')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.webhookSettings.invoiceOverdue ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Webhook URL</label>
                    <p className="text-xs text-gray-500">Endpoint to receive webhook notifications</p>
                    <input
                      type="url"
                      value={settings.webhookSettings.webhookUrl}
                      onChange={(e) => handleSelect('webhookSettings.webhookUrl', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
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
