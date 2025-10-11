'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSettings } from '@/lib/settings-context';
import { 
  ArrowLeft,
  Bell,
  Settings,
  ToggleLeft,
  ToggleRight,
  Mail,
  Smartphone,
  Clock
} from 'lucide-react';

interface NotificationSettings {
  // Email Notifications
  emailNotifications: {
    newLead: boolean;
    newContact: boolean;
    newOpportunity: boolean;
    newEvent: boolean;
    eventReminder: boolean;
    paymentReceived: boolean;
    invoiceOverdue: boolean;
    maintenanceDue: boolean;
    systemAlerts: boolean;
  };
  
  // Push Notifications
  pushNotifications: {
    newLead: boolean;
    newContact: boolean;
    newOpportunity: boolean;
    newEvent: boolean;
    eventReminder: boolean;
    paymentReceived: boolean;
    invoiceOverdue: boolean;
    maintenanceDue: boolean;
    systemAlerts: boolean;
  };
  
  // SMS Notifications
  smsNotifications: {
    eventReminder: boolean;
    paymentReceived: boolean;
    invoiceOverdue: boolean;
    maintenanceDue: boolean;
    systemAlerts: boolean;
  };
  
  // Reminder Settings
  reminderSettings: {
    eventReminderDays: number[];
    paymentReminderDays: number[];
    maintenanceReminderDays: number[];
    followUpReminderDays: number[];
  };
  
  // Email Settings
  emailSettings: {
    sendFromName: string;
    sendFromEmail: string;
    replyToEmail: string;
    includeSignature: boolean;
    emailSignature: string;
  };
  
  // Notification Preferences
  notificationPreferences: {
    quietHours: boolean;
    quietStartTime: string;
    quietEndTime: string;
    weekendNotifications: boolean;
    digestEmails: boolean;
    digestFrequency: 'daily' | 'weekly' | 'monthly';
  };
}

