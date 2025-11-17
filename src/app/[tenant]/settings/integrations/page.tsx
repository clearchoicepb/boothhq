'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSettings } from '@/lib/settings-context';
import { 
  ArrowLeft,
  Globe,
  Settings,
  ToggleLeft,
  ToggleRight,
  Key,
  Zap,
  Shield,
  CreditCard,
  Truck,
  FileSpreadsheet,
  Calculator,
  Mail,
  MessageSquare,
  Video,
  FileText,
  Cloud,
  Package,
  Box,
  PenTool
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
    stripe: {
      enabled: boolean;
      publishableKey: string;
      secretKey: string;
      webhookSecret: string;
      testMode: boolean;
    };
    fedex: {
      enabled: boolean;
      apiKey: string;
      apiSecret: string;
      accountNumber: string;
      meterNumber: string;
      testMode: boolean;
    };
    googleSheets: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
      refreshToken: string;
      spreadsheetId: string;
    };
    quickbooks: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
      refreshToken: string;
      companyId: string;
      sandboxMode: boolean;
    };
    mailchimp: {
      enabled: boolean;
      apiKey: string;
      serverPrefix: string;
      listId: string;
    };
    twilio: {
      enabled: boolean;
      accountSid: string;
      authToken: string;
      phoneNumber: string;
      testMode: boolean;
    };
    zoom: {
      enabled: boolean;
      apiKey: string;
      apiSecret: string;
      webhookSecret: string;
    };
    docusign: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
      refreshToken: string;
      accountId: string;
      sandboxMode: boolean;
    };
    dropbox: {
      enabled: boolean;
      accessToken: string;
      folderPath: string;
    };
    googleDrive: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
      refreshToken: string;
      folderId: string;
    };
    ups: {
      enabled: boolean;
      accessKey: string;
      username: string;
      password: string;
      accountNumber: string;
      testMode: boolean;
    };
    adobeSign: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
      refreshToken: string;
      baseUrl: string;
      sandboxMode: boolean;
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
      },
      stripe: {
        enabled: false,
        publishableKey: '',
        secretKey: '',
        webhookSecret: '',
        testMode: true
      },
      fedex: {
        enabled: false,
        apiKey: '',
        apiSecret: '',
        accountNumber: '',
        meterNumber: '',
        testMode: true
      },
      googleSheets: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        refreshToken: '',
        spreadsheetId: ''
      },
      quickbooks: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        refreshToken: '',
        companyId: '',
        sandboxMode: true
      },
      mailchimp: {
        enabled: false,
        apiKey: '',
        serverPrefix: '',
        listId: ''
      },
      twilio: {
        enabled: false,
        accountSid: '',
        authToken: '',
        phoneNumber: '',
        testMode: true
      },
      zoom: {
        enabled: false,
        apiKey: '',
        apiSecret: '',
        webhookSecret: ''
      },
      docusign: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        refreshToken: '',
        accountId: '',
        sandboxMode: true
      },
      dropbox: {
        enabled: false,
        accessToken: '',
        folderPath: '/CRM Files'
      },
      googleDrive: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        refreshToken: '',
        folderId: ''
      },
      ups: {
        enabled: false,
        accessKey: '',
        username: '',
        password: '',
        accountNumber: '',
        testMode: true
      },
      adobeSign: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        refreshToken: '',
        baseUrl: 'https://api.na1.adobesign.com',
        sandboxMode: true
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
      
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#347dc4] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      
    );
  }

  return (
    
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
                      aria-label="Select API version"
                      title="Select API version"
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
                      aria-label="Rate Limit Per Hour"
                      title="Enter the maximum API requests per hour"
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
                      aria-label="Webhook Secret"
                      title="Enter the webhook secret key for verification"
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
                {/* Stripe */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900 flex items-center">
                      <CreditCard className="h-5 w-5 mr-2 text-[#347dc4]" />
                      Stripe
                    </h3>
                    <button
                      onClick={() => handleToggle('thirdPartyIntegrations.stripe.enabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.thirdPartyIntegrations.stripe.enabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  {settings.thirdPartyIntegrations.stripe.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Publishable Key</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.stripe.publishableKey}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.stripe.publishableKey', e.target.value)}
                          placeholder="pk_test_..."
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Secret Key</label>
                        <input
                          type="password"
                          value={settings.thirdPartyIntegrations.stripe.secretKey}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.stripe.secretKey', e.target.value)}
                          placeholder="sk_test_..."
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Webhook Secret</label>
                        <input
                          type="password"
                          value={settings.thirdPartyIntegrations.stripe.webhookSecret}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.stripe.webhookSecret', e.target.value)}
                          placeholder="whsec_..."
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-900">Test Mode</label>
                          <p className="text-xs text-gray-500">Use Stripe test environment</p>
                        </div>
                        <button
                          onClick={() => handleToggle('thirdPartyIntegrations.stripe.testMode')}
                          className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                        >
                          {settings.thirdPartyIntegrations.stripe.testMode ? (
                            <ToggleRight className="h-6 w-6" />
                          ) : (
                            <ToggleLeft className="h-6 w-6" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* FedEx */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900 flex items-center">
                      <Truck className="h-5 w-5 mr-2 text-[#347dc4]" />
                      FedEx
                    </h3>
                    <button
                      onClick={() => handleToggle('thirdPartyIntegrations.fedex.enabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.thirdPartyIntegrations.fedex.enabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  {settings.thirdPartyIntegrations.fedex.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900">API Key</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.fedex.apiKey}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.fedex.apiKey', e.target.value)}
                          placeholder="FedEx API Key"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">API Secret</label>
                        <input
                          type="password"
                          value={settings.thirdPartyIntegrations.fedex.apiSecret}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.fedex.apiSecret', e.target.value)}
                          placeholder="FedEx API Secret"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Account Number</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.fedex.accountNumber}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.fedex.accountNumber', e.target.value)}
                          placeholder="Your FedEx Account Number"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Meter Number</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.fedex.meterNumber}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.fedex.meterNumber', e.target.value)}
                          placeholder="Your FedEx Meter Number"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-900">Test Mode</label>
                          <p className="text-xs text-gray-500">Use FedEx test environment</p>
                        </div>
                        <button
                          onClick={() => handleToggle('thirdPartyIntegrations.fedex.testMode')}
                          className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                        >
                          {settings.thirdPartyIntegrations.fedex.testMode ? (
                            <ToggleRight className="h-6 w-6" />
                          ) : (
                            <ToggleLeft className="h-6 w-6" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Google Sheets */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900 flex items-center">
                      <FileSpreadsheet className="h-5 w-5 mr-2 text-[#347dc4]" />
                      Google Sheets
                    </h3>
                    <button
                      onClick={() => handleToggle('thirdPartyIntegrations.googleSheets.enabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.thirdPartyIntegrations.googleSheets.enabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  {settings.thirdPartyIntegrations.googleSheets.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Client ID</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.googleSheets.clientId}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.googleSheets.clientId', e.target.value)}
                          placeholder="Google OAuth Client ID"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Client Secret</label>
                        <input
                          type="password"
                          value={settings.thirdPartyIntegrations.googleSheets.clientSecret}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.googleSheets.clientSecret', e.target.value)}
                          placeholder="Google OAuth Client Secret"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Refresh Token</label>
                        <input
                          type="password"
                          value={settings.thirdPartyIntegrations.googleSheets.refreshToken}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.googleSheets.refreshToken', e.target.value)}
                          placeholder="OAuth Refresh Token"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Spreadsheet ID</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.googleSheets.spreadsheetId}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.googleSheets.spreadsheetId', e.target.value)}
                          placeholder="Google Sheets Spreadsheet ID"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* QuickBooks */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900 flex items-center">
                      <Calculator className="h-5 w-5 mr-2 text-[#347dc4]" />
                      QuickBooks
                    </h3>
                    <button
                      onClick={() => handleToggle('thirdPartyIntegrations.quickbooks.enabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.thirdPartyIntegrations.quickbooks.enabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  {settings.thirdPartyIntegrations.quickbooks.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Client ID</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.quickbooks.clientId}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.quickbooks.clientId', e.target.value)}
                          placeholder="QuickBooks OAuth Client ID"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Client Secret</label>
                        <input
                          type="password"
                          value={settings.thirdPartyIntegrations.quickbooks.clientSecret}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.quickbooks.clientSecret', e.target.value)}
                          placeholder="QuickBooks OAuth Client Secret"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Company ID</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.quickbooks.companyId}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.quickbooks.companyId', e.target.value)}
                          placeholder="QuickBooks Company ID"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-900">Sandbox Mode</label>
                          <p className="text-xs text-gray-500">Use QuickBooks sandbox environment</p>
                        </div>
                        <button
                          onClick={() => handleToggle('thirdPartyIntegrations.quickbooks.sandboxMode')}
                          className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                        >
                          {settings.thirdPartyIntegrations.quickbooks.sandboxMode ? (
                            <ToggleRight className="h-6 w-6" />
                          ) : (
                            <ToggleLeft className="h-6 w-6" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mailchimp */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900 flex items-center">
                      <Mail className="h-5 w-5 mr-2 text-[#347dc4]" />
                      Mailchimp
                    </h3>
                    <button
                      onClick={() => handleToggle('thirdPartyIntegrations.mailchimp.enabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.thirdPartyIntegrations.mailchimp.enabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  {settings.thirdPartyIntegrations.mailchimp.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900">API Key</label>
                        <input
                          type="password"
                          value={settings.thirdPartyIntegrations.mailchimp.apiKey}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.mailchimp.apiKey', e.target.value)}
                          placeholder="Mailchimp API Key"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Server Prefix</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.mailchimp.serverPrefix}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.mailchimp.serverPrefix', e.target.value)}
                          placeholder="us1, us2, etc."
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">List ID</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.mailchimp.listId}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.mailchimp.listId', e.target.value)}
                          placeholder="Mailchimp List ID"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Twilio */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-md font-medium text-gray-900 flex items-center">
                        <MessageSquare className="h-5 w-5 mr-2 text-[#347dc4]" />
                        Twilio (SMS)
                      </h3>
                      {settings.thirdPartyIntegrations.twilio.enabled &&
                       settings.thirdPartyIntegrations.twilio.accountSid &&
                       settings.thirdPartyIntegrations.twilio.authToken &&
                       settings.thirdPartyIntegrations.twilio.phoneNumber && (
                        <>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            ✓ Configured
                          </span>
                          <Link
                            href={`/${tenantSubdomain}/settings/integrations/test-sms`}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                          >
                            Test SMS
                          </Link>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggle('thirdPartyIntegrations.twilio.enabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.thirdPartyIntegrations.twilio.enabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  {settings.thirdPartyIntegrations.twilio.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Account SID</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.twilio.accountSid}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.twilio.accountSid', e.target.value)}
                          placeholder="Twilio Account SID"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Auth Token</label>
                        <input
                          type="password"
                          value={settings.thirdPartyIntegrations.twilio.authToken}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.twilio.authToken', e.target.value)}
                          placeholder="Twilio Auth Token"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Phone Number</label>
                        <input
                          type="tel"
                          value={settings.thirdPartyIntegrations.twilio.phoneNumber}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.twilio.phoneNumber', e.target.value)}
                          placeholder="+1234567890"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-900">Test Mode</label>
                          <p className="text-xs text-gray-500">Use Twilio test environment</p>
                        </div>
                        <button
                          onClick={() => handleToggle('thirdPartyIntegrations.twilio.testMode')}
                          className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                        >
                          {settings.thirdPartyIntegrations.twilio.testMode ? (
                            <ToggleRight className="h-6 w-6" />
                          ) : (
                            <ToggleLeft className="h-6 w-6" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Zoom */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900 flex items-center">
                      <Video className="h-5 w-5 mr-2 text-[#347dc4]" />
                      Zoom
                    </h3>
                    <button
                      onClick={() => handleToggle('thirdPartyIntegrations.zoom.enabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.thirdPartyIntegrations.zoom.enabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  {settings.thirdPartyIntegrations.zoom.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900">API Key</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.zoom.apiKey}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.zoom.apiKey', e.target.value)}
                          placeholder="Zoom API Key"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">API Secret</label>
                        <input
                          type="password"
                          value={settings.thirdPartyIntegrations.zoom.apiSecret}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.zoom.apiSecret', e.target.value)}
                          placeholder="Zoom API Secret"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Webhook Secret</label>
                        <input
                          type="password"
                          value={settings.thirdPartyIntegrations.zoom.webhookSecret}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.zoom.webhookSecret', e.target.value)}
                          placeholder="Zoom Webhook Secret"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* DocuSign */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-[#347dc4]" />
                      DocuSign
                    </h3>
                    <button
                      onClick={() => handleToggle('thirdPartyIntegrations.docusign.enabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.thirdPartyIntegrations.docusign.enabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  {settings.thirdPartyIntegrations.docusign.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Client ID</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.docusign.clientId}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.docusign.clientId', e.target.value)}
                          placeholder="DocuSign Integration Key"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Account ID</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.docusign.accountId}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.docusign.accountId', e.target.value)}
                          placeholder="DocuSign Account ID"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-900">Sandbox Mode</label>
                          <p className="text-xs text-gray-500">Use DocuSign demo environment</p>
                        </div>
                        <button
                          onClick={() => handleToggle('thirdPartyIntegrations.docusign.sandboxMode')}
                          className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                        >
                          {settings.thirdPartyIntegrations.docusign.sandboxMode ? (
                            <ToggleRight className="h-6 w-6" />
                          ) : (
                            <ToggleLeft className="h-6 w-6" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dropbox */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900 flex items-center">
                      <Cloud className="h-5 w-5 mr-2 text-[#347dc4]" />
                      Dropbox
                    </h3>
                    <button
                      onClick={() => handleToggle('thirdPartyIntegrations.dropbox.enabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.thirdPartyIntegrations.dropbox.enabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  {settings.thirdPartyIntegrations.dropbox.enabled && (
                    <div>
                      <label className="text-sm font-medium text-gray-900">Access Token</label>
                      <input
                        type="password"
                        value={settings.thirdPartyIntegrations.dropbox.accessToken}
                        onChange={(e) => handleSelect('thirdPartyIntegrations.dropbox.accessToken', e.target.value)}
                        placeholder="Dropbox Access Token"
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      />
                      <div className="mt-4">
                        <label className="text-sm font-medium text-gray-900">Folder Path</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.dropbox.folderPath}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.dropbox.folderPath', e.target.value)}
                          placeholder="/CRM Files"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Google Drive */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900 flex items-center">
                      <Package className="h-5 w-5 mr-2 text-[#347dc4]" />
                      Google Drive
                    </h3>
                    <button
                      onClick={() => handleToggle('thirdPartyIntegrations.googleDrive.enabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.thirdPartyIntegrations.googleDrive.enabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  {settings.thirdPartyIntegrations.googleDrive.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Client ID</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.googleDrive.clientId}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.googleDrive.clientId', e.target.value)}
                          placeholder="Google OAuth Client ID"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Client Secret</label>
                        <input
                          type="password"
                          value={settings.thirdPartyIntegrations.googleDrive.clientSecret}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.googleDrive.clientSecret', e.target.value)}
                          placeholder="Google OAuth Client Secret"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Folder ID</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.googleDrive.folderId}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.googleDrive.folderId', e.target.value)}
                          placeholder="Google Drive Folder ID"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* UPS */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900 flex items-center">
                      <Box className="h-5 w-5 mr-2 text-[#347dc4]" />
                      UPS
                    </h3>
                    <button
                      onClick={() => handleToggle('thirdPartyIntegrations.ups.enabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.thirdPartyIntegrations.ups.enabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  {settings.thirdPartyIntegrations.ups.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Access Key</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.ups.accessKey}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.ups.accessKey', e.target.value)}
                          placeholder="UPS API Access Key"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Username</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.ups.username}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.ups.username', e.target.value)}
                          placeholder="UPS API Username"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Password</label>
                        <input
                          type="password"
                          value={settings.thirdPartyIntegrations.ups.password}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.ups.password', e.target.value)}
                          placeholder="UPS API Password"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Account Number</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.ups.accountNumber}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.ups.accountNumber', e.target.value)}
                          placeholder="Your UPS Account Number"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-900">Test Mode</label>
                          <p className="text-xs text-gray-500">Use UPS test environment</p>
                        </div>
                        <button
                          onClick={() => handleToggle('thirdPartyIntegrations.ups.testMode')}
                          className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                        >
                          {settings.thirdPartyIntegrations.ups.testMode ? (
                            <ToggleRight className="h-6 w-6" />
                          ) : (
                            <ToggleLeft className="h-6 w-6" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Adobe Sign */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900 flex items-center">
                      <PenTool className="h-5 w-5 mr-2 text-[#347dc4]" />
                      Adobe Sign
                    </h3>
                    <button
                      onClick={() => handleToggle('thirdPartyIntegrations.adobeSign.enabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.thirdPartyIntegrations.adobeSign.enabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  {settings.thirdPartyIntegrations.adobeSign.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Client ID</label>
                        <input
                          type="text"
                          value={settings.thirdPartyIntegrations.adobeSign.clientId}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.adobeSign.clientId', e.target.value)}
                          placeholder="Adobe Sign Integration Key"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Client Secret</label>
                        <input
                          type="password"
                          value={settings.thirdPartyIntegrations.adobeSign.clientSecret}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.adobeSign.clientSecret', e.target.value)}
                          placeholder="Adobe Sign Client Secret"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Base URL</label>
                        <select
                          value={settings.thirdPartyIntegrations.adobeSign.baseUrl}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.adobeSign.baseUrl', e.target.value)}
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                          aria-label="Adobe Sign Base URL"
                          title="Select the Adobe Sign API base URL"
                        >
                          <option value="https://api.na1.adobesign.com">North America 1 (na1)</option>
                          <option value="https://api.na2.adobesign.com">North America 2 (na2)</option>
                          <option value="https://api.eu1.adobesign.com">Europe 1 (eu1)</option>
                          <option value="https://api.eu2.adobesign.com">Europe 2 (eu2)</option>
                          <option value="https://api.ap1.adobesign.com">Asia Pacific 1 (ap1)</option>
                          <option value="https://api.ap2.adobesign.com">Asia Pacific 2 (ap2)</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-900">Sandbox Mode</label>
                          <p className="text-xs text-gray-500">Use Adobe Sign demo environment</p>
                        </div>
                        <button
                          onClick={() => handleToggle('thirdPartyIntegrations.adobeSign.sandboxMode')}
                          className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                        >
                          {settings.thirdPartyIntegrations.adobeSign.sandboxMode ? (
                            <ToggleRight className="h-6 w-6" />
                          ) : (
                            <ToggleLeft className="h-6 w-6" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Original integrations - keeping them for backward compatibility */}
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
                          aria-label="Google Calendar Client ID"
                          title="Enter the Google OAuth Client ID"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Client Secret</label>
                        <input
                          type="password"
                          value={settings.thirdPartyIntegrations.googleCalendar.clientSecret}
                          onChange={(e) => handleSelect('thirdPartyIntegrations.googleCalendar.clientSecret', e.target.value)}
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                          aria-label="Google Calendar Client Secret"
                          title="Enter the Google OAuth Client Secret"
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
                          aria-label="Slack Webhook URL"
                          title="Enter the Slack webhook URL"
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
                          aria-label="Slack Channel"
                          title="Enter the Slack channel name"
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
                        aria-label="Zapier API Key"
                        title="Enter the Zapier API key"
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
                        aria-label="HubSpot API Key"
                        title="Enter the HubSpot API key"
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
                      aria-label="Webhook URL"
                      title="Enter the webhook endpoint URL"
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
    
  );
}
