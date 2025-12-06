'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSettings } from '@/lib/settings-context';
import { createLogger } from '@/lib/logger'

const log = createLogger('invoices')
import {
  ArrowLeft,
  FileText,
  Settings,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  DollarSign,
  Hash
} from 'lucide-react';

interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  defaultTemplate: boolean;
  headerText: string;
  footerText: string;
  showLogo: boolean;
  showTerms: boolean;
}

interface InvoiceSettings {
  // Display Settings
  defaultView: 'table' | 'cards' | 'list';
  itemsPerPage: number;
  showPhotos: true;
  showPaymentStatus: true;
  showDueDate: true;
  showAmount: true;
  showCreatedDate: false;
  
  // Invoice Templates
  templates: InvoiceTemplate[];
  
  // Field Settings
  requiredFields: {
    invoiceNumber: true;
    clientName: true;
    clientEmail: true;
    dueDate: true;
    items: true;
    subtotal: true;
    tax: false;
    total: true;
    notes: false;
  };
  
  // Automation Settings
  autoGenerateInvoiceNumber: true;
  autoCalculateTotals: true;
  sendInvoiceEmail: true;
  autoReminderEmails: false;
  autoLateFees: false;
  
  // Payment Settings
  paymentTerms: {
    net15: true;
    net30: true;
    net45: false;
    net60: false;
    dueOnReceipt: true;
    custom: false;
  };
  
  defaultPaymentTerms: 'net30';
  lateFeePercentage: 1.5; // 1.5% per month
  lateFeeGracePeriod: 5; // days
  
  // Tax Settings
  defaultTaxRate: 0; // 0% default
  taxInclusive: false;
  showTaxBreakdown: true;
  
  // Email Settings
  emailSubject: 'Invoice #{invoiceNumber} from {companyName}';
  emailTemplate: 'Thank you for your business. Please find your invoice attached.';
  ccEmails: [];
  
  // Numbering Settings
  invoiceNumberPrefix: 'INV';
  invoiceNumberSuffix: '';
  nextInvoiceNumber: 1001;
  
  // Company Settings
  companyName: '';
  companyAddress: '';
  companyPhone: '';
  companyEmail: '';
  companyWebsite: '';
  companyLogo: '';
}

