'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSettings } from '@/lib/settings-context';
import { createLogger } from '@/lib/logger'

const log = createLogger('leads')
import { 
  ArrowLeft,
  Target,
  Settings,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export default function LeadsSettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { settings: globalSettings, updateSettings, loading: settingsLoading } = useSettings();
  
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    defaultView: 'table',
    itemsPerPage: 25,
    showSource: true,
    showStatus: true,
    showAssignedTo: true,
    showCreatedDate: false,
    requiredFields: {
      firstName: true,
      lastName: true,
      email: true,
      phone: false,
      source: false,
      status: false
    },
    autoAssignLeads: false,
    sendWelcomeEmail: true,
    duplicateDetection: true,
    leadScoring: false,
    autoFollowUp: false,
    followUpDays: 3
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
    if (globalSettings.leads) {
      // Merge database settings with defaults to ensure all required properties exist
      setSettings(prev => ({
        ...prev,
        ...globalSettings.leads,
        requiredFields: {
          ...prev.requiredFields,
          ...globalSettings.leads.requiredFields
        },
        leadSources: globalSettings.leads.leadSources || prev.leadSources,
        leadStatuses: globalSettings.leads.leadStatuses || prev.leadStatuses,
        customFields: globalSettings.leads.customFields || prev.customFields
      }));
    }
  }, [globalSettings, settingsLoading]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...globalSettings,
        leads: settings
      });
      alert('Settings saved successfully!');
    } catch (error) {
      log.error({ error }, 'Error saving settings');
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
                    <Target className="h-6 w-6 mr-3 text-[#347dc4]" />
                    Leads Settings
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure lead management and automation settings
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
                    <p className="text-xs text-gray-500">How leads are displayed by default</p>
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
                    <label className="text-sm font-medium text-gray-900">Show Lead Source</label>
                    <p className="text-xs text-gray-500">Display lead source in leads list</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showSource')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showSource ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Show Assigned To</label>
                    <p className="text-xs text-gray-500">Display assigned user in leads list</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showAssignedTo')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showAssignedTo ? (
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
                      <p className="text-xs text-gray-500">Make this field required when creating leads</p>
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
                    <label className="text-sm font-medium text-gray-900">Auto-assign Leads</label>
                    <p className="text-xs text-gray-500">Automatically assign leads to sales reps</p>
                  </div>
                  <button
                    onClick={() => handleToggle('autoAssignLeads')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.autoAssignLeads ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Send Welcome Email</label>
                    <p className="text-xs text-gray-500">Send welcome email to new leads</p>
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
                    <p className="text-xs text-gray-500">Warn when creating duplicate leads</p>
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

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Auto Follow-up</label>
                    <p className="text-xs text-gray-500">Automatically schedule follow-up tasks</p>
                  </div>
                  <button
                    onClick={() => handleToggle('autoFollowUp')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.autoFollowUp ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Follow-up Days</label>
                    <p className="text-xs text-gray-500">Days after lead creation to schedule follow-up</p>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={settings.followUpDays}
                    onChange={(e) => handleSelect('followUpDays', parseInt(e.target.value) || 3)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-20"
                    aria-label="Follow-up days"
                    title="Enter follow-up days"
                    placeholder="3"
                  />
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
