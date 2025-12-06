'use client'

/**
 * Trigger Selector Component
 *
 * Step 1 of workflow builder
 * Phase 3: Extended to support multiple trigger types:
 * - event_created: When events are created (requires event type selection)
 * - task_created: When tasks are created
 * - task_status_changed: When task status changes
 * - event_date_approaching: X days before event date (cron-based)
 */

import { useState, useEffect } from 'react'
import {
  Calendar,
  Check,
  Loader2,
  ClipboardList,
  RefreshCw,
  Clock,
  ChevronDown,
} from 'lucide-react'
import type {
  WorkflowTriggerType,
  TriggerConfig,
} from '@/types/workflows'
import { WORKFLOW_TRIGGER_TYPES } from '@/types/workflows'
import { createLogger } from '@/lib/logger'

const log = createLogger('workflows')

interface EventType {
  id: string
  name: string
  slug: string
  event_category_id: string
}

interface TriggerSelectorProps {
  triggerType: WorkflowTriggerType
  onTriggerTypeChange: (triggerType: WorkflowTriggerType) => void
  selectedEventTypeIds: string[]
  onEventTypesChange: (eventTypeIds: string[]) => void
  triggerConfig: TriggerConfig
  onTriggerConfigChange: (config: TriggerConfig) => void
}

// Icon mapping for trigger types
const TRIGGER_ICONS: Record<WorkflowTriggerType, React.ElementType> = {
  event_created: Calendar,
  task_created: ClipboardList,
  task_status_changed: RefreshCw,
  event_date_approaching: Clock,
}

