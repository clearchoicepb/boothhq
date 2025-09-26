'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { useSettings } from '@/lib/settings-context';
import { 
  ArrowLeft,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  PieChart,
  Calendar
} from 'lucide-react';

interface AnalyticsSettings {
  // Dashboard Settings
  dashboardSettings: {
    defaultView: 'overview' | 'detailed' | 'custom';
    showPerformanceMetrics: boolean;
    showRevenueCharts: boolean;
    showLeadMetrics: boolean;
    showEventMetrics: boolean;
    showUserActivity: boolean;
    refreshInterval: number; // minutes
  };
  
  // Reporting Settings
  reportingSettings: {
    autoGenerateReports: boolean;
    reportFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    emailReports: boolean;
    reportRecipients: string[];
    includeCharts: boolean;
    includeRawData: boolean;
    reportFormat: 'pdf' | 'excel' | 'csv';
  };
  
  // Google Analytics
  googleAnalytics: {
    enabled: boolean;
    trackingId: string;
    propertyId: string;
    measurementId: string;
    trackPageViews: boolean;
    trackEvents: boolean;
    trackConversions: boolean;
  };
  
  // Custom Metrics
  customMetrics: {
    trackLeadSource: boolean;
    trackConversionRate: boolean;
    trackCustomerLifetimeValue: boolean;
    trackEventAttendance: boolean;
    trackRevenueBySource: boolean;
    trackUserEngagement: boolean;
  };
  
  // Data Retention
  dataRetention: {
    keepAnalyticsData: boolean;
    retentionPeriodMonths: number;
    anonymizeOldData: boolean;
    exportBeforeDelete: boolean;
  };
}

