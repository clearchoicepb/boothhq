'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSettings } from '@/lib/settings-context';
import { createLogger } from '@/lib/logger'
import toast from 'react-hot-toast'

const log = createLogger('appearance')
import {
  ArrowLeft,
  Palette,
  Settings,
  ToggleLeft,
  ToggleRight,
  Monitor,
  Smartphone,
  Tablet,
  Upload,
  X
} from 'lucide-react';

interface AppearanceSettings {
  // Branding
  logoUrl: string | null;

  // Theme Settings
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;

  // Layout Settings
  sidebarCollapsed: boolean;
  sidebarPosition: 'left' | 'right';
  compactMode: boolean;
  density: 'comfortable' | 'compact' | 'spacious';
  
  // Display Settings
  showAnimations: boolean;
  showTooltips: boolean;
  showBreadcrumbs: boolean;
  showPageNumbers: boolean;
  itemsPerPage: number;
  
  // Dashboard Settings
  defaultDashboardView: 'overview' | 'analytics' | 'custom';
  showQuickActions: boolean;
  showRecentActivity: boolean;
  showUpcomingEvents: boolean;
  showPerformanceMetrics: boolean;
  
  // Navigation Settings
  showModuleIcons: boolean;
  showModuleLabels: boolean;
  navigationStyle: 'sidebar' | 'tabs' | 'breadcrumbs';
  
  // Font Settings
  fontFamily: 'system' | 'inter' | 'roboto' | 'open-sans';
  fontSize: 'small' | 'medium' | 'large';
  fontWeight: 'normal' | 'medium' | 'semibold';
}