export default function NotificationsSettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { settings: globalSettings, updateSettings, loading: settingsLoading } = useSettings();
  
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    // Email Notifications
    emailNotifications: {
      newLead: true,
      newContact: true,
      newOpportunity: true,
      newEvent: true,
      eventReminder: true,
      paymentReceived: true,
      invoiceOverdue: true,
      maintenanceDue: true,
      systemAlerts: true
    },
    
    // Push Notifications
    pushNotifications: {
      newLead: true,
      newContact: false,
      newOpportunity: true,
      newEvent: true,
      eventReminder: true,
      paymentReceived: true,
      invoiceOverdue: true,
      maintenanceDue: true,
      systemAlerts: true
    },
    
    // SMS Notifications
    smsNotifications: {
      eventReminder: false,
      paymentReceived: false,
      invoiceOverdue: true,
      maintenanceDue: false,
      systemAlerts: false
    },
    
    // Reminder Settings
    reminderSettings: {
      eventReminderDays: [7, 3, 1],
      paymentReminderDays: [7, 3, 1],
      maintenanceReminderDays: [14, 7, 1],
      followUpReminderDays: [3, 7, 14]
    },
    
    // Email Settings
    emailSettings: {
      sendFromName: '',
      sendFromEmail: '',
      replyToEmail: '',
      includeSignature: true,
      emailSignature: 'Best regards,\nYour CRM Team'
    },
    
    // Notification Preferences
    notificationPreferences: {
      quietHours: false,
      quietStartTime: '22:00',
      quietEndTime: '08:00',
      weekendNotifications: true,
      digestEmails: false,
      digestFrequency: 'weekly'
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
    if (globalSettings.notifications) {
      setSettings(globalSettings.notifications);
    }
  }, [globalSettings, settingsLoading]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...globalSettings,
        notifications: settings
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
                    <Bell className="h-6 w-6 mr-3 text-[#347dc4]" />
                    Notifications Settings
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure email alerts, reminders, and notification preferences
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-8">
            
            {/* Email Notifications */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Mail className="h-5 w-5 mr-2 text-[#347dc4]" />
                Email Notifications
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">New Lead</label>
                      <p className="text-xs text-gray-500">Email when a new lead is created</p>
                    </div>
                    <button
                      onClick={() => handleToggle('emailNotifications.newLead')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.emailNotifications.newLead ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">New Contact</label>
                      <p className="text-xs text-gray-500">Email when a new contact is added</p>
                    </div>
                    <button
                      onClick={() => handleToggle('emailNotifications.newContact')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.emailNotifications.newContact ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">New Opportunity</label>
                      <p className="text-xs text-gray-500">Email when a new opportunity is created</p>
                    </div>
                    <button
                      onClick={() => handleToggle('emailNotifications.newOpportunity')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.emailNotifications.newOpportunity ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">New Event</label>
                      <p className="text-xs text-gray-500">Email when a new event is scheduled</p>
                    </div>
                    <button
                      onClick={() => handleToggle('emailNotifications.newEvent')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.emailNotifications.newEvent ? (
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
                      <label className="text-sm font-medium text-gray-900">Event Reminders</label>
                      <p className="text-xs text-gray-500">Email reminders before events</p>
                    </div>
                    <button
                      onClick={() => handleToggle('emailNotifications.eventReminder')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.emailNotifications.eventReminder ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Payment Received</label>
                      <p className="text-xs text-gray-500">Email when payment is received</p>
                    </div>
                    <button
                      onClick={() => handleToggle('emailNotifications.paymentReceived')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.emailNotifications.paymentReceived ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Invoice Overdue</label>
                      <p className="text-xs text-gray-500">Email when invoice becomes overdue</p>
                    </div>
                    <button
                      onClick={() => handleToggle('emailNotifications.invoiceOverdue')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.emailNotifications.invoiceOverdue ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Maintenance Due</label>
                      <p className="text-xs text-gray-500">Email when maintenance is due</p>
                    </div>
                    <button
                      onClick={() => handleToggle('emailNotifications.maintenanceDue')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.emailNotifications.maintenanceDue ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Push Notifications */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Smartphone className="h-5 w-5 mr-2 text-[#347dc4]" />
                Push Notifications
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">New Lead</label>
                      <p className="text-xs text-gray-500">Push notification for new leads</p>
                    </div>
                    <button
                      onClick={() => handleToggle('pushNotifications.newLead')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.pushNotifications.newLead ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">New Opportunity</label>
                      <p className="text-xs text-gray-500">Push notification for new opportunities</p>
                    </div>
                    <button
                      onClick={() => handleToggle('pushNotifications.newOpportunity')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.pushNotifications.newOpportunity ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">New Event</label>
                      <p className="text-xs text-gray-500">Push notification for new events</p>
                    </div>
                    <button
                      onClick={() => handleToggle('pushNotifications.newEvent')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.pushNotifications.newEvent ? (
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
                      <label className="text-sm font-medium text-gray-900">Event Reminders</label>
                      <p className="text-xs text-gray-500">Push notification for event reminders</p>
                    </div>
                    <button
                      onClick={() => handleToggle('pushNotifications.eventReminder')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.pushNotifications.eventReminder ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Payment Received</label>
                      <p className="text-xs text-gray-500">Push notification for payments</p>
                    </div>
                    <button
                      onClick={() => handleToggle('pushNotifications.paymentReceived')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.pushNotifications.paymentReceived ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">System Alerts</label>
                      <p className="text-xs text-gray-500">Push notification for system alerts</p>
                    </div>
                    <button
                      onClick={() => handleToggle('pushNotifications.systemAlerts')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.pushNotifications.systemAlerts ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Reminder Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-[#347dc4]" />
                Reminder Settings
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Event Reminder Days</label>
                    <p className="text-xs text-gray-500">Days before event to send reminders</p>
                    <input
                      type="text"
                      value={settings.reminderSettings.eventReminderDays.join(', ')}
                      onChange={(e) => {
                        const days = e.target.value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
                        handleSelect('reminderSettings.eventReminderDays', days as any);
                      }}
                      placeholder="7, 3, 1"
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Event reminder days"
                      title="Enter event reminder days (comma-separated)"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Payment Reminder Days</label>
                    <p className="text-xs text-gray-500">Days before due date to send payment reminders</p>
                    <input
                      type="text"
                      value={settings.reminderSettings.paymentReminderDays.join(', ')}
                      onChange={(e) => {
                        const days = e.target.value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
                        handleSelect('reminderSettings.paymentReminderDays', days as any);
                      }}
                      placeholder="7, 3, 1"
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Payment reminder days"
                      title="Enter payment reminder days (comma-separated)"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Maintenance Reminder Days</label>
                    <p className="text-xs text-gray-500">Days before maintenance due to send reminders</p>
                    <input
                      type="text"
                      value={settings.reminderSettings.maintenanceReminderDays.join(', ')}
                      onChange={(e) => {
                        const days = e.target.value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
                        handleSelect('reminderSettings.maintenanceReminderDays', days as any);
                      }}
                      placeholder="14, 7, 1"
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Maintenance reminder days"
                      title="Enter maintenance reminder days (comma-separated)"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Follow-up Reminder Days</label>
                    <p className="text-xs text-gray-500">Days after contact to send follow-up reminders</p>
                    <input
                      type="text"
                      value={settings.reminderSettings.followUpReminderDays.join(', ')}
                      onChange={(e) => {
                        const days = e.target.value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
                        handleSelect('reminderSettings.followUpReminderDays', days as any);
                      }}
                      placeholder="3, 7, 14"
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Follow-up reminder days"
                      title="Enter follow-up reminder days (comma-separated)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Quiet Hours</label>
                      <p className="text-xs text-gray-500">Disable notifications during quiet hours</p>
                    </div>
                    <button
                      onClick={() => handleToggle('notificationPreferences.quietHours')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.notificationPreferences.quietHours ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  {settings.notificationPreferences.quietHours && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Quiet Start Time</label>
                        <input
                          type="time"
                          value={settings.notificationPreferences.quietStartTime}
                          onChange={(e) => handleSelect('notificationPreferences.quietStartTime', e.target.value)}
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                          aria-label="Quiet start time"
                          title="Select quiet start time"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-900">Quiet End Time</label>
                        <input
                          type="time"
                          value={settings.notificationPreferences.quietEndTime}
                          onChange={(e) => handleSelect('notificationPreferences.quietEndTime', e.target.value)}
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                          aria-label="Quiet end time"
                          title="Select quiet end time"
                        />
                      </div>
                    </>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Weekend Notifications</label>
                      <p className="text-xs text-gray-500">Send notifications on weekends</p>
                    </div>
                    <button
                      onClick={() => handleToggle('notificationPreferences.weekendNotifications')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.notificationPreferences.weekendNotifications ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Digest Emails</label>
                      <p className="text-xs text-gray-500">Send summary emails instead of individual notifications</p>
                    </div>
                    <button
                      onClick={() => handleToggle('notificationPreferences.digestEmails')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.notificationPreferences.digestEmails ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  {settings.notificationPreferences.digestEmails && (
                    <div>
                      <label className="text-sm font-medium text-gray-900">Digest Frequency</label>
                      <select
                        value={settings.notificationPreferences.digestFrequency}
                        onChange={(e) => handleSelect('notificationPreferences.digestFrequency', e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                        aria-label="Select digest frequency"
                        title="Select digest frequency"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  )}
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
