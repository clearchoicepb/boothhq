'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { useSettings } from '@/lib/settings-context';
import { 
  ArrowLeft,
  Users,
  Settings,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export default function ContactsSettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { settings: globalSettings, updateSettings, loading: settingsLoading } = useSettings();
  
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    defaultView: 'table',
    itemsPerPage: 25,
    showPhotos: true,
    showJobTitle: true,
    showDepartment: true,
    requiredFields: {
      firstName: true,
      lastName: true,
      email: false,
      phone: false
    },
    autoCreateAccount: false,
    sendWelcomeEmail: true,
    duplicateDetection: true
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
    if (globalSettings.contacts) {
      setSettings(globalSettings.contacts);
    }
  }, [globalSettings, settingsLoading]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...globalSettings,
        contacts: settings
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
                    <Users className="h-6 w-6 mr-3 text-[#347dc4]" />
                    Contacts Settings
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure contact display and automation settings
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
                    <p className="text-xs text-gray-500">How contacts are displayed by default</p>
                  </div>
                  <select
                    value={settings.defaultView}
                    onChange={(e) => handleSelect('defaultView', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                    aria-label="Select default view"
                    title="Select default view"
                  >
                    <option value="table">Table View</option>
                    <option value="cards">Card View</option>
                    <option value="list">List View</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Show Job Title</label>
                    <p className="text-xs text-gray-500">Display job title in contacts list</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showJobTitle')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showJobTitle ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Show Department</label>
                    <p className="text-xs text-gray-500">Display department in contacts list</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showDepartment')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showDepartment ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Required Fields */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Required Fields</h2>
              
              <div className="space-y-4">
                {Object.entries(settings.requiredFields).map(([field, required]) => (
                  <div key={field} className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900 capitalize">
                        {field.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <p className="text-xs text-gray-500">Make this field required when creating contacts</p>
                    </div>
                    <button
                      onClick={() => handleToggle(`requiredFields.${field}`)}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {required ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Automation Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Automation Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Auto-create Account</label>
                    <p className="text-xs text-gray-500">Automatically create account when adding contact</p>
                  </div>
                  <button
                    onClick={() => handleToggle('autoCreateAccount')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.autoCreateAccount ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Send Welcome Email</label>
                    <p className="text-xs text-gray-500">Send welcome email to new contacts</p>
                  </div>
                  <button
                    onClick={() => handleToggle('sendWelcomeEmail')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.sendWelcomeEmail ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Duplicate Detection</label>
                    <p className="text-xs text-gray-500">Warn when creating duplicate contacts</p>
                  </div>
                  <button
                    onClick={() => handleToggle('duplicateDetection')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.duplicateDetection ? (
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
