'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSettings } from '@/lib/settings-context';
import { createLogger } from '@/lib/logger'
import toast from 'react-hot-toast'

const log = createLogger('data')
import { 
  ArrowLeft,
  Database,
  Settings,
  ToggleLeft,
  ToggleRight,
  Download,
  Upload,
  Trash2,
  Calendar
} from 'lucide-react';

interface DataManagementSettings {
  // Backup Settings
  backupSettings: {
    autoBackupEnabled: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    backupRetentionDays: number;
    includeAttachments: boolean;
    backupLocation: 'cloud' | 'local' | 'both';
  };
  
  // Import/Export Settings
  importExportSettings: {
    allowDataImport: boolean;
    allowDataExport: boolean;
    requireApprovalForImport: boolean;
    requireApprovalForExport: boolean;
    maxFileSizeMB: number;
    supportedFormats: string[];
  };
  
  // Data Retention
  dataRetention: {
    autoDeleteEnabled: boolean;
    deleteInactiveUsersAfterDays: number;
    deleteOldEventsAfterDays: number;
    deleteOldContactsAfterDays: number;
    deleteAuditLogsAfterDays: number;
  };
  
  // Archive Settings
  archiveSettings: {
    archiveOldData: boolean;
    archiveAfterDays: number;
    archiveLocation: string;
    compressArchives: boolean;
  };
}