export default function TriggerSelector({
  triggerType,
  onTriggerTypeChange,
  selectedEventTypeIds,
  onEventTypesChange,
  triggerConfig,
  onTriggerConfigChange,
}: TriggerSelectorProps) {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loading, setLoading] = useState(false)
  const [showEventTypes, setShowEventTypes] = useState(triggerType === 'event_created')

  useEffect(() => {
    if (triggerType === 'event_created' || triggerType === 'event_date_approaching') {
      fetchEventTypes()
    }
  }, [triggerType])

  // Update showEventTypes when trigger type changes
  useEffect(() => {
    setShowEventTypes(triggerType === 'event_created')
  }, [triggerType])

  const fetchEventTypes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/event-types')
      if (response.ok) {
        const data = await response.json()
        const types = data.eventTypes || data
        setEventTypes(Array.isArray(types) ? types : [])
      }
    } catch (error) {
      log.error({ error }, '[TriggerSelector] Error fetching event types')
      setEventTypes([])
    } finally {
      setLoading(false)
    }
  }

  const handleTriggerTypeChange = (newType: WorkflowTriggerType) => {
    onTriggerTypeChange(newType)

    // Reset config and event types when changing trigger type
    const triggerMeta = WORKFLOW_TRIGGER_TYPES[newType]

    // Initialize default config values
    const defaultConfig: TriggerConfig = {}
    if (triggerMeta.configFields) {
      for (const field of triggerMeta.configFields) {
        if (field.default !== undefined) {
          (defaultConfig as any)[field.key] = field.default
        }
      }
    }
    onTriggerConfigChange(defaultConfig)

    // Clear event types for non-event triggers
    if (!triggerMeta.requiresEventTypes) {
      onEventTypesChange([])
    }
  }

  const handleEventTypeToggle = (eventTypeId: string) => {
    if (selectedEventTypeIds.includes(eventTypeId)) {
      onEventTypesChange(selectedEventTypeIds.filter(id => id !== eventTypeId))
    } else {
      onEventTypesChange([...selectedEventTypeIds, eventTypeId])
    }
  }

  const handleConfigChange = (key: string, value: any) => {
    onTriggerConfigChange({
      ...triggerConfig,
      [key]: value,
    })
  }

  const currentTriggerMeta = WORKFLOW_TRIGGER_TYPES[triggerType]
  const TriggerIcon = TRIGGER_ICONS[triggerType]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Trigger Type Selection */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Choose Trigger Type
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Select when this workflow should be triggered.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.entries(WORKFLOW_TRIGGER_TYPES) as [WorkflowTriggerType, typeof WORKFLOW_TRIGGER_TYPES[WorkflowTriggerType]][]).map(([type, meta]) => {
            const Icon = TRIGGER_ICONS[type]
            const isSelected = triggerType === type

            return (
              <label
                key={type}
                className={`
                  relative p-4 rounded-lg border-2 transition-all cursor-pointer
                  ${isSelected
                    ? 'border-[#347dc4] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                `}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    name="triggerType"
                    value={type}
                    checked={isSelected}
                    onChange={() => handleTriggerTypeChange(type)}
                    className="mt-1 h-4 w-4 border-gray-300 text-[#347dc4] focus:ring-[#347dc4]"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center">
                      <Icon className={`h-4 w-4 mr-2 ${isSelected ? 'text-[#347dc4]' : 'text-gray-400'}`} />
                      <div className="font-medium text-gray-900">{meta.label}</div>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{meta.description}</p>
                    <span className={`
                      inline-block mt-2 px-2 py-0.5 text-xs rounded-full
                      ${meta.category === 'event' ? 'bg-blue-100 text-blue-800' :
                        meta.category === 'task' ? 'bg-green-100 text-green-800' :
                        'bg-amber-100 text-amber-800'}
                    `}>
                      {meta.category === 'event' ? 'Event Trigger' :
                       meta.category === 'task' ? 'Task Trigger' :
                       'Time-Based Trigger'}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="ml-2 flex-shrink-0">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#347dc4]">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Trigger Configuration */}
      {currentTriggerMeta.configFields && currentTriggerMeta.configFields.length > 0 && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
            <TriggerIcon className="h-4 w-4 mr-2 text-gray-500" />
            Trigger Configuration
          </h4>

          <div className="space-y-4">
            {currentTriggerMeta.configFields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {field.type === 'select' && field.options && (
                  <select
                    value={(triggerConfig as any)[field.key] || ''}
                    onChange={(e) => handleConfigChange(field.key, e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                  >
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === 'number' && (
                  <input
                    type="number"
                    value={(triggerConfig as any)[field.key] ?? field.default ?? ''}
                    onChange={(e) => handleConfigChange(field.key, parseInt(e.target.value) || 0)}
                    min={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                  />
                )}

                {field.type === 'multiselect' && field.options && (
                  <div className="space-y-2 max-h-40 overflow-y-auto p-3 border border-gray-300 rounded-lg bg-white">
                    {field.options.map((option) => {
                      const selectedValues = (triggerConfig as any)[field.key] || []
                      const isChecked = selectedValues.includes(option.value)

                      return (
                        <label key={option.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const newValues = e.target.checked
                                ? [...selectedValues, option.value]
                                : selectedValues.filter((v: string) => v !== option.value)
                              handleConfigChange(field.key, newValues)
                            }}
                            className="rounded border-gray-300 text-[#347dc4] focus:ring-[#347dc4]"
                          />
                          <span className="text-sm text-gray-700">{option.label}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Type Selection (for event_created trigger) */}
      {currentTriggerMeta.requiresEventTypes && (
        <div className="p-6">
          <div
            className="flex items-center justify-between cursor-pointer mb-4"
            onClick={() => setShowEventTypes(!showEventTypes)}
          >
            <div>
              <h4 className="text-sm font-medium text-gray-900 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                Select Event Types
                <span className="text-red-500 ml-1">*</span>
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {selectedEventTypeIds.length > 0
                  ? `${selectedEventTypeIds.length} event type${selectedEventTypeIds.length !== 1 ? 's' : ''} selected`
                  : 'Select which event types trigger this workflow'}
              </p>
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showEventTypes ? 'rotate-180' : ''}`} />
          </div>

          {showEventTypes && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#347dc4]" />
                </div>
              ) : eventTypes.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No event types found. Create event types first in Settings.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {eventTypes.map((type) => {
                    const isSelected = selectedEventTypeIds.includes(type.id)
                    return (
                      <label
                        key={type.id}
                        className={`
                          relative p-3 rounded-lg border transition-all cursor-pointer
                          ${isSelected
                            ? 'border-[#347dc4] bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                          }
                        `}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleEventTypeToggle(type.id)}
                            className="h-4 w-4 rounded border-gray-300 text-[#347dc4] focus:ring-[#347dc4]"
                          />
                          <div className="ml-3 flex-1">
                            <div className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                              {type.name}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-[#347dc4]" />
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Summary */}
      {(selectedEventTypeIds.length > 0 || !currentTriggerMeta.requiresEventTypes) && (
        <div className="p-4 bg-blue-50 border-t border-blue-200">
          <div className="flex items-center text-sm text-blue-800">
            <TriggerIcon className="h-4 w-4 mr-2" />
            <span>
              <strong>Trigger:</strong>{' '}
              {currentTriggerMeta.label}
              {currentTriggerMeta.requiresEventTypes && selectedEventTypeIds.length > 0 && (
                <> for {selectedEventTypeIds.length} event type{selectedEventTypeIds.length !== 1 ? 's' : ''}</>
              )}
              {triggerType === 'task_status_changed' && (
                <>
                  {(triggerConfig as any).from_status && <> from "{(triggerConfig as any).from_status}"</>}
                  {(triggerConfig as any).to_status && <> to "{(triggerConfig as any).to_status}"</>}
                  {!(triggerConfig as any).from_status && !(triggerConfig as any).to_status && <> (any status change)</>}
                </>
              )}
              {triggerType === 'event_date_approaching' && (
                <> ({(triggerConfig as any).days_before || 7} days before)</>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
