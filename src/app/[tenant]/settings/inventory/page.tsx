'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSettings } from '@/lib/settings-context';
import { 
  ArrowLeft,
  Package,
  Settings,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  Edit3
} from 'lucide-react';

interface EquipmentCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  enabled: boolean;
  requiresMaintenance: boolean;
  maintenanceInterval: number; // in days
  autoTrackUsage: boolean;
}

interface InventorySettings {
  // Display Settings
  defaultView: 'table' | 'cards' | 'grid';
  itemsPerPage: number;
  showPhotos: true;
  showCost: true;
  showLocation: true;
  showStatus: true;
  showLastMaintenance: false;
  
  // Equipment Categories
  categories: EquipmentCategory[];
  
  // Field Settings
  requiredFields: {
    name: true;
    category: true;
    serialNumber: false;
    cost: false;
    location: false;
    status: true;
    purchaseDate: false;
    warrantyExpiry: false;
  };
  
  // Automation Settings
  autoTrackUsage: true;
  maintenanceReminders: true;
  lowStockAlerts: true;
  autoGenerateMaintenanceTasks: false;
  
  // Maintenance Settings
  defaultMaintenanceInterval: 90; // days
  maintenanceReminderDays: 7; // days before due
  requireMaintenanceNotes: true;
  
  // Location Settings
  trackLocation: true;
  requireLocationForCheckout: false;
  autoUpdateLocation: false;
  
  // Cost Settings
  trackCosts: true;
  showCostInLists: false;
  requireCostForNewItems: false;
}

