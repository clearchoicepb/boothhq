'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSettings } from '@/lib/settings-context';
import { ColorPicker } from '@/components/ui/color-picker';
import { equipmentCategoryService } from '@/lib/api/services/equipmentCategoryService';
import { consumableService } from '@/lib/api/services/consumableService';
import type { EquipmentCategory } from '@/lib/api/services/equipmentCategoryService';
import type { ConsumableWithStatus } from '@/lib/api/services/consumableService';
import { createLogger } from '@/lib/logger'

const log = createLogger('inventory')
import {
  ArrowLeft,
  Package,
  Settings,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  Save,
  Loader2
} from 'lucide-react';

interface InventorySettings {
  // Display Settings
  defaultView: 'table' | 'cards' | 'grid';
  itemsPerPage: number;
  showPhotos: boolean;
  showCost: boolean;
  showLocation: boolean;
  showStatus: boolean;
  showLastMaintenance: boolean;

  // Field Settings
  requiredFields: {
    name: boolean;
    category: boolean;
    serialNumber: boolean;
    cost: boolean;
    location: boolean;
    status: boolean;
    purchaseDate: boolean;
    warrantyExpiry: boolean;
  };

  // Automation Settings
  autoTrackUsage: boolean;
  maintenanceReminders: boolean;
  lowStockAlerts: boolean;
  autoGenerateMaintenanceTasks: boolean;

  // Maintenance Settings
  defaultMaintenanceInterval: number;
  maintenanceReminderDays: number;
  requireMaintenanceNotes: boolean;

  // Location Settings
  trackLocation: boolean;
  requireLocationForCheckout: boolean;
  autoUpdateLocation: boolean;

  // Cost Settings
  trackCosts: boolean;
  showCostInLists: boolean;
  requireCostForNewItems: boolean;
}

