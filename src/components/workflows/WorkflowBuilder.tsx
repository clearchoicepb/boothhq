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
import ActionsList from './ActionsList'
import type { 
  WorkflowWithRelations, 
  WorkflowSavePayload,
  WorkflowBuilderAction 
} from '@/types/workflows'

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
  const [eventTypeIds, setEventTypeIds] = useState<string[]>([])
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

      // Fetch design item types
      const designTypesRes = await fetch('/api/design/types')
      if (designTypesRes.ok) {
        const designData = await designTypesRes.json()
        setDesignItemTypes(designData.types || designData.designTypes || designData || [])
      }

      // Fetch users
      const usersRes = await fetch('/api/users')
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(Array.isArray(usersData) ? usersData : [])
      }
    } catch (error) {
      console.error('Error fetching reference data:', error)
    } finally {
      setLoadingReferenceData(false)
    }
  }

  // Initialize from existing workflow
  useEffect(() => {
    if (workflow) {
      setName(workflow.name)
      setDescription(workflow.description || '')
      setEventTypeIds(workflow.event_type_ids || [])
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

    // Validate name
    if (!name.trim()) {
      validationErrors.push('Workflow name is required')
    }

    // Validate trigger
    if (eventTypeIds.length === 0) {
      validationErrors.push('At least one event type is required')
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
        trigger_type: 'event_created',
        event_type_ids: eventTypeIds,
        is_active: isActive,
      },
      actions: actions.map((action, index) => ({
        action_type: action.actionType,
        execution_order: index,
        task_template_id: action.taskTemplateId,
        design_item_type_id: action.designItemTypeId,
        assigned_to_user_id: action.assignedToUserId,
        config: action.config,
      })),
    }

    await onSave(payload)
  }

  const canProceedToActions = eventTypeIds.length > 0
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
        <TriggerSelector
          selectedEventTypeIds={eventTypeIds}
          onSelect={setEventTypeIds}
        />
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
                <h3 className="text-sm font-medium text-blue-900 mb-2">Workflow Triggers</h3>
                <p className="text-sm text-blue-700 mb-2">
                  This workflow will execute when any of these event types are created:
                </p>
                {loadingReferenceData ? (
                  <div className="text-sm text-blue-700">Loading event types...</div>
                ) : (
                  <div className="mt-2 space-y-1">
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
              </div>
            </div>
          </div>

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

