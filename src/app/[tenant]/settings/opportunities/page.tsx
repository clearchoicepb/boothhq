'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSettings } from '@/lib/settings-context';
import {
  ArrowLeft,
  Target,
  Settings,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function OpportunitiesSettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { settings: globalSettings, updateSettings, loading: settingsLoading } = useSettings();
  
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // Display Settings
    defaultView: 'table',
    itemsPerPage: 25,
    showProbability: true,
    showValue: true,
    showExpectedClose: true,
    showCreatedDate: false,
    
    // Opportunity Stages
    stages: [
      { id: 'prospecting', name: 'Prospecting', probability: 10, color: 'blue', enabled: true },
      { id: 'qualification', name: 'Qualification', probability: 25, color: 'yellow', enabled: true },
      { id: 'proposal', name: 'Proposal', probability: 50, color: 'purple', enabled: true },
      { id: 'negotiation', name: 'Negotiation', probability: 75, color: 'orange', enabled: true },
      { id: 'closed_won', name: 'Closed Won', probability: 100, color: 'green', enabled: true },
      { id: 'closed_lost', name: 'Closed Lost', probability: 0, color: 'red', enabled: true }
    ],
    
    // Field Settings
    requiredFields: {
      name: true,
      stage: true,
      account: false,
      contact: false,
      amount: false,
      probability: false,
      expectedCloseDate: false
    },
    
    // Automation Settings
    autoCalculateProbability: true,
    sendStageNotifications: true,
    createEventOnStageChange: false,
    autoGenerateInvoiceOnWin: false,
    
    // Pipeline Settings
    showPipelineView: true,
    showProbabilityChart: true,
    defaultProbabilityFilter: 'all', // 'all', 'high', 'medium', 'low'
    
    // Currency Settings
    defaultCurrency: 'USD',
    showCurrencySymbol: true,
    
    // Date Settings
    defaultCloseDateOffset: 30, // days from today
    requireCloseDateForWon: true
  });

  const handleToggle = (path: string) => {
    setSettings(prev => {
      const keys = path.split('.');
      const newSettings = { ...prev };
      let current = newSettings as any;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = !current[keys[keys.length - 1]];
      return newSettings;
    });
  };

  const handleSelect = (path: string, value: any) => {
    setSettings(prev => {
      const keys = path.split('.');
      const newSettings = { ...prev };
      let current = newSettings as any;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const updateStage = (stageId: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      stages: prev.stages.map(stage => 
        stage.id === stageId ? { ...stage, [field]: value } : stage
      )
    }));
  };

  const addStage = () => {
    const newStage = {
      id: `stage_${Date.now()}`,
      name: 'New Stage',
      probability: 50,
      color: 'gray',
      enabled: true
    };
    setSettings(prev => ({
      ...prev,
      stages: [...prev.stages, newStage]
    }));
  };

  const removeStage = async (stageId: string) => {
    // Minimum stages check
    if (settings.stages.length <= 2) {
      toast.error('You must have at least 2 stages');
      return;
    }

    // Check if any opportunities use this stage
    try {
      const response = await fetch(`/api/opportunities/count-by-stage?stage=${stageId}`);
      const data = await response.json();

      if (!response.ok) {
        toast.error('Failed to check stage usage');
        return;
      }

      // If stage is in use, prevent deletion and suggest alternatives
      if (data.count > 0) {
        const stageName = settings.stages.find((s: any) => s.id === stageId)?.name || stageId;
        const shouldDisable = window.confirm(
          `Cannot delete "${stageName}": ${data.count} ${data.count === 1 ? 'opportunity uses' : 'opportunities use'} this stage.\n\n` +
          `Would you like to DISABLE this stage instead? (Existing opportunities will be preserved)`
        );

        if (shouldDisable) {
          // Disable the stage instead of deleting
          updateStage(stageId, 'enabled', false);
          toast.success(`"${stageName}" stage disabled. Existing opportunities preserved.`);
        }
        return;
      }

      // Safe to delete - no opportunities use this stage
      setSettings(prev => ({
        ...prev,
        stages: prev.stages.filter(stage => stage.id !== stageId)
      }));
      
      const stageName = settings.stages.find((s: any) => s.id === stageId)?.name || stageId;
      toast.success(`"${stageName}" stage deleted`);
    } catch (error) {
      console.error('Error checking stage usage:', error);
      toast.error('Failed to check if stage is in use');
    }
  };

  // Load settings from global context
  useEffect(() => {
    if (globalSettings.opportunities) {
      setSettings(prev => ({
        ...prev,
        ...globalSettings.opportunities,
        // Ensure stages always exists with at least defaults
        stages: globalSettings.opportunities.stages || prev.stages,
        requiredFields: globalSettings.opportunities.requiredFields || prev.requiredFields
      }));
    }
  }, [globalSettings, settingsLoading]);

  const handleSaveSettings = async () => {
    setSaving(true);
    const toastId = toast.loading('Saving settings...');
    try {
      await updateSettings({
        ...globalSettings,
        opportunities: settings
      });

      // If auto-calculate is enabled, trigger recalculation for all opportunities
      if (settings.autoCalculateProbability) {
        toast.loading('Recalculating probabilities for all opportunities...', { id: toastId });

        const recalcResponse = await fetch('/api/opportunities/recalculate-probabilities', {
          method: 'POST'
        });

        if (recalcResponse.ok) {
          const result = await recalcResponse.json();
          toast.success(`Settings saved! ${result.message || 'Probabilities recalculated.'}`, { id: toastId });
        } else {
          toast.success('Settings saved! (Note: Could not recalculate probabilities)', { id: toastId });
        }
      } else {
        toast.success('Settings saved successfully!', { id: toastId });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error saving settings. Please try again.', { id: toastId });
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
                <div className="h-6 w-px bg-gray-300"></div>
                <Target className="h-6 w-6 text-[#347dc4]" />
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Opportunities Settings</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Set up sales stages, probability settings, and pipeline views
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
                    <p className="text-xs text-gray-500">How opportunities are displayed by default</p>
                  </div>
                  <select 
                    value={settings.defaultView}
                    onChange={(e) => handleSelect('defaultView', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                    aria-label="Select default view"
                    title="Select default view"
                  >
                    <option value="table">Table View</option>
                    <option value="pipeline">Pipeline View</option>
                    <option value="cards">Card View</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Show Probability</label>
                    <p className="text-xs text-gray-500">Display probability percentage in opportunities list</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showProbability')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showProbability ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Show Estimated Value</label>
                    <p className="text-xs text-gray-500">Display estimated value in opportunities list</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showValue')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showValue ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Show Expected Close Date</label>
                    <p className="text-xs text-gray-500">Display expected close date in opportunities list</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showExpectedClose')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showExpectedClose ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Opportunity Stages */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Sales Stages</h2>
                <button 
                  onClick={addStage}
                  disabled
                  title="Custom stages coming soon - requires database update to remove CHECK constraint"
                  className="flex items-center px-3 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed opacity-60"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stage (Coming Soon)
                </button>
              </div>
              <div className="space-y-3">
                {settings.stages.map((stage) => (
                  <div key={stage.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs text-gray-500">Stage Name</label>
                        <input
                          type="text"
                          value={stage.name}
                          onChange={(e) => updateStage(stage.id, 'name', e.target.value)}
                          className="text-sm font-medium text-gray-900 bg-transparent border border-gray-300 rounded px-2 py-1 w-full"
                          aria-label="Stage name"
                          title="Enter stage name"
                          placeholder="Enter stage name"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Probability (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={stage.probability}
                          onChange={(e) => updateStage(stage.id, 'probability', parseInt(e.target.value) || 0)}
                          className="text-sm text-gray-900 bg-transparent border border-gray-300 rounded px-2 py-1 w-full"
                          aria-label="Probability percentage"
                          title="Enter probability percentage"
                          placeholder="0-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Color</label>
                        <select
                          value={stage.color}
                          onChange={(e) => updateStage(stage.id, 'color', e.target.value)}
                          className="text-sm text-gray-900 bg-transparent border border-gray-300 rounded px-2 py-1 w-full"
                          aria-label="Select stage color"
                          title="Select stage color"
                        >
                          <option value="blue">Blue</option>
                          <option value="yellow">Yellow</option>
                          <option value="purple">Purple</option>
                          <option value="orange">Orange</option>
                          <option value="green">Green</option>
                          <option value="red">Red</option>
                          <option value="gray">Gray</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs text-gray-500">Enabled</label>
                          <button
                            onClick={() => updateStage(stage.id, 'enabled', !stage.enabled)}
                            className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150 ml-2"
                          >
                            {stage.enabled ? (
                              <ToggleRight className="h-6 w-6" />
                            ) : (
                              <ToggleLeft className="h-6 w-6" />
                            )}
                          </button>
                        </div>
                        <button 
                          onClick={() => removeStage(stage.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors duration-150"
                          aria-label="Remove stage"
                          title="Remove stage"
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
                        {field.replace(/([A-Z])/g, ' $1').replace('_', ' ').trim()}
                      </label>
                      <p className="text-xs text-gray-500">Make this field required when creating opportunities</p>
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
                    <label className="text-sm font-medium text-gray-900">Auto-calculate Probability</label>
                    <p className="text-xs text-gray-500">Automatically set probability based on stage</p>
                  </div>
                  <button
                    onClick={() => handleToggle('autoCalculateProbability')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.autoCalculateProbability ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Send Stage Notifications</label>
                    <p className="text-xs text-gray-500">Send notifications when opportunity stage changes</p>
                  </div>
                  <button
                    onClick={() => handleToggle('sendStageNotifications')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.sendStageNotifications ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Create Event on Stage Change</label>
                    <p className="text-xs text-gray-500">Automatically create events when opportunity moves to next stage</p>
                  </div>
                  <button
                    onClick={() => handleToggle('createEventOnStageChange')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.createEventOnStageChange ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Auto-generate Invoice on Win</label>
                    <p className="text-xs text-gray-500">Automatically create invoice when opportunity is won</p>
                  </div>
                  <button
                    onClick={() => handleToggle('autoGenerateInvoiceOnWin')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.autoGenerateInvoiceOnWin ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Pipeline Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Show Pipeline View</label>
                    <p className="text-xs text-gray-500">Enable pipeline/kanban view for opportunities</p>
                  </div>
                  <button
                    onClick={() => handleToggle('showPipelineView')}
                    className="text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                  >
                    {settings.showPipelineView ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Default Probability Filter</label>
                    <p className="text-xs text-gray-500">Default filter for opportunity probability</p>
                  </div>
                  <select
                    value={settings.defaultProbabilityFilter}
                    onChange={(e) => handleSelect('defaultProbabilityFilter', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                    aria-label="Select default probability filter"
                    title="Select default probability filter"
                  >
                    <option value="all">All Opportunities</option>
                    <option value="high">High Probability (75%+)</option>
                    <option value="medium">Medium Probability (25-74%)</option>
                    <option value="low">Low Probability (0-24%)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Default Close Date Offset</label>
                    <p className="text-xs text-gray-500">Default days from today for new opportunity close dates</p>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.defaultCloseDateOffset}
                    onChange={(e) => handleSelect('defaultCloseDateOffset', parseInt(e.target.value) || 30)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-20"
                    aria-label="Default close date offset in days"
                    title="Enter default close date offset in days"
                    placeholder="30"
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