export default function InventorySettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { settings: globalSettings, updateSettings, loading: settingsLoading } = useSettings();
  
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<InventorySettings>({
    // Display Settings
    defaultView: 'table',
    itemsPerPage: 25,
    showPhotos: true,
    showCost: true,
    showLocation: true,
    showStatus: true,
    showLastMaintenance: false,
    
    // Equipment Categories
    categories: [
      {
        id: 'photo_booth',
        name: 'Photo Booth',
        description: 'Photo booth equipment and accessories',
        color: 'blue',
        enabled: true,
        requiresMaintenance: true,
        maintenanceInterval: 90,
        autoTrackUsage: true
      },
      {
        id: 'lighting',
        name: 'Lighting',
        description: 'Lighting equipment and accessories',
        color: 'yellow',
        enabled: true,
        requiresMaintenance: true,
        maintenanceInterval: 60,
        autoTrackUsage: true
      },
      {
        id: 'backdrops',
        name: 'Backdrops',
        description: 'Backdrop materials and stands',
        color: 'green',
        enabled: true,
        requiresMaintenance: false,
        maintenanceInterval: 180,
        autoTrackUsage: false
      },
      {
        id: 'props',
        name: 'Props',
        description: 'Photo booth props and accessories',
        color: 'purple',
        enabled: true,
        requiresMaintenance: false,
        maintenanceInterval: 365,
        autoTrackUsage: false
      }
    ],
    
    // Field Settings
    requiredFields: {
      name: true,
      category: true,
      serialNumber: false,
      cost: false,
      location: false,
      status: true,
      purchaseDate: false,
      warrantyExpiry: false
    },
    
    // Automation Settings
    autoTrackUsage: true,
    maintenanceReminders: true,
    lowStockAlerts: true,
    autoGenerateMaintenanceTasks: false,
    
    // Maintenance Settings
    defaultMaintenanceInterval: 90,
    maintenanceReminderDays: 7,
    requireMaintenanceNotes: true,
    
    // Location Settings
    trackLocation: true,
    requireLocationForCheckout: false,
    autoUpdateLocation: false,
    
    // Cost Settings
    trackCosts: true,
    showCostInLists: false,
    requireCostForNewItems: false
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

  const updateCategory = (categoryId: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      categories: prev.categories.map(category => 
        category.id === categoryId ? { ...category, [field]: value } : category
      )
    }));
  };

  const addCategory = () => {
    const newCategory: EquipmentCategory = {
      id: `category_${Date.now()}`,
      name: 'New Category',
      description: 'Custom equipment category',
      color: 'gray',
      enabled: true,
      requiresMaintenance: true,
      maintenanceInterval: 90,
      autoTrackUsage: true
    };
    setSettings(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory]
    }));
  };

  const removeCategory = (categoryId: string) => {
    if (settings.categories.length <= 2) {
      alert('You must have at least 2 categories');
      return;
    }
    setSettings(prev => ({
      ...prev,
      categories: prev.categories.filter(category => category.id !== categoryId)
    }));
  };

  // Load settings from global context
  useEffect(() => {
    if (globalSettings.inventory) {
      setSettings(globalSettings.inventory);
    }
  }, [globalSettings, settingsLoading]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...globalSettings,
        inventory: settings
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
                    <Package className="h-6 w-6 mr-3 text-[#347dc4]" />
                    Inventory Settings
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure equipment categories, maintenance schedules, and tracking settings
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
                    <p className="text-xs text-gray-500">How inventory items are displayed by default</p>
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
                    <option value="grid">Grid View</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Show Cost</label>
                    <p className="text-xs text-gray-500">Display cost information in inventory lists</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showCost')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showCost ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Show Location</label>
                    <p className="text-xs text-gray-500">Display location information in inventory lists</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showLocation')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showLocation ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Show Last Maintenance</label>
                    <p className="text-xs text-gray-500">Display last maintenance date in inventory lists</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showLastMaintenance')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showLastMaintenance ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Equipment Categories */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Equipment Categories</h2>
                <button
                  onClick={addCategory}
                  className="flex items-center px-3 py-2 bg-[#347dc4] text-white rounded-md hover:bg-[#2c6ba8] transition-colors duration-150"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </button>
              </div>
              
              <div className="space-y-4">
                {settings.categories.map((category) => (
                  <div key={category.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-gray-500">Category Name</label>
                        <input
                          type="text"
                          value={category.name}
                          onChange={(e) => updateCategory(category.id, 'name', e.target.value)}
                          className="text-sm font-medium text-gray-900 bg-transparent border border-gray-300 rounded px-2 py-1 w-full"
                          aria-label="Category name"
                          title="Enter category name"
                          placeholder="Enter category name"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Description</label>
                        <input
                          type="text"
                          value={category.description}
                          onChange={(e) => updateCategory(category.id, 'description', e.target.value)}
                          className="text-sm text-gray-900 bg-transparent border border-gray-300 rounded px-2 py-1 w-full"
                          aria-label="Category description"
                          title="Enter category description"
                          placeholder="Enter category description"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Maintenance Interval (days)</label>
                        <input
                          type="number"
                          min="1"
                          value={category.maintenanceInterval}
                          onChange={(e) => updateCategory(category.id, 'maintenanceInterval', parseInt(e.target.value) || 90)}
                          className="text-sm text-gray-900 bg-transparent border border-gray-300 rounded px-2 py-1 w-full"
                          aria-label="Maintenance interval in days"
                          title="Enter maintenance interval in days"
                          placeholder="90"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs text-gray-500">Requires Maintenance</label>
                          <button
                            onClick={() => updateCategory(category.id, 'requiresMaintenance', !category.requiresMaintenance)}
                            className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150 ml-2"
                          >
                            {category.requiresMaintenance ? (
                              <ToggleRight className="h-6 w-6" />
                            ) : (
                              <ToggleLeft className="h-6 w-6" />
                            )}
                          </button>
                        </div>
                        <button 
                          onClick={() => removeCategory(category.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors duration-150"
                          aria-label="Remove category"
                          title="Remove category"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
                      <p className="text-xs text-gray-500">Make this field required when creating inventory items</p>
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

            {/* Maintenance Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Default Maintenance Interval (days)</label>
                    <p className="text-xs text-gray-500">Default maintenance interval for new items</p>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={settings.defaultMaintenanceInterval}
                      onChange={(e) => handleSelect('defaultMaintenanceInterval', parseInt(e.target.value) || 90)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Default maintenance interval in days"
                      title="Enter default maintenance interval in days"
                      placeholder="90"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Maintenance Reminder Days</label>
                    <p className="text-xs text-gray-500">Days before maintenance due to send reminder</p>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={settings.maintenanceReminderDays}
                      onChange={(e) => handleSelect('maintenanceReminderDays', parseInt(e.target.value) || 7)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Maintenance reminder days"
                      title="Enter maintenance reminder days"
                      placeholder="7"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Maintenance Reminders</label>
                      <p className="text-xs text-gray-500">Send email reminders for maintenance</p>
                    </div>
                    <button
                      onClick={() => handleToggle('maintenanceReminders')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.maintenanceReminders ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Require Maintenance Notes</label>
                      <p className="text-xs text-gray-500">Require notes when completing maintenance</p>
                    </div>
                    <button
                      onClick={() => handleToggle('requireMaintenanceNotes')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.requireMaintenanceNotes ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
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
                    <label className="text-sm font-medium text-gray-900">Auto Track Usage</label>
                    <p className="text-xs text-gray-500">Automatically track equipment usage during events</p>
                  </div>
                  <button
                    onClick={() => handleToggle('autoTrackUsage')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.autoTrackUsage ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Low Stock Alerts</label>
                    <p className="text-xs text-gray-500">Send alerts when inventory is low</p>
                  </div>
                  <button
                    onClick={() => handleToggle('lowStockAlerts')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.lowStockAlerts ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Auto Generate Maintenance Tasks</label>
                    <p className="text-xs text-gray-500">Automatically create maintenance tasks</p>
                  </div>
                  <button
                    onClick={() => handleToggle('autoGenerateMaintenanceTasks')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.autoGenerateMaintenanceTasks ? (
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