export default function InventorySettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { settings: globalSettings, updateSettings, loading: settingsLoading } = useSettings();

  const [saving, setSaving] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingConsumables, setLoadingConsumables] = useState(true);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [consumables, setConsumables] = useState<ConsumableWithStatus[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  const [settings, setSettings] = useState<InventorySettings>({
    defaultView: 'table',
    itemsPerPage: 25,
    showPhotos: true,
    showCost: true,
    showLocation: true,
    showStatus: true,
    showLastMaintenance: false,

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

    autoTrackUsage: true,
    maintenanceReminders: true,
    lowStockAlerts: true,
    autoGenerateMaintenanceTasks: false,

    defaultMaintenanceInterval: 90,
    maintenanceReminderDays: 7,
    requireMaintenanceNotes: true,

    trackLocation: true,
    requireLocationForCheckout: false,
    autoUpdateLocation: false,

    trackCosts: true,
    showCostInLists: false,
    requireCostForNewItems: false
  });

  // Load categories from API
  useEffect(() => {
    loadCategories();
  }, []);

  // Load consumables from API
  useEffect(() => {
    loadConsumables();
  }, []);

  // Load settings from global context
  useEffect(() => {
    if (globalSettings.inventory) {
      setSettings(prev => ({
        ...prev,
        ...globalSettings.inventory,
        requiredFields: {
          ...prev.requiredFields,
          ...globalSettings.inventory.requiredFields
        }
      }));
    }
  }, [globalSettings, settingsLoading]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await equipmentCategoryService.list({
        sort_by: 'sort_order',
        sort_order: 'asc'
      });
      setCategories(data);
    } catch (error) {
      log.error({ error }, 'Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadConsumables = async () => {
    try {
      setLoadingConsumables(true);
      const data = await consumableService.list();
      setConsumables(data);
    } catch (error) {
      log.error({ error }, 'Failed to load consumables');
    } finally {
      setLoadingConsumables(false);
    }
  };

  const handleToggle = (path: string) => {
    setSettings(prev => {
      const keys = path.split('.');
      const newSettings = { ...prev };
      let current: any = newSettings;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = !current[keys[keys.length - 1]];
      return newSettings;
    });
  };

  const handleSelect = (path: string, value: string | number | boolean) => {
    setSettings(prev => {
      const keys = path.split('.');
      const newSettings = { ...prev };
      let current: any = newSettings;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const handleAddCategory = async () => {
    try {
      const newCategory = await equipmentCategoryService.create({
        name: 'New Category',
        description: 'Custom equipment category',
        color: '#6B7280',
        enabled: true,
        requires_maintenance: false,
        maintenance_interval_days: 90,
        sort_order: categories.length
      });
      setCategories([...categories, newCategory]);
      setEditingCategory(newCategory.id);
    } catch (error) {
      log.error({ error }, 'Failed to create category');
      alert('Failed to create category. Please try again.');
    }
  };

  const handleUpdateCategory = async (id: string, updates: Partial<EquipmentCategory>) => {
    try {
      const updated = await equipmentCategoryService.update(id, updates);
      setCategories(categories.map(cat => cat.id === id ? updated : cat));
    } catch (error) {
      log.error({ error }, 'Failed to update category');
      alert('Failed to update category. Please try again.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This cannot be undone if items are assigned to it.')) {
      return;
    }

    try {
      await equipmentCategoryService.delete(id);
      setCategories(categories.filter(cat => cat.id !== id));
    } catch (error: any) {
      log.error({ error }, 'Failed to delete category');
      alert(error.message || 'Failed to delete category. It may have items assigned to it.');
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...globalSettings,
        inventory: settings
      });
      alert('Settings saved successfully!');
    } catch (error) {
      log.error({ error }, 'Error saving settings');
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (settingsLoading || loadingCategories) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-[#347dc4] mx-auto mb-4" />
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
                onClick={handleAddCategory}
                className="flex items-center px-3 py-2 bg-[#347dc4] text-white rounded-md hover:bg-[#2c6ba8] transition-colors duration-150"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </button>
            </div>

            <div className="space-y-4">
              {categories.filter(cat => !cat.is_consumable).map((category) => (
                <div key={category.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500">Category Name</label>
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => handleUpdateCategory(category.id, { name: e.target.value })}
                        className="text-sm font-medium text-gray-900 bg-transparent border border-gray-300 rounded px-2 py-1 w-full"
                        placeholder="Enter category name"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Description</label>
                      <input
                        type="text"
                        value={category.description || ''}
                        onChange={(e) => handleUpdateCategory(category.id, { description: e.target.value })}
                        className="text-sm text-gray-900 bg-transparent border border-gray-300 rounded px-2 py-1 w-full"
                        placeholder="Enter category description"
                      />
                    </div>
                    <ColorPicker
                      label="Category Color"
                      value={category.color}
                      onChange={(color) => handleUpdateCategory(category.id, { color })}
                    />
                    <div>
                      <label className="text-xs text-gray-500">Maintenance Interval (days)</label>
                      <input
                        type="number"
                        min="1"
                        value={category.maintenance_interval_days}
                        onChange={(e) => handleUpdateCategory(category.id, { maintenance_interval_days: parseInt(e.target.value) || 90 })}
                        className="text-sm text-gray-900 bg-transparent border border-gray-300 rounded px-2 py-1 w-full"
                        placeholder="90"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs text-gray-500">Requires Maintenance</label>
                        <button
                          onClick={() => handleUpdateCategory(category.id, { requires_maintenance: !category.requires_maintenance })}
                          className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150 ml-2"
                        >
                          {category.requires_maintenance ? (
                            <ToggleRight className="h-6 w-6" />
                          ) : (
                            <ToggleLeft className="h-6 w-6" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors duration-150"
                        title="Delete category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Consumables Section - To be expanded in next phase */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Consumables</h2>
            <p className="text-sm text-gray-600 mb-4">
              Manage consumable inventory like media and paper. Track usage and get low stock alerts.
            </p>
            {loadingConsumables ? (
              <div className="text-center py-4">
                <Loader2 className="animate-spin h-6 w-6 text-[#347dc4] mx-auto" />
              </div>
            ) : consumables.length > 0 ? (
              <div className="space-y-3">
                {consumables.map(consumable => (
                  <div key={consumable.id} className="p-3 border border-gray-200 rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{consumable.category?.name}</p>
                        <p className="text-sm text-gray-600">
                          Stock: {consumable.current_quantity} {consumable.unit_of_measure}
                          {consumable.estimated_events_remaining !== Infinity && (
                            <span className="ml-2 text-xs">
                              (~{consumable.estimated_events_remaining} events remaining)
                            </span>
                          )}
                        </p>
                      </div>
                      {consumable.is_low_stock && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                          Low Stock
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No consumables configured yet.</p>
            )}
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
              className="flex items-center px-6 py-2 bg-[#347dc4] text-white rounded-md hover:bg-[#2c6ba8] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
