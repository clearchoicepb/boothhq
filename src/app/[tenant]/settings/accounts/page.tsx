'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSettings } from '@/lib/settings-context';
import { createLogger } from '@/lib/logger'
import toast from 'react-hot-toast'

const log = createLogger('accounts')
import { 
  ArrowLeft,
  Building2,
  Settings,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  Edit3
} from 'lucide-react';

interface AccountType {
  id: string;
  name: string;
  enabled: boolean;
  default: boolean;
}

interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'select' | 'textarea' | 'number';
  required: boolean;
  options?: string[];
}

interface AccountSettings {
  defaultView: string;
  itemsPerPage: number;
  showPhotos: boolean;
  showRevenue: boolean;
  showIndustry: boolean;
  requiredFields: {
    name: boolean;
    email: boolean;
    phone: boolean;
    address: boolean;
  };
  accountTypes: AccountType[];
  customFields: CustomField[];
  autoGenerateInvoice: boolean;
  sendWelcomeEmail: boolean;
  createContactOnAccount: boolean;
}

export default function AccountsSettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { settings: globalSettings, updateSettings, loading: settingsLoading } = useSettings();
  
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AccountSettings>({
    // Display Settings
    defaultView: 'table',
    itemsPerPage: 25,
    showPhotos: true,
    showRevenue: true,
    showIndustry: false,
    
    // Field Settings
    requiredFields: {
      name: true,
      email: true,
      phone: true,
      address: false
    },
    
    // Account Types
    accountTypes: [
      { id: 'individual', name: 'Private Individual', enabled: true, default: true },
      { id: 'company', name: 'Company/Organization', enabled: true, default: false }
    ],
    
    // Custom Fields
    customFields: [
      { id: 'website', name: 'Website', type: 'text', required: false },
      { id: 'industry', name: 'Industry', type: 'select', required: false, options: ['Photography', 'Events', 'Corporate', 'Wedding'] },
      { id: 'notes', name: 'Internal Notes', type: 'textarea', required: false }
    ],
    
    // Automation Settings
    autoGenerateInvoice: false,
    sendWelcomeEmail: true,
    createContactOnAccount: false
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

  const addCustomField = () => {
    setSettings(prev => ({
      ...prev,
      customFields: [
        ...prev.customFields,
        { id: `field_${Date.now()}`, name: 'New Field', type: 'text', required: false }
      ]
    }));
  };

  const removeCustomField = (id: string) => {
    setSettings(prev => ({
      ...prev,
      customFields: prev.customFields.filter(field => field.id !== id)
    }));
  };

  // Load settings from global context
  useEffect(() => {
    if (globalSettings.accounts) {
      // Merge database settings with defaults to ensure all required properties exist
      setSettings(prev => ({
        ...prev,
        ...globalSettings.accounts,
        requiredFields: {
          ...prev.requiredFields,
          ...globalSettings.accounts.requiredFields
        },
        accountTypes: globalSettings.accounts.accountTypes || prev.accountTypes,
        customFields: globalSettings.accounts.customFields || prev.customFields
      }));
    }
  }, [globalSettings, settingsLoading]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Save settings to global context (which will save to database)
      await updateSettings({
        ...globalSettings,
        accounts: settings
      });
      
      toast.success('Settings saved successfully!');
    } catch (error) {
      log.error({ error }, 'Error saving settings');
      toast.error('Error saving settings. Please try again.');
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
                    <Building2 className="h-6 w-6 mr-3 text-[#347dc4]" />
                    Accounts Settings
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Customize account types, fields, and display options
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
                    <p className="text-xs text-gray-500">How accounts are displayed by default</p>
                  </div>
                  <select
                    value={settings.defaultView}
                    onChange={(e) => handleSelect('defaultView', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                    aria-label="Select default view for accounts"
                  >
                    <option value="table">Table View</option>
                    <option value="cards">Card View</option>
                    <option value="list">List View</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Items Per Page</label>
                    <p className="text-xs text-gray-500">Number of accounts to show per page</p>
                  </div>
                  <select
                    value={settings.itemsPerPage}
                    onChange={(e) => handleSelect('itemsPerPage', parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                    aria-label="Select number of items per page"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Show Account Photos</label>
                    <p className="text-xs text-gray-500">Display profile photos in the accounts list</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showPhotos')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showPhotos ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Show Revenue Data</label>
                    <p className="text-xs text-gray-500">Display revenue information in accounts table</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showRevenue')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showRevenue ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Show Industry Field</label>
                    <p className="text-xs text-gray-500">Display industry information in accounts table</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showIndustry')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showIndustry ? (
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
                      <p className="text-xs text-gray-500">Make this field required when creating accounts</p>
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

            {/* Account Types */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Types</h2>
              
              <div className="space-y-4">
                {settings.accountTypes.map((type) => (
                  <div key={type.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-900">{type.name}</label>
                      <p className="text-xs text-gray-500">
                        {type.default ? 'Default account type' : 'Available account type'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggle(`accountTypes.${type.id}.enabled`)}
                        className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                      >
                        {type.enabled ? (
                          <ToggleRight className="h-6 w-6" />
                        ) : (
                          <ToggleLeft className="h-6 w-6" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Fields */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Custom Fields</h2>
                <button
                  onClick={addCustomField}
                  className="flex items-center px-3 py-2 bg-[#347dc4] text-white rounded-md hover:bg-[#2c6ba8] transition-colors duration-150"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </button>
              </div>
              
              <div className="space-y-3">
                {settings.customFields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => {
                          setSettings(prev => ({
                            ...prev,
                            customFields: prev.customFields.map(f => 
                              f.id === field.id ? { ...f, name: e.target.value } : f
                            )
                          }));
                        }}
                        className="text-sm font-medium text-gray-900 bg-transparent border-none outline-none"
                        aria-label={`Edit ${field.name} field name`}
                      />
                      <p className="text-xs text-gray-500 capitalize">{field.type} field</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        className="text-gray-400 hover:text-[#347dc4] transition-colors duration-150"
                        aria-label={`Edit ${field.name} field`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => removeCustomField(field.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors duration-150"
                        aria-label={`Remove ${field.name} field`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
                    <label className="text-sm font-medium text-gray-900">Auto-generate Invoice</label>
                    <p className="text-xs text-gray-500">Automatically create invoices for new events</p>
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

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Send Welcome Email</label>
                    <p className="text-xs text-gray-500">Send welcome email to new account contacts</p>
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
                    <label className="text-sm font-medium text-gray-900">Create Contact on Account</label>
                    <p className="text-xs text-gray-500">Automatically create a contact when creating an account</p>
                  </div>
                  <button
                    onClick={() => handleToggle('createContactOnAccount')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.createContactOnAccount ? (
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
    
  );
}
