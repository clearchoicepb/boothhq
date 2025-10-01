'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { useSettings } from '@/lib/settings-context';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Mail,
  Settings,
  ToggleLeft,
  ToggleRight,
  Server,
  Send,
  Users,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface EmailServiceSettings {
  // SMTP Settings
  smtpSettings: {
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    password: string;
    encryption: 'none' | 'ssl' | 'tls';
    fromName: string;
    fromEmail: string;
    replyToEmail: string;
  };
  
  // Gmail Integration
  gmailIntegration: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    fromEmail: string;
  };
  
  // Email Templates
  emailTemplates: {
    invoiceEmail: {
      subject: string;
      body: string;
    };
    eventReminderEmail: {
      subject: string;
      body: string;
    };
    paymentConfirmationEmail: {
      subject: string;
      body: string;
    };
    welcomeEmail: {
      subject: string;
      body: string;
    };
  };
  
  // Email Marketing
  emailMarketing: {
    enabled: boolean;
    provider: 'mailchimp' | 'constant-contact' | 'sendgrid' | 'none';
    apiKey: string;
    listId: string;
    allowUnsubscribe: boolean;
    unsubscribeFooter: string;
  };
  
  // Email Preferences
  emailPreferences: {
    sendFromName: string;
    includeLogo: boolean;
    includeFooter: boolean;
    footerText: string;
    trackOpens: boolean;
    trackClicks: boolean;
    requireConfirmation: boolean;
  };
}

