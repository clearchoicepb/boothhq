'use client'

/**
 * Workflow Builder Component
 *
 * Zapier-style workflow builder with 3 steps:
 * 1. Choose Trigger (Event Type)
 * 2. Add Actions (Create Tasks)
 * 3. Review & Save
 *
 * Uses drag-and-drop for action reordering
 */

import { useState, useEffect } from 'react'
import { 
  Plus,
  Save,
  X,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Zap,
  Settings,
  Palette,
  ClipboardCheck,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import TriggerSelector from './TriggerSelector'
import ConditionBuilder from './ConditionBuilder'
import ActionsList from './ActionsList'
import type {
  WorkflowWithRelations,
  WorkflowSavePayload,
  WorkflowBuilderAction,
  WorkflowCondition,
  WorkflowTriggerType,
  TriggerConfig,
} from '@/types/workflows'
import { WORKFLOW_TRIGGER_TYPES } from '@/types/workflows'
import { createLogger } from '@/lib/logger'

const log = createLogger('workflows')

// Types for reference data
interface EventType {
  id: string
  name: string
}

interface TaskTemplate {
  id: string
  name: string
  default_title: string
}

interface DesignItemType {
  id: string
  name: string
  type: 'digital' | 'physical'
}

interface User {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
}

interface WorkflowBuilderProps {
  workflow: WorkflowWithRelations | null
  onSave: (payload: WorkflowSavePayload) => Promise<void>
  onCancel: () => void
  saving: boolean
}

type Step = 'trigger' | 'actions' | 'review'

export default function WorkflowBuilder({ 
  workflow, 
  onSave, 
  onCancel, 
  saving 
}: WorkflowBuilderProps) {
  // Workflow state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState<WorkflowTriggerType>('event_created')
  const [eventTypeIds, setEventTypeIds] = useState<string[]>([])
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>({})
  const [conditions, setConditions] = useState<WorkflowCondition[]>([])
  const [isActive, setIsActive] = useState(true)
  const [actions, setActions] = useState<WorkflowBuilderAction[]>([])

  // UI state
  const [currentStep, setCurrentStep] = useState<Step>('trigger')
  const [errors, setErrors] = useState<string[]>([])

  // Reference data for review step
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([])
  const [designItemTypes, setDesignItemTypes] = useState<DesignItemType[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingReferenceData, setLoadingReferenceData] = useState(false)

  // Fetch reference data for review step
  useEffect(() => {
    if (currentStep === 'review') {
      fetchReferenceData()
    }
  }, [currentStep])

  const fetchReferenceData = async () => {
    setLoadingReferenceData(true)
    try {
      // Fetch event types
      const eventTypesRes = await fetch('/api/event-types')
      if (eventTypesRes.ok) {
        const data = await eventTypesRes.json()
        setEventTypes(data.eventTypes || data || [])
      }

      // Fetch task templates
      const taskTemplatesRes = await fetch('/api/task-templates')
      if (taskTemplatesRes.ok) {
        const templates = await taskTemplatesRes.json()
        setTaskTemplates(Array.isArray(templates) ? templates : [])
      }

      // Design item types are now deprecated - use task templates with task_type='design' instead
      // setDesignItemTypes is no longer used

      // Fetch users
      const usersRes = await fetch('/api/users')
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(Array.isArray(usersData) ? usersData : [])
      }
    } catch (error) {
      log.error({ error }, 'Error fetching reference data')
    } finally {
      setLoadingReferenceData(false)
    }
  }

  // Initialize from existing workflow
  useEffect(() => {
    if (workflow) {
      setName(workflow.name)
      setDescription(workflow.description || '')
      setTriggerType(workflow.trigger_type || 'event_created')
      setEventTypeIds(workflow.event_type_ids || [])
      setTriggerConfig(workflow.trigger_config || {})
      setConditions(workflow.conditions || [])
      setIsActive(workflow.is_active)

      // Convert workflow actions to builder actions
      // Ensure workflow.actions is an array (handle null, undefined, or non-array)
      const workflowActions = Array.isArray(workflow.actions) ? workflow.actions : []
      const builderActions: WorkflowBuilderAction[] = workflowActions
        .sort((a, b) => a.execution_order - b.execution_order)
        .map((action, index) => ({
          tempId: `existing-${action.id}`,
          actionType: action.action_type,
          taskTemplateId: action.task_template_id,
          designItemTypeId: action.design_item_type_id,
          operationsItemTypeId: action.operations_item_type_id,
          staffRoleId: action.staff_role_id,
          assignedToUserId: action.assigned_to_user_id,
          config: action.config || {},
        }))

      setActions(builderActions)
    }
  }, [workflow])

  const handleAddAction = () => {
    const newAction: WorkflowBuilderAction = {
      tempId: `new-${Date.now()}`,
      actionType: 'create_task',
      taskTemplateId: null,
      designItemTypeId: null,
      operationsItemTypeId: null,
      staffRoleId: null,
      assignedToUserId: null,
      config: {},
    }
    setActions([...actions, newAction])
  }

  const handleUpdateAction = (index: number, updated: Partial<WorkflowBuilderAction>) => {
    const newActions = [...actions]
    newActions[index] = { ...newActions[index], ...updated }
    setActions(newActions)
  }

  const handleDeleteAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
  }

  const handleReorderActions = (reordered: WorkflowBuilderAction[]) => {
    setActions(reordered)
  }

  const validate = (): boolean => {
    const validationErrors: string[] = []
    const triggerMeta = WORKFLOW_TRIGGER_TYPES[triggerType]

    // Validate name
    if (!name.trim()) {
      validationErrors.push('Workflow name is required')
    }

    // Validate trigger (event types only required for event_created)
    if (triggerMeta.requiresEventTypes && eventTypeIds.length === 0) {
      validationErrors.push('At least one event type is required')
    }

    // Validate trigger config for time-based triggers
    if (triggerType === 'event_date_approaching') {
      const config = triggerConfig as { days_before?: number }
      if (!config.days_before || config.days_before < 1) {
        validationErrors.push('Days before event must be at least 1')
      }
    }

    // Validate actions
    if (actions.length === 0) {
      validationErrors.push('At least one action is required')
    }

    // Validate each action
    actions.forEach((action, index) => {
      if (action.actionType === 'create_task') {
        if (!action.taskTemplateId) {
          validationErrors.push(`Action ${index + 1}: Task template is required`)
        }
        if (!action.assignedToUserId) {
          validationErrors.push(`Action ${index + 1}: Assigned user is required`)
        }
      } else if (action.actionType === 'create_design_item') {
        if (!action.designItemTypeId) {
          validationErrors.push(`Action ${index + 1}: Design item type is required`)
        }
      } else if (action.actionType === 'create_ops_item') {
        if (!action.operationsItemTypeId) {
          validationErrors.push(`Action ${index + 1}: Operations item type is required`)
        }
      } else if (action.actionType === 'assign_event_role') {
        if (!action.staffRoleId) {
          validationErrors.push(`Action ${index + 1}: Staff role is required`)
        }
        if (!action.assignedToUserId) {
          validationErrors.push(`Action ${index + 1}: User to assign is required`)
        }
      }
    })

    setErrors(validationErrors)
    return validationErrors.length === 0
  }

  const handleSave = async () => {
    if (!validate()) {
      return
    }

    const payload: WorkflowSavePayload = {
      workflow: {
        name,
        description: description || null,
        trigger_type: triggerType,
        event_type_ids: eventTypeIds.length > 0 ? eventTypeIds : undefined,
        trigger_config: Object.keys(triggerConfig).length > 0 ? triggerConfig : undefined,
        conditions: conditions.length > 0 ? conditions : undefined,
        is_active: isActive,
      },
      actions: actions.map((action, index) => ({
        action_type: action.actionType,
        execution_order: index,
        task_template_id: action.taskTemplateId,
        design_item_type_id: action.designItemTypeId,
        operations_item_type_id: action.operationsItemTypeId,
        staff_role_id: action.staffRoleId,
        assigned_to_user_id: action.assignedToUserId,
        config: action.config,
      })),
    }

    await onSave(payload)
  }

  // Phase 3: Updated validation to handle different trigger types
  const triggerMeta = WORKFLOW_TRIGGER_TYPES[triggerType]
  const canProceedToActions = triggerMeta.requiresEventTypes
    ? eventTypeIds.length > 0
    : true // Task and time-based triggers don't require event types
  const canProceedToReview = canProceedToActions && actions.length > 0

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          {/* Step 1: Trigger */}
          <div className="flex items-center flex-1">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full 
              ${currentStep === 'trigger' ? 'bg-[#347dc4] text-white' : 'bg-gray-200 text-gray-600'}
            `}>
              1
            </div>
            <div className="ml-3">
              <div className={`text-sm font-medium ${currentStep === 'trigger' ? 'text-gray-900' : 'text-gray-500'}`}>
                Choose Trigger
              </div>
              <div className="text-xs text-gray-500">When an event is created</div>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-gray-400 mx-4" />

          {/* Step 2: Actions */}
          <div className="flex items-center flex-1">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full 
              ${currentStep === 'actions' ? 'bg-[#347dc4] text-white' : 'bg-gray-200 text-gray-600'}
            `}>
              2
            </div>
            <div className="ml-3">
              <div className={`text-sm font-medium ${currentStep === 'actions' ? 'text-gray-900' : 'text-gray-500'}`}>
                Add Actions
              </div>
              <div className="text-xs text-gray-500">{actions.length} action{actions.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-gray-400 mx-4" />

          {/* Step 3: Review */}
          <div className="flex items-center flex-1">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full 
              ${currentStep === 'review' ? 'bg-[#347dc4] text-white' : 'bg-gray-200 text-gray-600'}
            `}>
              3
            </div>
            <div className="ml-3">
              <div className={`text-sm font-medium ${currentStep === 'review' ? 'text-gray-900' : 'text-gray-500'}`}>
                Review & Save
              </div>
              <div className="text-xs text-gray-500">Confirm details</div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-900">Please fix the following errors:</h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      {currentStep === 'trigger' && (
        <div className="space-y-4">
          <TriggerSelector
            triggerType={triggerType}
            onTriggerTypeChange={setTriggerType}
            selectedEventTypeIds={eventTypeIds}
            onEventTypesChange={setEventTypeIds}
            triggerConfig={triggerConfig}
            onTriggerConfigChange={setTriggerConfig}
          />
          <ConditionBuilder
            conditions={conditions}
            onChange={setConditions}
          />
        </div>
      )}

      {currentStep === 'actions' && (
        <ActionsList
          actions={actions}
          onAddAction={handleAddAction}
          onUpdateAction={handleUpdateAction}
          onDeleteAction={handleDeleteAction}
          onReorderActions={handleReorderActions}
        />
      )}

      {currentStep === 'review' && (
        <div className="space-y-6">
          {/* Workflow Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-gray-400" />
              Workflow Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Wedding Event Workflow"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this workflow does..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-gray-300 text-[#347dc4] focus:ring-[#347dc4]"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Activate workflow immediately
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Trigger Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <Calendar className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Workflow Trigger</h3>
                <p className="text-sm text-blue-700 mb-2">
                  <strong>Type:</strong> {triggerMeta.label}
                </p>
                <p className="text-xs text-blue-600 mb-2">
                  {triggerMeta.description}
                </p>

                {/* Show event types for event_created trigger */}
                {triggerType === 'event_created' && eventTypeIds.length > 0 && (
                  <>
                    <p className="text-sm text-blue-700 mt-3 mb-1">Event Types:</p>
                    {loadingReferenceData ? (
                      <div className="text-sm text-blue-700">Loading event types...</div>
                    ) : (
                      <div className="space-y-1">
                        {eventTypeIds.map(typeId => {
                          const eventType = eventTypes.find(et => et.id === typeId)
                          return (
                            <div key={typeId} className="flex items-center text-sm text-blue-900">
                              <CheckCircle2 className="h-4 w-4 mr-2 text-blue-600" />
                              <span className="font-medium">{eventType?.name || 'Unknown Event Type'}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* Show config for task_status_changed */}
                {triggerType === 'task_status_changed' && (
                  <div className="mt-3 text-sm text-blue-700">
                    {(triggerConfig as any).from_status && (
                      <div>From Status: <strong>{(triggerConfig as any).from_status}</strong></div>
                    )}
                    {(triggerConfig as any).to_status && (
                      <div>To Status: <strong>{(triggerConfig as any).to_status}</strong></div>
                    )}
                    {!(triggerConfig as any).from_status && !(triggerConfig as any).to_status && (
                      <div>Triggers on <strong>any status change</strong></div>
                    )}
                  </div>
                )}

                {/* Show config for event_date_approaching */}
                {triggerType === 'event_date_approaching' && (
                  <div className="mt-3 text-sm text-blue-700">
                    Triggers <strong>{(triggerConfig as any).days_before || 7} days</strong> before event date
                  </div>
                )}

                {/* Show config for task_created */}
                {triggerType === 'task_created' && (triggerConfig as any).task_types?.length > 0 && (
                  <div className="mt-3 text-sm text-blue-700">
                    Task Types: <strong>{(triggerConfig as any).task_types.join(', ')}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Conditions Summary */}
          {conditions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-amber-900 mb-2">Conditions</h3>
                  <p className="text-sm text-amber-700 mb-2">
                    This workflow will only execute if ALL conditions are met:
                  </p>
                  <div className="mt-2 space-y-2">
                    {conditions.map((condition, index) => {
                      // Get display value for condition
                      let displayValue = condition.value
                      if (condition.field === 'event.event_type_id' && condition.value) {
                        if (Array.isArray(condition.value)) {
                          displayValue = condition.value
                            .map(id => eventTypes.find(et => et.id === id)?.name || id)
                            .join(', ')
                        } else {
                          displayValue = eventTypes.find(et => et.id === condition.value)?.name || condition.value
                        }
                      }

                      const operatorLabels: Record<string, string> = {
                        equals: 'equals',
                        not_equals: 'does not equal',
                        in: 'is one of',
                        not_in: 'is not one of',
                        is_set: 'is set',
                        is_not_set: 'is not set',
                        contains: 'contains',
                        not_contains: 'does not contain',
                        greater_than: 'is greater than',
                        less_than: 'is less than',
                      }

                      const fieldLabels: Record<string, string> = {
                        'event.event_type_id': 'Event Type',
                        'event.account_id': 'Account',
                        'event.assigned_to': 'Assigned To',
                      }

                      return (
                        <div key={index} className="text-sm text-amber-900 bg-amber-100 px-3 py-2 rounded">
                          <span className="font-medium">{index === 0 ? 'IF' : 'AND'}</span>{' '}
                          <span className="text-amber-800">{fieldLabels[condition.field] || condition.field}</span>{' '}
                          <span className="italic">{operatorLabels[condition.operator] || condition.operator}</span>
                          {displayValue !== undefined && displayValue !== null && (
                            <> <span className="font-medium">"{displayValue}"</span></>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-gray-400" />
              Actions Summary
            </h3>
            
            {loadingReferenceData ? (
              <div className="text-center py-8 text-gray-500">
                Loading action details...
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {actions.map((action, index) => {
                    const taskTemplate = action.taskTemplateId 
                      ? taskTemplates.find(t => t.id === action.taskTemplateId)
                      : null
                    
                    const designItemType = action.designItemTypeId
                      ? designItemTypes.find(d => d.id === action.designItemTypeId)
                      : null
                    
                    const assignedUser = action.assignedToUserId
                      ? users.find(u => u.id === action.assignedToUserId)
                      : null

                    const getUserName = (user: User) => {
                      if (user.first_name && user.last_name) {
                        return `${user.first_name} ${user.last_name}`
                      }
                      return user.email
                    }

                    return (
                      <div key={action.tempId} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-medium mr-3 flex-shrink-0 mt-1">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            {/* Action Type Header */}
                            <div className="flex items-center mb-2">
                              {action.actionType === 'create_task' ? (
                                <>
                                  <ClipboardCheck className="h-4 w-4 mr-2 text-blue-600" />
                                  <span className="font-medium text-gray-900">Create Task</span>
                                </>
                              ) : (
                                <>
                                  <Palette className="h-4 w-4 mr-2 text-purple-600" />
                                  <span className="font-medium text-gray-900">Create Design Item</span>
                                </>
                              )}
                            </div>

                            {/* Task Details */}
                            {action.actionType === 'create_task' && taskTemplate && (
                              <div className="space-y-1">
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Template:</span> {taskTemplate.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Task Title: "{taskTemplate.default_title}"
                                </div>
                              </div>
                            )}

                            {/* Design Item Details */}
                            {action.actionType === 'create_design_item' && designItemType && (
                              <div className="space-y-1">
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Design Item:</span> {designItemType.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Type: {designItemType.type === 'digital' ? '📱 Digital' : '📦 Physical'}
                                </div>
                              </div>
                            )}

                            {/* Assignment */}
                            {assignedUser && (
                              <div className="mt-2 flex items-center text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200 w-fit">
                                <User className="h-3 w-3 mr-1" />
                                <span>Assigned to: <strong>{getUserName(assignedUser)}</strong></span>
                              </div>
                            )}

                            {/* Unassigned */}
                            {action.actionType === 'create_design_item' && !assignedUser && (
                              <div className="mt-2 text-xs text-gray-500 italic">
                                Unassigned (can be assigned later)
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center text-sm text-green-800">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    <span>
                      <strong>{actions.length}</strong> action{actions.length !== 1 ? 's' : ''} will execute automatically when triggered
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Status Summary */}
          <div className={`rounded-lg p-4 border ${isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center text-sm">
              <CheckCircle2 className={`h-5 w-5 mr-2 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={isActive ? 'text-green-800 font-medium' : 'text-gray-600'}>
                {isActive ? 'Workflow will be active immediately after saving' : 'Workflow will be inactive (can be activated later in settings)'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step Navigation */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div>
          {currentStep !== 'trigger' && (
            <Button
              onClick={() => {
                if (currentStep === 'actions') setCurrentStep('trigger')
                if (currentStep === 'review') setCurrentStep('actions')
              }}
              variant="outline"
            >
              Previous
            </Button>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={saving}
          >
            Cancel
          </Button>

          {currentStep === 'trigger' && (
            <Button
              onClick={() => setCurrentStep('actions')}
              disabled={!canProceedToActions}
              className="bg-[#347dc4] hover:bg-[#2c6ba8] text-white"
            >
              Next: Add Actions
            </Button>
          )}

          {currentStep === 'actions' && (
            <Button
              onClick={() => setCurrentStep('review')}
              disabled={!canProceedToReview}
              className="bg-[#347dc4] hover:bg-[#2c6ba8] text-white"
            >
              Next: Review
            </Button>
          )}

          {currentStep === 'review' && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#347dc4] hover:bg-[#2c6ba8] text-white"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Workflow
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

