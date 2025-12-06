'use client'

/**
 * Condition Builder Component
 *
 * Allows users to add optional conditions to workflows.
 * Conditions use AND logic - all must pass for workflow to execute.
 *
 * USAGE:
 * <ConditionBuilder
 *   conditions={conditions}
 *   onChange={setConditions}
 * />
 */

import { useState, useEffect } from 'react'
import {
  Plus,
  Trash2,
  Filter,
  AlertCircle,
  Info,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logger'

const log = createLogger('workflows')
import type {
  WorkflowCondition,
  ConditionOperator,
} from '@/types/workflows'
import {
  CONDITION_OPERATORS,
  CONDITION_FIELDS,
} from '@/types/workflows'

interface EventType {
  id: string
  name: string
}

interface ConditionBuilderProps {
  conditions: WorkflowCondition[]
  onChange: (conditions: WorkflowCondition[]) => void
}

// Available fields for conditions (can be expanded later)
const AVAILABLE_FIELDS = Object.entries(CONDITION_FIELDS).map(([key, value]) => ({
  value: key,
  label: value.label,
  description: value.description,
  type: value.type,
  entity: value.entity,
  lookupTable: value.lookupTable,
}))

// Available operators
const AVAILABLE_OPERATORS = Object.entries(CONDITION_OPERATORS).map(([key, value]) => ({
  value: key as ConditionOperator,
  label: value.label,
  description: value.description,
  requiresValue: value.requiresValue,
  valueType: value.valueType,
}))

export default function ConditionBuilder({
  conditions,
  onChange,
}: ConditionBuilderProps) {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loadingEventTypes, setLoadingEventTypes] = useState(false)
  const [expanded, setExpanded] = useState(conditions.length > 0)

  // Fetch event types for the event_type_id field
  useEffect(() => {
    fetchEventTypes()
  }, [])

  const fetchEventTypes = async () => {
    try {
      setLoadingEventTypes(true)
      const response = await fetch('/api/event-types')
      if (response.ok) {
        const data = await response.json()
        setEventTypes(data.eventTypes || data || [])
      }
    } catch (error) {
      log.error({ error }, '[ConditionBuilder] Error fetching event types')
    } finally {
      setLoadingEventTypes(false)
    }
  }

  const handleAddCondition = () => {
    const newCondition: WorkflowCondition = {
      field: 'event.event_type_id',
      operator: 'equals',
      value: '',
    }
    onChange([...conditions, newCondition])
    setExpanded(true)
  }

  const handleUpdateCondition = (index: number, updates: Partial<WorkflowCondition>) => {
    const updated = [...conditions]
    updated[index] = { ...updated[index], ...updates }

    // Reset value when operator changes to one that doesn't need value
    if (updates.operator) {
      const operatorMeta = AVAILABLE_OPERATORS.find(op => op.value === updates.operator)
      if (operatorMeta && !operatorMeta.requiresValue) {
        updated[index].value = undefined
      }
      // Reset value when operator changes to array type
      if (operatorMeta && operatorMeta.valueType === 'array' && !Array.isArray(updated[index].value)) {
        updated[index].value = []
      }
      // Reset value when operator changes from array to single
      if (operatorMeta && operatorMeta.valueType === 'single' && Array.isArray(updated[index].value)) {
        updated[index].value = ''
      }
    }

    onChange(updated)
  }

  const handleRemoveCondition = (index: number) => {
    const updated = conditions.filter((_, i) => i !== index)
    onChange(updated)
    if (updated.length === 0) {
      setExpanded(false)
    }
  }

  const getFieldMeta = (fieldKey: string) => {
    return AVAILABLE_FIELDS.find(f => f.value === fieldKey)
  }

  const getOperatorMeta = (operatorKey: ConditionOperator) => {
    return AVAILABLE_OPERATORS.find(op => op.value === operatorKey)
  }

  // Render value input based on field type and operator
  const renderValueInput = (condition: WorkflowCondition, index: number) => {
    const fieldMeta = getFieldMeta(condition.field)
    const operatorMeta = getOperatorMeta(condition.operator)

    if (!operatorMeta?.requiresValue) {
      return null
    }

    // For event_type_id, show a searchable dropdown
    if (condition.field === 'event.event_type_id') {
      if (operatorMeta.valueType === 'array') {
        // Multi-select for 'in' and 'not_in' operators
        return (
          <div className="space-y-2">
            <label className="block text-xs text-gray-500">Select event types:</label>
            <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1">
              {loadingEventTypes ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : eventTypes.length === 0 ? (
                <div className="text-sm text-gray-500">No event types found</div>
              ) : (
                eventTypes.map(type => {
                  const values = Array.isArray(condition.value) ? condition.value : []
                  const isSelected = values.includes(type.id)
                  return (
                    <label
                      key={type.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const newValues = e.target.checked
                            ? [...values, type.id]
                            : values.filter(v => v !== type.id)
                          handleUpdateCondition(index, { value: newValues })
                        }}
                        className="rounded border-gray-300 text-[#347dc4] focus:ring-[#347dc4]"
                      />
                      <span>{type.name}</span>
                    </label>
                  )
                })
              )}
            </div>
            {Array.isArray(condition.value) && condition.value.length > 0 && (
              <div className="text-xs text-gray-500">
                {condition.value.length} selected
              </div>
            )}
          </div>
        )
      } else {
        // Single select for 'equals' and 'not_equals' operators
        return (
          <select
            value={condition.value as string || ''}
            onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4] text-sm"
          >
            <option value="">Select event type...</option>
            {eventTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        )
      }
    }

    // For status field, show a dropdown with common statuses
    if (condition.field === 'event.status') {
      const statuses = ['draft', 'pending', 'confirmed', 'completed', 'cancelled']
      return (
        <select
          value={condition.value as string || ''}
          onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4] text-sm"
        >
          <option value="">Select status...</option>
          {statuses.map(status => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      )
    }

    // Default text input
    return (
      <input
        type="text"
        value={condition.value as string || ''}
        onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
        placeholder="Enter value..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4] text-sm"
      />
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Filter className="h-5 w-5 text-gray-400" />
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              Conditions (Optional)
            </h3>
            <p className="text-xs text-gray-500">
              {conditions.length === 0
                ? 'Add conditions to filter when this workflow runs'
                : `${conditions.length} condition${conditions.length !== 1 ? 's' : ''} configured`}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Content */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Info box */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p>Conditions filter when this workflow executes. All conditions must be true (AND logic).</p>
              <p className="mt-1 text-xs text-blue-600">Without conditions, the workflow runs for all matching triggers.</p>
            </div>
          </div>

          {/* Conditions list */}
          {conditions.length > 0 && (
            <div className="space-y-3">
              {conditions.map((condition, index) => {
                const fieldMeta = getFieldMeta(condition.field)
                const operatorMeta = getOperatorMeta(condition.operator)

                return (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        {index === 0 ? 'IF' : 'AND'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(index)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Field selector */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Field
                      </label>
                      <select
                        value={condition.field}
                        onChange={(e) => handleUpdateCondition(index, { field: e.target.value, value: '' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4] text-sm"
                      >
                        {AVAILABLE_FIELDS.map(field => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                      {fieldMeta && (
                        <p className="mt-1 text-xs text-gray-500">{fieldMeta.description}</p>
                      )}
                    </div>

                    {/* Operator selector */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Operator
                      </label>
                      <select
                        value={condition.operator}
                        onChange={(e) => handleUpdateCondition(index, { operator: e.target.value as ConditionOperator })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4] text-sm"
                      >
                        {AVAILABLE_OPERATORS.map(op => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Value input */}
                    {operatorMeta?.requiresValue && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Value
                        </label>
                        {renderValueInput(condition, index)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Add condition button */}
          <Button
            type="button"
            onClick={handleAddCondition}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Condition
          </Button>

          {/* Empty state */}
          {conditions.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-500">
              No conditions added. Click "Add Condition" to filter when this workflow runs.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