export default function EmailServicesSettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { settings: globalSettings, updateSettings, loading: settingsLoading } = useSettings();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [saving, setSaving] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState('');
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [settings, setSettings] = useState<EmailServiceSettings>({
    // SMTP Settings
    smtpSettings: {
      enabled: false,
      host: '',
      port: 587,
      username: '',
      password: '',
      encryption: 'tls',
      fromName: '',
      fromEmail: '',
      replyToEmail: ''
    },
    
    // Gmail Integration
    gmailIntegration: {
      enabled: false,
      clientId: '',
      clientSecret: '',
      refreshToken: '',
      fromEmail: ''
    },
    
    // Email Templates
    emailTemplates: {
      invoiceEmail: {
        subject: 'Invoice #{invoiceNumber} from {companyName}',
        body: 'Dear {customerName},\n\nPlease find your invoice attached.\n\nAmount: ${amount}\nDue Date: {dueDate}\n\nThank you for your business!\n\n{companyName}'
      },
      eventReminderEmail: {
        subject: 'Event Reminder: {eventName}',
        body: 'Hello {customerName},\n\nThis is a reminder about your upcoming event:\n\nEvent: {eventName}\nDate: {eventDate}\nTime: {eventTime}\nLocation: {eventLocation}\n\nWe look forward to seeing you!\n\n{companyName}'
      },
      paymentConfirmationEmail: {
        subject: 'Payment Received - Invoice #{invoiceNumber}',
        body: 'Dear {customerName},\n\nWe have received your payment of ${amount} for Invoice #{invoiceNumber}.\n\nThank you for your prompt payment!\n\n{companyName}'
      },
      welcomeEmail: {
        subject: 'Welcome to {companyName}!',
        body: 'Dear {customerName},\n\nWelcome to our CRM system! We\'re excited to work with you.\n\nIf you have any questions, please don\'t hesitate to contact us.\n\nBest regards,\n{companyName}'
      }
    },
    
    // Email Marketing
    emailMarketing: {
      enabled: false,
      provider: 'none',
      apiKey: '',
      listId: '',
      allowUnsubscribe: true,
      unsubscribeFooter: 'If you no longer wish to receive these emails, you can unsubscribe here.'
    },
    
    // Email Preferences
    emailPreferences: {
      sendFromName: '',
      includeLogo: true,
      includeFooter: true,
      footerText: 'This email was sent by {companyName}.',
      trackOpens: true,
      trackClicks: true,
      requireConfirmation: false
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
    if (globalSettings.emailServices) {
      setSettings(globalSettings.emailServices);
    }
  }, [globalSettings, settingsLoading]);

  // Check for success/error messages from OAuth callback
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'gmail_connected') {
      setSuccessMessage('Gmail connected successfully! You can now send emails from the CRM.');
      setTimeout(() => setSuccessMessage(''), 5000);
    }

    if (error) {
      setErrorMessage(`Error connecting Gmail: ${error}`);
      setTimeout(() => setErrorMessage(''), 5000);
    }
  }, [searchParams]);

  // Check if Gmail is connected
  useEffect(() => {
    const checkGmailConnection = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch('/api/test-gmail');
        const data = await response.json();

        if (data.connected && data.email) {
          setIsGmailConnected(true);
          setGmailEmail(data.email);
        }
      } catch (err) {
        console.error('Error checking Gmail connection:', err);
      } finally {
        setCheckingConnection(false);
      }
    };

    checkGmailConnection();
  }, [session, successMessage]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...globalSettings,
        emailServices: settings
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
                    <Mail className="h-6 w-6 mr-3 text-[#347dc4]" />
                    Email Services Settings
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Set up Gmail, SMTP, and email marketing integrations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-8">

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-green-900">Success!</h3>
                  <p className="text-sm text-green-700 mt-1">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                <XCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-900">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* SMTP Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Server className="h-5 w-5 mr-2 text-[#347dc4]" />
                  SMTP Settings
                </h2>
                <button
                  onClick={() => handleToggle('smtpSettings.enabled')}
                  className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                >
                  {settings.smtpSettings.enabled ? (
                    <ToggleRight className="h-6 w-6" />
                  ) : (
                    <ToggleLeft className="h-6 w-6" />
                  )}
                </button>
              </div>
              
              {settings.smtpSettings.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-900">SMTP Host</label>
                      <input
                        id="smtp-host"
                        name="smtp-host"
                        type="text"
                        value={settings.smtpSettings.host}
                        onChange={(e) => handleSelect('smtpSettings.host', e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        aria-label="SMTP Host"
                        title="Enter the SMTP server hostname"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900">Port</label>
                      <input
                        id="smtp-port"
                        name="smtp-port"
                        type="number"
                        value={settings.smtpSettings.port}
                        onChange={(e) => handleSelect('smtpSettings.port', parseInt(e.target.value) || 587)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        aria-label="SMTP Port"
                        title="Enter the SMTP server port number"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900">Username</label>
                      <input
                        id="smtp-username"
                        name="smtp-username"
                        type="text"
                        value={settings.smtpSettings.username}
                        onChange={(e) => handleSelect('smtpSettings.username', e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        aria-label="SMTP Username"
                        title="Enter the SMTP username"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900">Password</label>
                      <input
                        type="password"
                        value={settings.smtpSettings.password}
                        onChange={(e) => handleSelect('smtpSettings.password', e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        aria-label="SMTP Password"
                        title="Enter the SMTP password"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Encryption</label>
                      <select
                        value={settings.smtpSettings.encryption}
                        onChange={(e) => handleSelect('smtpSettings.encryption', e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        aria-label="Select encryption type"
                        title="Select encryption type"
                      >
                        <option value="none">None</option>
                        <option value="ssl">SSL</option>
                        <option value="tls">TLS</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900">From Name</label>
                      <input
                        type="text"
                        value={settings.smtpSettings.fromName}
                        onChange={(e) => handleSelect('smtpSettings.fromName', e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        aria-label="From Name"
                        title="Enter the sender name for emails"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900">From Email</label>
                      <input
                        type="email"
                        value={settings.smtpSettings.fromEmail}
                        onChange={(e) => handleSelect('smtpSettings.fromEmail', e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        aria-label="From Email"
                        title="Enter the sender email address"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900">Reply-To Email</label>
                      <input
                        type="email"
                        value={settings.smtpSettings.replyToEmail}
                        onChange={(e) => handleSelect('smtpSettings.replyToEmail', e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        aria-label="Reply-To Email"
                        title="Enter the reply-to email address"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Gmail Integration */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Mail className="h-5 w-5 mr-2 text-[#347dc4]" />
                    Gmail Integration
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Connect your Gmail account to send and receive emails directly from the CRM
                  </p>
                </div>
                {isGmailConnected && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Connected</span>
                  </div>
                )}
              </div>

              {/* Connection Status */}
              {isGmailConnected && gmailEmail && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-green-900">Gmail Connected</h3>
                      <p className="text-sm text-green-700 mt-1">
                        Connected as: <strong>{gmailEmail}</strong>
                      </p>
                      <p className="text-xs text-green-600 mt-2">
                        You can now send emails from the Opportunities page. Click the mail icon next to any opportunity to send an email.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Quick Connect Button */}
                {!isGmailConnected && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Quick Connect (Recommended)</h3>
                      <p className="text-xs text-gray-600 mb-4">
                        Connect your Gmail account with one click. This will allow the CRM to send emails on your behalf and sync your email history.
                      </p>
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/integrations/gmail/auth');
                            const data = await response.json();

                            if (data.authUrl) {
                              window.location.href = data.authUrl;
                            } else {
                              alert('Error: ' + (data.error || 'Failed to initialize OAuth'));
                            }
                          } catch (error) {
                            console.error('OAuth error:', error);
                            alert('Failed to connect to Gmail. Please try again.');
                          }
                        }}
                        className="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150 flex items-center justify-center font-medium cursor-pointer"
                      >
                      <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Connect with Google Workspace
                    </button>
                  </div>
                  )}

                  {/* Manual Configuration */}
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Manual Configuration (Advanced)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-900">Client ID</label>
                          <input
                            type="text"
                            value={settings.gmailIntegration.clientId}
                            onChange={(e) => handleSelect('gmailIntegration.clientId', e.target.value)}
                            placeholder="Google OAuth Client ID"
                            className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                            aria-label="Gmail Client ID"
                            title="Enter the Google OAuth Client ID"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-900">Client Secret</label>
                          <input
                            type="password"
                            value={settings.gmailIntegration.clientSecret}
                            onChange={(e) => handleSelect('gmailIntegration.clientSecret', e.target.value)}
                            placeholder="Google OAuth Client Secret"
                            className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                            aria-label="Gmail Client Secret"
                            title="Enter the Google OAuth Client Secret"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-900">Refresh Token</label>
                          <input
                            type="password"
                            value={settings.gmailIntegration.refreshToken}
                            onChange={(e) => handleSelect('gmailIntegration.refreshToken', e.target.value)}
                            placeholder="OAuth Refresh Token"
                            className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                            aria-label="Gmail Refresh Token"
                            title="Enter the OAuth Refresh Token"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-900">From Email</label>
                          <input
                            type="email"
                            value={settings.gmailIntegration.fromEmail}
                            onChange={(e) => handleSelect('gmailIntegration.fromEmail', e.target.value)}
                            placeholder="your-email@gmail.com"
                            className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                            aria-label="Gmail From Email"
                            title="Enter the Gmail address to send from"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            {/* Email Marketing */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-[#347dc4]" />
                  Email Marketing
                </h2>
                <button
                  onClick={() => handleToggle('emailMarketing.enabled')}
                  className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                >
                  {settings.emailMarketing.enabled ? (
                    <ToggleRight className="h-6 w-6" />
                  ) : (
                    <ToggleLeft className="h-6 w-6" />
                  )}
                </button>
              </div>
              
              {settings.emailMarketing.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Provider</label>
                      <select
                        value={settings.emailMarketing.provider}
                        onChange={(e) => handleSelect('emailMarketing.provider', e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        aria-label="Select email marketing provider"
                        title="Select email marketing provider"
                      >
                        <option value="none">None</option>
                        <option value="mailchimp">Mailchimp</option>
                        <option value="constant-contact">Constant Contact</option>
                        <option value="sendgrid">SendGrid</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900">API Key</label>
                      <input
                        type="password"
                        value={settings.emailMarketing.apiKey}
                        onChange={(e) => handleSelect('emailMarketing.apiKey', e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        aria-label="Email Marketing API Key"
                        title="Enter the email marketing provider API key"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900">List ID</label>
                      <input
                        type="text"
                        value={settings.emailMarketing.listId}
                        onChange={(e) => handleSelect('emailMarketing.listId', e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        aria-label="Email Marketing List ID"
                        title="Enter the email marketing list ID"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Allow Unsubscribe</label>
                        <p className="text-xs text-gray-500">Include unsubscribe link in emails</p>
                      </div>
                      <button
                        onClick={() => handleToggle('emailMarketing.allowUnsubscribe')}
                        className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                      >
                        {settings.emailMarketing.allowUnsubscribe ? (
                          <ToggleRight className="h-6 w-6" />
                        ) : (
                          <ToggleLeft className="h-6 w-6" />
                        )}
                      </button>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900">Unsubscribe Footer</label>
                      <textarea
                        value={settings.emailMarketing.unsubscribeFooter}
                        onChange={(e) => handleSelect('emailMarketing.unsubscribeFooter', e.target.value)}
                        rows={3}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        aria-label="Unsubscribe Footer Text"
                        title="Enter the unsubscribe footer text"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Email Preferences */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Send className="h-5 w-5 mr-2 text-[#347dc4]" />
                Email Preferences
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Send From Name</label>
                    <input
                      type="text"
                      value={settings.emailPreferences.sendFromName}
                      onChange={(e) => handleSelect('emailPreferences.sendFromName', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Send From Name"
                      title="Enter the name to send emails from"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Include Logo</label>
                      <p className="text-xs text-gray-500">Include company logo in emails</p>
                    </div>
                    <button
                      onClick={() => handleToggle('emailPreferences.includeLogo')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.emailPreferences.includeLogo ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Include Footer</label>
                      <p className="text-xs text-gray-500">Include footer text in emails</p>
                    </div>
                    <button
                      onClick={() => handleToggle('emailPreferences.includeFooter')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.emailPreferences.includeFooter ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Footer Text</label>
                    <textarea
                      value={settings.emailPreferences.footerText}
                      onChange={(e) => handleSelect('emailPreferences.footerText', e.target.value)}
                      rows={3}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Footer Text"
                      title="Enter the footer text for emails"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Track Opens</label>
                      <p className="text-xs text-gray-500">Track when emails are opened</p>
                    </div>
                    <button
                      onClick={() => handleToggle('emailPreferences.trackOpens')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.emailPreferences.trackOpens ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Track Clicks</label>
                      <p className="text-xs text-gray-500">Track when links are clicked</p>
                    </div>
                    <button
                      onClick={() => handleToggle('emailPreferences.trackClicks')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.emailPreferences.trackClicks ? (
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
