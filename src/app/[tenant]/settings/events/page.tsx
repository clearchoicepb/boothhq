'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { useSettings } from '@/lib/settings-context';
import { 
  ArrowLeft,
  Calendar,
  Settings,
  ToggleLeft,
  ToggleRight,
  Clock
} from 'lucide-react';

export default function EventsSettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { settings: globalSettings, updateSettings, loading: settingsLoading } = useSettings();
  
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    defaultView: 'calendar',
    itemsPerPage: 25,
    showPhotos: true,
    showRevenue: true,
    showSetupTime: true,
    showBreakdownTime: true,
    autoCalculateEndTime: true,
    autoGenerateInvoice: false,
    sendReminderEmails: true,
    createFollowUpTasks: true,
    defaultSetupTime: 45,
    defaultBreakdownTime: 30,
    bufferTimeBetweenEvents: 30,
    workingHoursStart: '09:00',
    workingHoursEnd: '22:00'
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
    if (globalSettings.events) {
      setSettings(globalSettings.events);
    }
  }, [globalSettings, settingsLoading]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...globalSettings,
        events: settings
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
                    <Calendar className="h-6 w-6 mr-3 text-[#347dc4]" />
                    Events Settings
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure event display, scheduling, and automation settings
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-8">
            
            {/* Display Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2 text-[#347dc4]" />
                Display Settings
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Default View</label>
                    <p className="text-xs text-gray-500">How events are displayed by default</p>
                  </div>
                  <select
                    value={settings.defaultView}
                    onChange={(e) => handleSelect('defaultView', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                  >
                    <option value="calendar">Calendar View</option>
                    <option value="table">Table View</option>
                    <option value="cards">Card View</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Show Setup Time</label>
                    <p className="text-xs text-gray-500">Display setup time in events list</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showSetupTime')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showSetupTime ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Show Breakdown Time</label>
                    <p className="text-xs text-gray-500">Display breakdown time in events list</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showBreakdownTime')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showBreakdownTime ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Time Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-[#347dc4]" />
                Time Settings
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Default Setup Time (minutes)</label>
                    <p className="text-xs text-gray-500">Default setup time for new events</p>
                    <input
                      type="number"
                      min="0"
                      value={settings.defaultSetupTime}
                      onChange={(e) => handleSelect('defaultSetupTime', parseInt(e.target.value) || 0)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Default Breakdown Time (minutes)</label>
                    <p className="text-xs text-gray-500">Default breakdown time for new events</p>
                    <input
                      type="number"
                      min="0"
                      value={settings.defaultBreakdownTime}
                      onChange={(e) => handleSelect('defaultBreakdownTime', parseInt(e.target.value) || 0)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Working Hours Start</label>
                    <p className="text-xs text-gray-500">Start of business hours (HH:MM)</p>
                    <input
                      type="time"
                      value={settings.workingHoursStart}
                      onChange={(e) => handleSelect('workingHoursStart', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Working Hours End</label>
                    <p className="text-xs text-gray-500">End of business hours (HH:MM)</p>
                    <input
                      type="time"
                      value={settings.workingHoursEnd}
                      onChange={(e) => handleSelect('workingHoursEnd', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Automation Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Automation Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Auto-calculate End Time</label>
                    <p className="text-xs text-gray-500">Automatically calculate end time based on event duration</p>
                  </div>
                  <button
                    onClick={() => handleToggle('autoCalculateEndTime')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.autoCalculateEndTime ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Send Reminder Emails</label>
                    <p className="text-xs text-gray-500">Send email reminders before events</p>
                  </div>
                  <button
                    onClick={() => handleToggle('sendReminderEmails')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.sendReminderEmails ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Auto-generate Invoice</label>
                    <p className="text-xs text-gray-500">Automatically create invoice when event is confirmed</p>
                  </div>
                  <button
                    onClick={() => handleToggle('autoGenerateInvoice')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.autoGenerateInvoice ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
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