export default function AnalyticsReportsSettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { settings: globalSettings, updateSettings, loading: settingsLoading } = useSettings();
  
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AnalyticsSettings>({
    // Dashboard Settings
    dashboardSettings: {
      defaultView: 'overview',
      showPerformanceMetrics: true,
      showRevenueCharts: true,
      showLeadMetrics: true,
      showEventMetrics: true,
      showUserActivity: true,
      refreshInterval: 15
    },
    
    // Reporting Settings
    reportingSettings: {
      autoGenerateReports: false,
      reportFrequency: 'weekly',
      emailReports: true,
      reportRecipients: [],
      includeCharts: true,
      includeRawData: false,
      reportFormat: 'pdf'
    },
    
    // Google Analytics
    googleAnalytics: {
      enabled: false,
      trackingId: '',
      propertyId: '',
      measurementId: '',
      trackPageViews: true,
      trackEvents: true,
      trackConversions: true
    },
    
    // Custom Metrics
    customMetrics: {
      trackLeadSource: true,
      trackConversionRate: true,
      trackCustomerLifetimeValue: true,
      trackEventAttendance: true,
      trackRevenueBySource: true,
      trackUserEngagement: true
    },
    
    // Data Retention
    dataRetention: {
      keepAnalyticsData: true,
      retentionPeriodMonths: 24,
      anonymizeOldData: false,
      exportBeforeDelete: true
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
    if (globalSettings.analytics) {
      setSettings(globalSettings.analytics);
    }
  }, [globalSettings, settingsLoading]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...globalSettings,
        analytics: settings
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
                    <BarChart3 className="h-6 w-6 mr-3 text-[#347dc4]" />
                    Analytics & Reports Settings
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure reporting dashboards and analytics integrations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-8">
            
            {/* Dashboard Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-[#347dc4]" />
                Dashboard Settings
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Default View</label>
                    <p className="text-xs text-gray-500">Default dashboard view for users</p>
                    <select
                      value={settings.dashboardSettings.defaultView}
                      onChange={(e) => handleSelect('dashboardSettings.defaultView', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Select default view"
                      title="Select default view"
                    >
                      <option value="overview">Overview</option>
                      <option value="detailed">Detailed</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Refresh Interval (Minutes)</label>
                    <p className="text-xs text-gray-500">How often to refresh dashboard data</p>
                    <select
                      value={settings.dashboardSettings.refreshInterval}
                      onChange={(e) => handleSelect('dashboardSettings.refreshInterval', parseInt(e.target.value))}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Select refresh interval"
                      title="Select refresh interval"
                    >
                      <option value={5}>5 minutes</option>
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Show Performance Metrics</label>
                      <p className="text-xs text-gray-500">Display performance metrics on dashboard</p>
                    </div>
                    <button
                      onClick={() => handleToggle('dashboardSettings.showPerformanceMetrics')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.dashboardSettings.showPerformanceMetrics ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Show Revenue Charts</label>
                      <p className="text-xs text-gray-500">Display revenue charts and trends</p>
                    </div>
                    <button
                      onClick={() => handleToggle('dashboardSettings.showRevenueCharts')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.dashboardSettings.showRevenueCharts ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Show Lead Metrics</label>
                      <p className="text-xs text-gray-500">Display lead generation metrics</p>
                    </div>
                    <button
                      onClick={() => handleToggle('dashboardSettings.showLeadMetrics')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.dashboardSettings.showLeadMetrics ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Show Event Metrics</label>
                      <p className="text-xs text-gray-500">Display event-related metrics</p>
                    </div>
                    <button
                      onClick={() => handleToggle('dashboardSettings.showEventMetrics')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.dashboardSettings.showEventMetrics ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Reporting Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-[#347dc4]" />
                Reporting Settings
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Auto Generate Reports</label>
                      <p className="text-xs text-gray-500">Automatically generate scheduled reports</p>
                    </div>
                    <button
                      onClick={() => handleToggle('reportingSettings.autoGenerateReports')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.reportingSettings.autoGenerateReports ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Report Frequency</label>
                    <p className="text-xs text-gray-500">How often to generate reports</p>
                    <select
                      value={settings.reportingSettings.reportFrequency}
                      onChange={(e) => handleSelect('reportingSettings.reportFrequency', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Select report frequency"
                      title="Select report frequency"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Email Reports</label>
                      <p className="text-xs text-gray-500">Automatically email reports to recipients</p>
                    </div>
                    <button
                      onClick={() => handleToggle('reportingSettings.emailReports')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.reportingSettings.emailReports ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Report Recipients</label>
                    <p className="text-xs text-gray-500">Email addresses to receive reports (comma-separated)</p>
                    <input
                      type="text"
                      value={settings.reportingSettings.reportRecipients.join(', ')}
                      onChange={(e) => {
                        const emails = e.target.value.split(',').map(email => email.trim()).filter(email => email);
                        setSettings(prev => ({
                          ...prev,
                          reportingSettings: {
                            ...prev.reportingSettings,
                            reportRecipients: emails
                          }
                        }));
                      }}
                      placeholder="admin@company.com, manager@company.com"
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Include Charts</label>
                      <p className="text-xs text-gray-500">Include visual charts in reports</p>
                    </div>
                    <button
                      onClick={() => handleToggle('reportingSettings.includeCharts')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.reportingSettings.includeCharts ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Include Raw Data</label>
                      <p className="text-xs text-gray-500">Include raw data tables in reports</p>
                    </div>
                    <button
                      onClick={() => handleToggle('reportingSettings.includeRawData')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.reportingSettings.includeRawData ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Report Format</label>
                    <p className="text-xs text-gray-500">Default format for generated reports</p>
                    <select
                      value={settings.reportingSettings.reportFormat}
                      onChange={(e) => handleSelect('reportingSettings.reportFormat', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Select report format"
                      title="Select report format"
                    >
                      <option value="pdf">PDF</option>
                      <option value="excel">Excel</option>
                      <option value="csv">CSV</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Analytics */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-[#347dc4]" />
                  Google Analytics
                </h2>
                <button
                  onClick={() => handleToggle('googleAnalytics.enabled')}
                  className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                >
                  {settings.googleAnalytics.enabled ? (
                    <ToggleRight className="h-6 w-6" />
                  ) : (
                    <ToggleLeft className="h-6 w-6" />
                  )}
                </button>
              </div>
              
              {settings.googleAnalytics.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Tracking ID</label>
                      <input
                        type="text"
                        value={settings.googleAnalytics.trackingId}
                        onChange={(e) => handleSelect('googleAnalytics.trackingId', e.target.value)}
                        placeholder="UA-XXXXXXXXX-X"
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900">Property ID</label>
                      <input
                        type="text"
                        value={settings.googleAnalytics.propertyId}
                        onChange={(e) => handleSelect('googleAnalytics.propertyId', e.target.value)}
                        placeholder="123456789"
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900">Measurement ID</label>
                      <input
                        type="text"
                        value={settings.googleAnalytics.measurementId}
                        onChange={(e) => handleSelect('googleAnalytics.measurementId', e.target.value)}
                        placeholder="G-XXXXXXXXXX"
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Track Page Views</label>
                        <p className="text-xs text-gray-500">Track page views and navigation</p>
                      </div>
                      <button
                        onClick={() => handleToggle('googleAnalytics.trackPageViews')}
                        className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                      >
                        {settings.googleAnalytics.trackPageViews ? (
                          <ToggleRight className="h-6 w-6" />
                        ) : (
                          <ToggleLeft className="h-6 w-6" />
                        )}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Track Events</label>
                        <p className="text-xs text-gray-500">Track user interactions and events</p>
                      </div>
                      <button
                        onClick={() => handleToggle('googleAnalytics.trackEvents')}
                        className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                      >
                        {settings.googleAnalytics.trackEvents ? (
                          <ToggleRight className="h-6 w-6" />
                        ) : (
                          <ToggleLeft className="h-6 w-6" />
                        )}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Track Conversions</label>
                        <p className="text-xs text-gray-500">Track conversion events and goals</p>
                      </div>
                      <button
                        onClick={() => handleToggle('googleAnalytics.trackConversions')}
                        className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                      >
                        {settings.googleAnalytics.trackConversions ? (
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

            {/* Custom Metrics */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-[#347dc4]" />
                Custom Metrics
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Track Lead Source</label>
                      <p className="text-xs text-gray-500">Track where leads originate from</p>
                    </div>
                    <button
                      onClick={() => handleToggle('customMetrics.trackLeadSource')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.customMetrics.trackLeadSource ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Track Conversion Rate</label>
                      <p className="text-xs text-gray-500">Track lead to customer conversion rates</p>
                    </div>
                    <button
                      onClick={() => handleToggle('customMetrics.trackConversionRate')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.customMetrics.trackConversionRate ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Track Customer Lifetime Value</label>
                      <p className="text-xs text-gray-500">Track customer value over time</p>
                    </div>
                    <button
                      onClick={() => handleToggle('customMetrics.trackCustomerLifetimeValue')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.customMetrics.trackCustomerLifetimeValue ? (
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
                      <label className="text-sm font-medium text-gray-900">Track Event Attendance</label>
                      <p className="text-xs text-gray-500">Track event attendance rates</p>
                    </div>
                    <button
                      onClick={() => handleToggle('customMetrics.trackEventAttendance')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.customMetrics.trackEventAttendance ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Track Revenue by Source</label>
                      <p className="text-xs text-gray-500">Track revenue by lead source</p>
                    </div>
                    <button
                      onClick={() => handleToggle('customMetrics.trackRevenueBySource')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.customMetrics.trackRevenueBySource ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Track User Engagement</label>
                      <p className="text-xs text-gray-500">Track user activity and engagement</p>
                    </div>
                    <button
                      onClick={() => handleToggle('customMetrics.trackUserEngagement')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.customMetrics.trackUserEngagement ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Retention */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Retention</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Keep Analytics Data</label>
                      <p className="text-xs text-gray-500">Retain analytics data for reporting</p>
                    </div>
                    <button
                      onClick={() => handleToggle('dataRetention.keepAnalyticsData')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.dataRetention.keepAnalyticsData ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Retention Period (Months)</label>
                    <p className="text-xs text-gray-500">How long to keep analytics data</p>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={settings.dataRetention.retentionPeriodMonths}
                      onChange={(e) => handleSelect('dataRetention.retentionPeriodMonths', parseInt(e.target.value) || 24)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Retention period in months"
                      title="Enter retention period in months"
                      placeholder="Enter number of months"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Anonymize Old Data</label>
                      <p className="text-xs text-gray-500">Remove personal info from old data</p>
                    </div>
                    <button
                      onClick={() => handleToggle('dataRetention.anonymizeOldData')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.dataRetention.anonymizeOldData ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Export Before Delete</label>
                      <p className="text-xs text-gray-500">Export data before deletion</p>
                    </div>
                    <button
                      onClick={() => handleToggle('dataRetention.exportBeforeDelete')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.dataRetention.exportBeforeDelete ? (
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