export default function InvoicesSettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { settings: globalSettings, updateSettings, loading: settingsLoading } = useSettings();
  
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<InvoiceSettings>({
    // Display Settings
    defaultView: 'table',
    itemsPerPage: 25,
    showPhotos: true,
    showPaymentStatus: true,
    showDueDate: true,
    showAmount: true,
    showCreatedDate: false,
    
    // Invoice Templates
    templates: [
      {
        id: 'standard',
        name: 'Standard Invoice',
        description: 'Basic invoice template with company header',
        enabled: true,
        defaultTemplate: true,
        headerText: 'Invoice',
        footerText: 'Thank you for your business!',
        showLogo: true,
        showTerms: true
      },
      {
        id: 'detailed',
        name: 'Detailed Invoice',
        description: 'Detailed invoice with item descriptions and terms',
        enabled: true,
        defaultTemplate: false,
        headerText: 'Invoice',
        footerText: 'Payment is due within 30 days of invoice date.',
        showLogo: true,
        showTerms: true
      }
    ],
    
    // Field Settings
    requiredFields: {
      invoiceNumber: true,
      clientName: true,
      clientEmail: true,
      dueDate: true,
      items: true,
      subtotal: true,
      tax: false,
      total: true,
      notes: false
    },
    
    // Automation Settings
    autoGenerateInvoiceNumber: true,
    autoCalculateTotals: true,
    sendInvoiceEmail: true,
    autoReminderEmails: false,
    autoLateFees: false,
    
    // Payment Settings
    paymentTerms: {
      net15: true,
      net30: true,
      net45: false,
      net60: false,
      dueOnReceipt: true,
      custom: false
    },
    
    defaultPaymentTerms: 'net30',
    lateFeePercentage: 1.5,
    lateFeeGracePeriod: 5,
    
    // Tax Settings
    defaultTaxRate: 0,
    taxInclusive: false,
    showTaxBreakdown: true,
    
    // Email Settings
    emailSubject: 'Invoice #{invoiceNumber} from {companyName}',
    emailTemplate: 'Thank you for your business. Please find your invoice attached.',
    ccEmails: [],
    
    // Numbering Settings
    invoiceNumberPrefix: 'INV',
    invoiceNumberSuffix: '',
    nextInvoiceNumber: 1001,
    
    // Company Settings
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    companyLogo: ''
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

  const updateTemplate = (templateId: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      templates: prev.templates.map(template => 
        template.id === templateId ? { ...template, [field]: value } : template
      )
    }));
  };

  const addTemplate = () => {
    const newTemplate: InvoiceTemplate = {
      id: `template_${Date.now()}`,
      name: 'New Template',
      description: 'Custom invoice template',
      enabled: true,
      defaultTemplate: false,
      headerText: 'Invoice',
      footerText: 'Thank you for your business!',
      showLogo: true,
      showTerms: true
    };
    setSettings(prev => ({
      ...prev,
      templates: [...prev.templates, newTemplate]
    }));
  };

  const removeTemplate = (templateId: string) => {
    if (settings.templates.length <= 1) {
      alert('You must have at least 1 template');
      return;
    }
    setSettings(prev => ({
      ...prev,
      templates: prev.templates.filter(template => template.id !== templateId)
    }));
  };

  // Load settings from global context
  useEffect(() => {
    if (globalSettings.invoices) {
      setSettings(globalSettings.invoices);
    }
  }, [globalSettings, settingsLoading]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...globalSettings,
        invoices: settings
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
                    <FileText className="h-6 w-6 mr-3 text-[#347dc4]" />
                    Invoices Settings
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure invoice templates, payment terms, and billing automation
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-8">

            {/* Invoice Numbering Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Hash className="h-5 w-5 mr-2 text-[#347dc4]" />
                Invoice Numbering
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Invoice Number Prefix</label>
                    <p className="text-xs text-gray-500 mb-1">Text before the invoice number (e.g., "INV")</p>
                    <input
                      type="text"
                      value={settings.invoiceNumberPrefix}
                      onChange={(e) => handleSelect('invoiceNumberPrefix', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                      placeholder="INV"
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-900">Invoice Number Suffix</label>
                    <p className="text-xs text-gray-500 mb-1">Text after the invoice number (optional)</p>
                    <input
                      type="text"
                      value={settings.invoiceNumberSuffix}
                      onChange={(e) => handleSelect('invoiceNumberSuffix', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                      placeholder=""
                      maxLength={10}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-900">Starting Invoice Number</label>
                  <p className="text-xs text-gray-500 mb-1">
                    The next invoice number to use. This allows you to continue from your previous system.
                  </p>
                  <p className="text-xs text-yellow-600 mb-1">
                    ⚠️ Warning: Only change this if you're starting a new sequence or migrating from another system.
                  </p>
                  <input
                    type="number"
                    min="1"
                    value={settings.nextInvoiceNumber}
                    onChange={(e) => handleSelect('nextInvoiceNumber', parseInt(e.target.value) || 1)}
                    className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                    placeholder="1001"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Next invoice will be: {settings.invoiceNumberPrefix}{String(settings.nextInvoiceNumber).padStart(4, '0')}{settings.invoiceNumberSuffix}
                  </p>
                </div>
              </div>
            </div>

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
                    <p className="text-xs text-gray-500">How invoices are displayed by default</p>
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
                    <label className="text-sm font-medium text-gray-900">Show Payment Status</label>
                    <p className="text-xs text-gray-500">Display payment status in invoice lists</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showPaymentStatus')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showPaymentStatus ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Show Due Date</label>
                    <p className="text-xs text-gray-500">Display due date in invoice lists</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showDueDate')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showDueDate ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Show Amount</label>
                    <p className="text-xs text-gray-500">Display invoice amount in lists</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showAmount')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showAmount ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Invoice Templates */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Invoice Templates</h2>
                <button
                  onClick={addTemplate}
                  className="flex items-center px-3 py-2 bg-[#347dc4] text-white rounded-md hover:bg-[#2c6ba8] transition-colors duration-150"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </button>
              </div>
              
              <div className="space-y-4">
                {settings.templates.map((template) => (
                  <div key={template.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-500">Template Name</label>
                        <input
                          type="text"
                          value={template.name}
                          onChange={(e) => updateTemplate(template.id, 'name', e.target.value)}
                          className="text-sm font-medium text-gray-900 bg-transparent border border-gray-300 rounded px-2 py-1 w-full"
                          aria-label="Template name"
                          title="Enter template name"
                          placeholder="Enter template name"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Description</label>
                        <input
                          type="text"
                          value={template.description}
                          onChange={(e) => updateTemplate(template.id, 'description', e.target.value)}
                          className="text-sm text-gray-900 bg-transparent border border-gray-300 rounded px-2 py-1 w-full"
                          aria-label="Template description"
                          title="Enter template description"
                          placeholder="Enter template description"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Header Text</label>
                        <input
                          type="text"
                          value={template.headerText}
                          onChange={(e) => updateTemplate(template.id, 'headerText', e.target.value)}
                          className="text-sm text-gray-900 bg-transparent border border-gray-300 rounded px-2 py-1 w-full"
                          aria-label="Header text"
                          title="Enter header text"
                          placeholder="Enter header text"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Footer Text</label>
                        <input
                          type="text"
                          value={template.footerText}
                          onChange={(e) => updateTemplate(template.id, 'footerText', e.target.value)}
                          className="text-sm text-gray-900 bg-transparent border border-gray-300 rounded px-2 py-1 w-full"
                          aria-label="Footer text"
                          title="Enter footer text"
                          placeholder="Enter footer text"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <label className="text-xs text-gray-500">Show Logo</label>
                            <button
                              onClick={() => updateTemplate(template.id, 'showLogo', !template.showLogo)}
                              className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150 ml-2"
                            >
                              {template.showLogo ? (
                                <ToggleRight className="h-6 w-6" />
                              ) : (
                                <ToggleLeft className="h-6 w-6" />
                              )}
                            </button>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Show Terms</label>
                            <button
                              onClick={() => updateTemplate(template.id, 'showTerms', !template.showTerms)}
                              className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150 ml-2"
                            >
                              {template.showTerms ? (
                                <ToggleRight className="h-6 w-6" />
                              ) : (
                                <ToggleLeft className="h-6 w-6" />
                              )}
                            </button>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeTemplate(template.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors duration-150"
                          aria-label="Remove template"
                          title="Remove template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-[#347dc4]" />
                Payment Settings
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Default Payment Terms</label>
                    <p className="text-xs text-gray-500">Default payment terms for new invoices</p>
                    <select
                      value={settings.defaultPaymentTerms}
                      onChange={(e) => handleSelect('defaultPaymentTerms', e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Select default payment terms"
                      title="Select default payment terms"
                    >
                      <option value="net15">Net 15</option>
                      <option value="net30">Net 30</option>
                      <option value="net45">Net 45</option>
                      <option value="net60">Net 60</option>
                      <option value="dueOnReceipt">Due on Receipt</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Late Fee Percentage</label>
                    <p className="text-xs text-gray-500">Monthly late fee percentage</p>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={settings.lateFeePercentage}
                      onChange={(e) => handleSelect('lateFeePercentage', parseFloat(e.target.value) || 0)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Late fee percentage"
                      title="Enter late fee percentage"
                      placeholder="1.5"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Late Fee Grace Period (days)</label>
                    <p className="text-xs text-gray-500">Days after due date before late fees apply</p>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={settings.lateFeeGracePeriod}
                      onChange={(e) => handleSelect('lateFeeGracePeriod', parseInt(e.target.value) || 0)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-full"
                      aria-label="Late fee grace period in days"
                      title="Enter late fee grace period in days"
                      placeholder="5"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Auto Late Fees</label>
                      <p className="text-xs text-gray-500">Automatically apply late fees</p>
                    </div>
                    <button
                      onClick={() => handleToggle('autoLateFees')}
                      className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                    >
                      {settings.autoLateFees ? (
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
                    <label className="text-sm font-medium text-gray-900">Auto Generate Invoice Number</label>
                    <p className="text-xs text-gray-500">Automatically generate sequential invoice numbers</p>
                  </div>
                  <button
                    onClick={() => handleToggle('autoGenerateInvoiceNumber')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.autoGenerateInvoiceNumber ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Auto Calculate Totals</label>
                    <p className="text-xs text-gray-500">Automatically calculate subtotal, tax, and total</p>
                  </div>
                  <button
                    onClick={() => handleToggle('autoCalculateTotals')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.autoCalculateTotals ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Send Invoice Email</label>
                    <p className="text-xs text-gray-500">Automatically send invoice via email</p>
                  </div>
                  <button
                    onClick={() => handleToggle('sendInvoiceEmail')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.sendInvoiceEmail ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Auto Reminder Emails</label>
                    <p className="text-xs text-gray-500">Send automatic payment reminders</p>
                  </div>
                  <button
                    onClick={() => handleToggle('autoReminderEmails')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.autoReminderEmails ? (
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
