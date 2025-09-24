'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { useSettings } from '@/lib/settings-context';
import { 
  ArrowLeft,
  CreditCard,
  Settings,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Shield,
  Globe
} from 'lucide-react';

interface PaymentGatewaySettings {
  // Stripe Settings
  stripe: {
    enabled: boolean;
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
    currency: string;
    testMode: boolean;
  };
  
  // PayPal Settings
  paypal: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    sandboxMode: boolean;
    currency: string;
  };
  
  // Square Settings
  square: {
    enabled: boolean;
    applicationId: string;
    accessToken: string;
    environment: 'sandbox' | 'production';
    currency: string;
  };
  
  // General Payment Settings
  paymentSettings: {
    defaultCurrency: string;
    allowPartialPayments: boolean;
    requirePaymentConfirmation: boolean;
    autoMarkPaid: boolean;
    paymentTerms: string;
    lateFeePercentage: number;
    lateFeeGracePeriod: number;
  };
  
  // Invoice Settings
  invoiceSettings: {
    autoGenerateInvoices: boolean;
    invoiceNumberPrefix: string;
    nextInvoiceNumber: number;
    dueDateDays: number;
    showPaymentMethods: boolean;
    allowOnlinePayment: boolean;
  };
}

export default function PaymentGatewaysSettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { settings: globalSettings, updateSettings, loading: settingsLoading } = useSettings();
  
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PaymentGatewaySettings>({
    // Stripe Settings
    stripe: {
      enabled: false,
      publishableKey: '',
      secretKey: '',
      webhookSecret: '',
      currency: 'USD',
      testMode: true
    },
    
    // PayPal Settings
    paypal: {
      enabled: false,
      clientId: '',
      clientSecret: '',
      sandboxMode: true,
      currency: 'USD'
    },
    
    // Square Settings
    square: {
      enabled: false,
      applicationId: '',
      accessToken: '',
      environment: 'sandbox',
      currency: 'USD'
    },
    
    // General Payment Settings
    paymentSettings: {
      defaultCurrency: 'USD',
      allowPartialPayments: true,
      requirePaymentConfirmation: false,
      autoMarkPaid: true,
      paymentTerms: 'Due upon receipt',
      lateFeePercentage: 1.5,
      lateFeeGracePeriod: 5
    },
    
    // Invoice Settings
    invoiceSettings: {
      autoGenerateInvoices: true,
      invoiceNumberPrefix: 'INV',
      nextInvoiceNumber: 1001,
      dueDateDays: 30,
      showPaymentMethods: true,
      allowOnlinePayment: true
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
    if (globalSettings.paymentGateways) {
      setSettings(globalSettings.paymentGateways);
    }
  }, [globalSettings, settingsLoading]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...globalSettings,
        paymentGateways: settings
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
                    <CreditCard className="h-6 w-6 mr-3 text-[#347dc4]" />
                    Payment Gateways Settings
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure Stripe, PayPal, and other payment processing options
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-8">
            
            {/* Stripe Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-[#347dc4]" />
                  Stripe
                </h2>
                <button
                  onClick={() => handleToggle('stripe.enabled')}
                  className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                >
                  {settings.stripe.enabled ? (
                    <ToggleRight className="h-6 w-6" />
                  ) : (
                    <ToggleLeft className="h-6 w-6" />
                  )}
                </button>
              </div>
              
              {settings.stripe.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Publishable Key</label>
                      <input
                        type="text"
                        value={settings.stripe.publishableKey}
                        onChange={(e) => handleSelect('stripe.publishableKey', e.target.value)}
                        placeholder="pk_test_..."
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900">Secret Key</label>
                      <input
                        type="password"
                        value={settings.stripe.secretKey}
                        onChange={(e) => handleSelect('stripe.secretKey', e.target.value)}
                        placeholder="sk_test_..."
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900">Webhook Secret</label>
                      <input
                        type="password"
                        value={settings.stripe.webhookSecret}
                        onChange={(e) => handleSelect('stripe.webhookSecret', e.target.value)}
                        placeholder="whsec_..."
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Currency</label>
                      <select
                        value={settings.stripe.currency}
                        onChange={(e) => handleSelect('stripe.currency', e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Test Mode</label>
                        <p className="text-xs text-gray-500">Use Stripe test environment</p>
                      </div>
                      <button
                        onClick={() => handleToggle('stripe.testMode')}
                        className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                      >
                        {settings.stripe.testMode ? (
                          <ToggleRight className="h-6 w-6" />
                        ) : (
                          <ToggleLeft className="h-6 w-6" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PayPal Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-[#347dc4]" />
                  PayPal
                </h2>
                <button
                  onClick={() => handleToggle('paypal.enabled')}
                  className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                >
                  {settings.paypal.enabled ? (
                    <ToggleRight className="h-6 w-6" />
                  ) : (
                    <ToggleLeft className="h-6 w-6" />
                  )}
                </button>
              </div>
              
              {settings.paypal.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Client ID</label>
                      <input
                        type="text"
                        value={settings.paypal.clientId}
                        onChange={(e) => handleSelect('paypal.clientId', e.target.value)}
                        placeholder="PayPal Client ID"
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900">Client Secret</label>
                      <input
                        type="password"
                        value={settings.paypal.clientSecret}
                        onChange={(e) => handleSelect('paypal.clientSecret', e.target.value)}
                        placeholder="PayPal Client Secret"
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Currency</label>
                      <select
                        value={settings.paypal.currency}
                        onChange={(e) => handleSelect('paypal.currency', e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Sandbox Mode</label>
                        <p className="text-xs text-gray-500">Use PayPal sandbox environment</p>
                      </div>
                      <button
                        onClick={() => handleToggle('paypal.sandboxMode')}
                        className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                      >
                        {settings.paypal.sandboxMode ? (
                          <ToggleRight className="h-6 w-6" />
                        ) : (
                          <ToggleLeft className="h-6 w-6" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Square Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-[#347dc4]" />
                  Square
                </h2>
                <button
                  onClick={() => handleToggle('square.enabled')}
                  className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                >
                  {settings.square.enabled ? (
                    <ToggleRight className="h-6 w-6" />
                  ) : (
                    <ToggleLeft className="h-6 w-6" />
                  )}
                </button>
              </div>
              
              {settings.square.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Application ID</label>
                      <input
                        type="text"
                        value={settings.square.applicationId}
                        onChange={(e) => handleSelect('square.applicationId', e.target.value)}
                        placeholder="Square Application ID"
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900">Access Token</label>
                      <input
                        type="password"
                        value={settings.square.accessToken}
                        onChange={(e) => handleSelect('square.accessToken', e.target.value)}
                        placeholder="Square Access Token"
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Environment</label>
                      <select
                        value={settings.square.environment}
                        onChange={(e) => handleSelect('square.environment', e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      >
                        <option value="sandbox">Sandbox</option>
                        <option value="production">Production</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900">Currency</label>
                      <select
                        value={settings.square.currency}
                        onChange={(e) => handleSelect('square.currency', e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* General Payment Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-[#347dc4]" />
                General Payment Settings
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Default Currency</label>
                    <select
                      value={settings.paymentSettings.defaultCurrency}
                      onChange={(e) => handleSelect('paymentSettings.defaultCurrency', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Allow Partial Payments</label>
                      <p className="text-xs text-gray-500">Allow customers to make partial payments</p>
                    </div>
                    <button
                      onClick={() => handleToggle('paymentSettings.allowPartialPayments')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.paymentSettings.allowPartialPayments ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Auto Mark Paid</label>
                      <p className="text-xs text-gray-500">Automatically mark invoices as paid when payment is received</p>
                    </div>
                    <button
                      onClick={() => handleToggle('paymentSettings.autoMarkPaid')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.paymentSettings.autoMarkPaid ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Payment Terms</label>
                    <input
                      type="text"
                      value={settings.paymentSettings.paymentTerms}
                      onChange={(e) => handleSelect('paymentSettings.paymentTerms', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Late Fee Percentage</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={settings.paymentSettings.lateFeePercentage}
                      onChange={(e) => handleSelect('paymentSettings.lateFeePercentage', parseFloat(e.target.value) || 1.5)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Late Fee Grace Period (Days)</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={settings.paymentSettings.lateFeeGracePeriod}
                      onChange={(e) => handleSelect('paymentSettings.lateFeeGracePeriod', parseInt(e.target.value) || 5)}
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