export default function DataManagementSettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { settings: globalSettings, updateSettings, loading: settingsLoading } = useSettings();
  
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<DataManagementSettings>({
    // Backup Settings
    backupSettings: {
      autoBackupEnabled: true,
      backupFrequency: 'daily',
      backupRetentionDays: 30,
      includeAttachments: true,
      backupLocation: 'cloud'
    },
    
    // Import/Export Settings
    importExportSettings: {
      allowDataImport: true,
      allowDataExport: true,
      requireApprovalForImport: false,
      requireApprovalForExport: false,
      maxFileSizeMB: 100,
      supportedFormats: ['csv', 'xlsx', 'json']
    },
    
    // Data Retention
    dataRetention: {
      autoDeleteEnabled: false,
      deleteInactiveUsersAfterDays: 365,
      deleteOldEventsAfterDays: 1095, // 3 years
      deleteOldContactsAfterDays: 2555, // 7 years
      deleteAuditLogsAfterDays: 1095 // 3 years
    },
    
    // Archive Settings
    archiveSettings: {
      archiveOldData: true,
      archiveAfterDays: 365,
      archiveLocation: 'cloud-storage',
      compressArchives: true
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
    if (globalSettings.dataManagement) {
      setSettings(globalSettings.dataManagement);
    }
  }, [globalSettings, settingsLoading]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...globalSettings,
        dataManagement: settings
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
                    <Database className="h-6 w-6 mr-3 text-[#347dc4]" />
                    Data Management Settings
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Import/export data, backup settings, and data retention policies
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-8">
            
            {/* Backup Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Database className="h-5 w-5 mr-2 text-[#347dc4]" />
                Backup Settings
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Auto Backup</label>
                      <p className="text-xs text-gray-500">Automatically backup data</p>
                    </div>
                    <button
                      onClick={() => handleToggle('backupSettings.autoBackupEnabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.backupSettings.autoBackupEnabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Backup Frequency</label>
                    <p className="text-xs text-gray-500">How often to create backups</p>
                    <select
                      value={settings.backupSettings.backupFrequency}
                      onChange={(e) => handleSelect('backupSettings.backupFrequency', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Select backup frequency"
                      title="Select backup frequency"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Backup Retention (Days)</label>
                    <p className="text-xs text-gray-500">Days to keep backup files</p>
                    <input
                      type="number"
                      min="7"
                      max="365"
                      value={settings.backupSettings.backupRetentionDays}
                      onChange={(e) => handleSelect('backupSettings.backupRetentionDays', parseInt(e.target.value) || 30)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Backup retention days"
                      title="Enter backup retention days"
                      placeholder="30"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Include Attachments</label>
                      <p className="text-xs text-gray-500">Include file attachments in backups</p>
                    </div>
                    <button
                      onClick={() => handleToggle('backupSettings.includeAttachments')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.backupSettings.includeAttachments ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Backup Location</label>
                    <p className="text-xs text-gray-500">Where to store backup files</p>
                    <select
                      value={settings.backupSettings.backupLocation}
                      onChange={(e) => handleSelect('backupSettings.backupLocation', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Select backup location"
                      title="Select backup location"
                    >
                      <option value="cloud">Cloud Storage</option>
                      <option value="local">Local Storage</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Import/Export Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Download className="h-5 w-5 mr-2 text-[#347dc4]" />
                Import/Export Settings
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Allow Data Import</label>
                      <p className="text-xs text-gray-500">Allow users to import data</p>
                    </div>
                    <button
                      onClick={() => handleToggle('importExportSettings.allowDataImport')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.importExportSettings.allowDataImport ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Allow Data Export</label>
                      <p className="text-xs text-gray-500">Allow users to export data</p>
                    </div>
                    <button
                      onClick={() => handleToggle('importExportSettings.allowDataExport')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.importExportSettings.allowDataExport ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Max File Size (MB)</label>
                    <p className="text-xs text-gray-500">Maximum file size for imports/exports</p>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={settings.importExportSettings.maxFileSizeMB}
                      onChange={(e) => handleSelect('importExportSettings.maxFileSizeMB', parseInt(e.target.value) || 100)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Maximum file size in MB"
                      title="Enter maximum file size in MB"
                      placeholder="100"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Require Import Approval</label>
                      <p className="text-xs text-gray-500">Require admin approval for imports</p>
                    </div>
                    <button
                      onClick={() => handleToggle('importExportSettings.requireApprovalForImport')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.importExportSettings.requireApprovalForImport ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Require Export Approval</label>
                      <p className="text-xs text-gray-500">Require admin approval for exports</p>
                    </div>
                    <button
                      onClick={() => handleToggle('importExportSettings.requireApprovalForExport')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.importExportSettings.requireApprovalForExport ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Supported Formats</label>
                    <p className="text-xs text-gray-500">File formats supported for import/export</p>
                    <input
                      type="text"
                      value={settings.importExportSettings.supportedFormats.join(', ')}
                      onChange={(e) => {
                        const formats = e.target.value.split(',').map(f => f.trim()).filter(f => f);
                        handleSelect('importExportSettings.supportedFormats', formats as any);
                      }}
                      placeholder="csv, xlsx, json"
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Supported file formats"
                      title="Enter supported file formats (comma-separated)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Data Retention */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Trash2 className="h-5 w-5 mr-2 text-[#347dc4]" />
                Data Retention
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Auto Delete Enabled</label>
                      <p className="text-xs text-gray-500">Automatically delete old data</p>
                    </div>
                    <button
                      onClick={() => handleToggle('dataRetention.autoDeleteEnabled')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.dataRetention.autoDeleteEnabled ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Delete Inactive Users (Days)</label>
                    <p className="text-xs text-gray-500">Days after last login to delete inactive users</p>
                    <input
                      type="number"
                      min="30"
                      max="1095"
                      value={settings.dataRetention.deleteInactiveUsersAfterDays}
                      onChange={(e) => handleSelect('dataRetention.deleteInactiveUsersAfterDays', parseInt(e.target.value) || 365)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Delete inactive users after days"
                      title="Enter days to delete inactive users"
                      placeholder="365"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Delete Old Events (Days)</label>
                    <p className="text-xs text-gray-500">Days after event completion to delete</p>
                    <input
                      type="number"
                      min="30"
                      max="3650"
                      value={settings.dataRetention.deleteOldEventsAfterDays}
                      onChange={(e) => handleSelect('dataRetention.deleteOldEventsAfterDays', parseInt(e.target.value) || 1095)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Delete old events after days"
                      title="Enter days to delete old events"
                      placeholder="1095"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Delete Old Contacts (Days)</label>
                    <p className="text-xs text-gray-500">Days after last activity to delete contacts</p>
                    <input
                      type="number"
                      min="30"
                      max="3650"
                      value={settings.dataRetention.deleteOldContactsAfterDays}
                      onChange={(e) => handleSelect('dataRetention.deleteOldContactsAfterDays', parseInt(e.target.value) || 2555)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Delete old contacts after days"
                      title="Enter days to delete old contacts"
                      placeholder="2555"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Delete Audit Logs (Days)</label>
                    <p className="text-xs text-gray-500">Days to keep audit log entries</p>
                    <input
                      type="number"
                      min="30"
                      max="3650"
                      value={settings.dataRetention.deleteAuditLogsAfterDays}
                      onChange={(e) => handleSelect('dataRetention.deleteAuditLogsAfterDays', parseInt(e.target.value) || 1095)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Delete audit logs after days"
                      title="Enter days to delete audit logs"
                      placeholder="1095"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Archive Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-[#347dc4]" />
                Archive Settings
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Archive Old Data</label>
                      <p className="text-xs text-gray-500">Archive instead of deleting old data</p>
                    </div>
                    <button
                      onClick={() => handleToggle('archiveSettings.archiveOldData')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.archiveSettings.archiveOldData ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Archive After (Days)</label>
                    <p className="text-xs text-gray-500">Days after creation to archive data</p>
                    <input
                      type="number"
                      min="30"
                      max="3650"
                      value={settings.archiveSettings.archiveAfterDays}
                      onChange={(e) => handleSelect('archiveSettings.archiveAfterDays', parseInt(e.target.value) || 365)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Archive after days"
                      title="Enter days to archive data"
                      placeholder="365"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Archive Location</label>
                    <p className="text-xs text-gray-500">Where to store archived data</p>
                    <select
                      value={settings.archiveSettings.archiveLocation}
                      onChange={(e) => handleSelect('archiveSettings.archiveLocation', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Select archive location"
                      title="Select archive location"
                    >
                      <option value="cloud-storage">Cloud Storage</option>
                      <option value="local-storage">Local Storage</option>
                      <option value="external-drive">External Drive</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Compress Archives</label>
                      <p className="text-xs text-gray-500">Compress archived data to save space</p>
                    </div>
                    <button
                      onClick={() => handleToggle('archiveSettings.compressArchives')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.archiveSettings.compressArchives ? (
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
    
  );
}