export default function AppearanceSettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { settings: globalSettings, updateSettings, loading: settingsLoading } = useSettings();

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<AppearanceSettings>({
    // Branding
    logoUrl: null,

    // Theme Settings
    theme: 'light',
    primaryColor: '#347dc4',
    secondaryColor: '#6b7280',
    accentColor: '#10b981',
    
    // Layout Settings
    sidebarCollapsed: false,
    sidebarPosition: 'left',
    compactMode: false,
    density: 'comfortable',
    
    // Display Settings
    showAnimations: true,
    showTooltips: true,
    showBreadcrumbs: true,
    showPageNumbers: true,
    itemsPerPage: 25,
    
    // Dashboard Settings
    defaultDashboardView: 'overview',
    showQuickActions: true,
    showRecentActivity: true,
    showUpcomingEvents: true,
    showPerformanceMetrics: true,
    
    // Navigation Settings
    showModuleIcons: true,
    showModuleLabels: true,
    navigationStyle: 'sidebar',
    
    // Font Settings
    fontFamily: 'inter',
    fontSize: 'medium',
    fontWeight: 'normal'
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'logo');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setSettings(prev => ({ ...prev, logoUrl: data.url }));
    } catch (error) {
      log.error({ error }, 'Error uploading logo');
      toast.error('Error uploading logo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setSettings(prev => ({ ...prev, logoUrl: null }));
  };

  // Load settings from global context
  useEffect(() => {
    if (globalSettings.appearance) {
      setSettings(globalSettings.appearance);
    }
  }, [globalSettings, settingsLoading]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...globalSettings,
        appearance: settings
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
                    <Palette className="h-6 w-6 mr-3 text-[#347dc4]" />
                    Appearance Settings
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Customize colors, themes, layout, and UI preferences
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-8">

            {/* Logo/Branding Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Upload className="h-5 w-5 mr-2 text-[#347dc4]" />
                Company Logo
              </h2>

              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Upload your company logo. This will be displayed in the sidebar and on documents.
                </p>

                {settings.logoUrl ? (
                  <div className="flex items-center space-x-4">
                    <img
                      src={settings.logoUrl}
                      alt="Company Logo"
                      className="h-20 w-auto object-contain border border-gray-200 rounded p-2"
                    />
                    <button
                      onClick={handleRemoveLogo}
                      className="flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove Logo
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, SVG (max 5MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploading}
                      />
                    </label>
                    {uploading && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Theme Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Palette className="h-5 w-5 mr-2 text-[#347dc4]" />
                Theme Settings
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Theme</label>
                    <p className="text-xs text-gray-500">Choose your preferred theme</p>
                    <select
                      value={settings.theme}
                      onChange={(e) => handleSelect('theme', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Select theme"
                      title="Select theme"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Primary Color</label>
                    <p className="text-xs text-gray-500">Main brand color</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="color"
                        value={settings.primaryColor}
                        onChange={(e) => handleSelect('primaryColor', e.target.value)}
                        className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                        aria-label="Primary color picker"
                        title="Select primary color"
                      />
                      <input
                        type="text"
                        value={settings.primaryColor}
                        onChange={(e) => handleSelect('primaryColor', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                        placeholder="Enter hex color code"
                        aria-label="Primary color hex code"
                        title="Enter primary color hex code"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Secondary Color</label>
                    <p className="text-xs text-gray-500">Secondary brand color</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="color"
                        value={settings.secondaryColor}
                        onChange={(e) => handleSelect('secondaryColor', e.target.value)}
                        className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                        aria-label="Secondary color picker"
                        title="Select secondary color"
                      />
                      <input
                        type="text"
                        value={settings.secondaryColor}
                        onChange={(e) => handleSelect('secondaryColor', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                        placeholder="Enter hex color code"
                        aria-label="Secondary color hex code"
                        title="Enter secondary color hex code"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Accent Color</label>
                    <p className="text-xs text-gray-500">Accent color for highlights</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="color"
                        value={settings.accentColor}
                        onChange={(e) => handleSelect('accentColor', e.target.value)}
                        className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                        aria-label="Accent color picker"
                        title="Select accent color"
                      />
                      <input
                        type="text"
                        value={settings.accentColor}
                        onChange={(e) => handleSelect('accentColor', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                        placeholder="Enter hex color code"
                        aria-label="Accent color hex code"
                        title="Enter accent color hex code"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Layout Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2 text-[#347dc4]" />
                Layout Settings
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Sidebar Position</label>
                    <p className="text-xs text-gray-500">Position of the navigation sidebar</p>
                    <select
                      value={settings.sidebarPosition}
                      onChange={(e) => handleSelect('sidebarPosition', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Select sidebar position"
                      title="Select sidebar position"
                    >
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Density</label>
                    <p className="text-xs text-gray-500">Spacing and sizing of interface elements</p>
                    <select
                      value={settings.density}
                      onChange={(e) => handleSelect('density', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Select density"
                      title="Select density"
                    >
                      <option value="comfortable">Comfortable</option>
                      <option value="compact">Compact</option>
                      <option value="spacious">Spacious</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Compact Mode</label>
                      <p className="text-xs text-gray-500">Use compact spacing throughout the interface</p>
                    </div>
                    <button
                      onClick={() => handleToggle('compactMode')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.compactMode ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Sidebar Collapsed</label>
                      <p className="text-xs text-gray-500">Start with sidebar collapsed by default</p>
                    </div>
                    <button
                      onClick={() => handleToggle('sidebarCollapsed')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.sidebarCollapsed ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Display Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Display Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Show Animations</label>
                      <p className="text-xs text-gray-500">Enable smooth transitions and animations</p>
                    </div>
                    <button
                      onClick={() => handleToggle('showAnimations')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.showAnimations ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Show Tooltips</label>
                      <p className="text-xs text-gray-500">Display helpful tooltips on hover</p>
                    </div>
                    <button
                      onClick={() => handleToggle('showTooltips')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.showTooltips ? (
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
                      <label className="text-sm font-medium text-gray-900">Show Breadcrumbs</label>
                      <p className="text-xs text-gray-500">Display navigation breadcrumbs</p>
                    </div>
                    <button
                      onClick={() => handleToggle('showBreadcrumbs')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.showBreadcrumbs ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Show Page Numbers</label>
                      <p className="text-xs text-gray-500">Display page numbers in lists</p>
                    </div>
                    <button
                      onClick={() => handleToggle('showPageNumbers')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.showPageNumbers ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Default Dashboard View</label>
                    <p className="text-xs text-gray-500">Default view when accessing dashboard</p>
                    <select
                      value={settings.defaultDashboardView}
                      onChange={(e) => handleSelect('defaultDashboardView', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Select default dashboard view"
                      title="Select default dashboard view"
                    >
                      <option value="overview">Overview</option>
                      <option value="analytics">Analytics</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Items Per Page</label>
                    <p className="text-xs text-gray-500">Default number of items per page</p>
                    <select
                      value={settings.itemsPerPage}
                      onChange={(e) => handleSelect('itemsPerPage', parseInt(e.target.value))}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Select items per page"
                      title="Select items per page"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Show Quick Actions</label>
                      <p className="text-xs text-gray-500">Display quick action buttons on dashboard</p>
                    </div>
                    <button
                      onClick={() => handleToggle('showQuickActions')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.showQuickActions ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Show Recent Activity</label>
                      <p className="text-xs text-gray-500">Display recent activity feed</p>
                    </div>
                    <button
                      onClick={() => handleToggle('showRecentActivity')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.showRecentActivity ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Show Upcoming Events</label>
                      <p className="text-xs text-gray-500">Display upcoming events widget</p>
                    </div>
                    <button
                      onClick={() => handleToggle('showUpcomingEvents')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.showUpcomingEvents ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Font Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Font Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-900">Font Family</label>
                  <p className="text-xs text-gray-500">Choose your preferred font</p>
                  <select
                    value={settings.fontFamily}
                    onChange={(e) => handleSelect('fontFamily', e.target.value)}
                    className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    aria-label="Select font family"
                    title="Select font family"
                  >
                    <option value="system">System Default</option>
                    <option value="inter">Inter</option>
                    <option value="roboto">Roboto</option>
                    <option value="open-sans">Open Sans</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-900">Font Size</label>
                  <p className="text-xs text-gray-500">Base font size</p>
                  <select
                    value={settings.fontSize}
                    onChange={(e) => handleSelect('fontSize', e.target.value)}
                    className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    aria-label="Select font size"
                    title="Select font size"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-900">Font Weight</label>
                  <p className="text-xs text-gray-500">Font weight for text</p>
                  <select
                    value={settings.fontWeight}
                    onChange={(e) => handleSelect('fontWeight', e.target.value)}
                    className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                    aria-label="Select font weight"
                    title="Select font weight"
                  >
                    <option value="normal">Normal</option>
                    <option value="medium">Medium</option>
                    <option value="semibold">Semibold</option>
                  </select>
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
