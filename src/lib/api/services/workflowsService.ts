/**
 * Workflows Service
 * Centralized service for all workflow-related API calls
 *
 * Following SOLID architecture (same pattern as tasksService.ts):
 * - Single Responsibility: Only handles workflow API communication
 * - Dependency Inversion: Components depend on this abstraction, not fetch()
 * - Open/Closed: Easy to extend with new methods without modifying consumers
 *
 * Benefits:
 * - Type safety with TypeScript
 * - Automatic retry logic via apiClient
 * - Centralized error handling
 * - Easy to test (mock this service)
 * - Easy to add caching, logging, etc. in one place
 *
 * @example
 * import { workflowsService } from '@/lib/api/services/workflowsService'
 *
 * // List all workflows
 * const workflows = await workflowsService.list()
 *
 * // Create a new workflow
 * const workflow = await workflowsService.create({
 *   name: 'Wedding Workflow',
 *   event_type_id: 'event-type-id',
 *   actions: [...]
 * })
 */

import { apiClient } from '../apiClient'
import type {
  Workflow,
  WorkflowWithRelations,
  WorkflowInsert,
  WorkflowUpdate,
  WorkflowSavePayload,
  WorkflowListOptions,
  WorkflowStats,
  WorkflowWithStats,
  WorkflowExecution,
  WorkflowExecutionWithRelations,
  WorkflowExecutionListOptions,
} from '@/types/workflows'

/**
 * Workflow creation response
 */
export interface WorkflowCreateResponse {
  success: boolean
  workflow: WorkflowWithRelations
}

/**
 * Workflow validation response
 */
export interface WorkflowValidationResponse {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Workflows Service Class
 */
class WorkflowsService {
  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFLOW CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List workflows with filters and pagination
   *
   * @param options - Filter and pagination options
   * @returns Array of workflows with relations
   *
   * @example
   * // Get all active workflows
   * const workflows = await workflowsService.list({ isActive: true })
   *
   * @example
   * // Get workflows for specific event type
   * const workflows = await workflowsService.list({ eventTypeId: 'event-type-id' })
   */
  async list(options: WorkflowListOptions = {}): Promise<WorkflowWithRelations[]> {
    const params = new URLSearchParams()

    // Filters
    if (options.eventTypeId) params.append('eventTypeId', options.eventTypeId)
    if (options.isActive !== undefined) params.append('isActive', String(options.isActive))
    if (options.search) params.append('search', options.search)
    if (options.createdBy) params.append('createdBy', options.createdBy)

    // Pagination
    if (options.page) params.append('page', options.page.toString())
    if (options.limit) params.append('limit', options.limit.toString())

    // Sorting
    if (options.sortBy) params.append('sortBy', options.sortBy)
    if (options.sortOrder) params.append('sortOrder', options.sortOrder)

    const queryString = params.toString()
    const url = `/api/workflows${queryString ? `?${queryString}` : ''}`

    return apiClient.get<WorkflowWithRelations[]>(url)
  }

  /**
   * Get a single workflow by ID
   *
   * @param id - Workflow ID
   * @returns Workflow with relations
   */
  async getById(id: string): Promise<WorkflowWithRelations> {
    return apiClient.get<WorkflowWithRelations>(`/api/workflows/${id}`)
  }

  /**
   * Get workflow with statistics
   *
   * @param id - Workflow ID
   * @returns Workflow with execution stats
   */
  async getWithStats(id: string): Promise<WorkflowWithStats> {
    return apiClient.get<WorkflowWithStats>(`/api/workflows/${id}?includeStats=true`)
  }

  /**
   * Create a new workflow
   *
   * @param payload - Workflow data with actions
   * @returns Created workflow with relations
   *
   * @example
   * const workflow = await workflowsService.create({
   *   workflow: {
   *     name: 'Wedding Event Workflow',
   *     description: 'Tasks for wedding events',
   *     trigger_type: 'event_created',
   *     event_type_id: 'wedding-type-id',
   *     is_active: true
   *   },
   *   actions: [
   *     {
   *       action_type: 'create_task',
   *       execution_order: 0,
   *       task_template_id: 'template-1',
   *       assigned_to_user_id: 'user-1'
   *     },
   *     {
   *       action_type: 'create_task',
   *       execution_order: 1,
   *       task_template_id: 'template-2',
   *       assigned_to_user_id: 'user-2'
   *     }
   *   ]
   * })
   */
  async create(payload: WorkflowSavePayload): Promise<WorkflowWithRelations> {
    const response = await apiClient.post<WorkflowCreateResponse>('/api/workflows', payload)
    return response.workflow
  }

  /**
   * Update an existing workflow
   *
   * @param id - Workflow ID
   * @param data - Partial workflow data to update
   * @returns Updated workflow with relations
   */
  async update(id: string, data: WorkflowUpdate): Promise<WorkflowWithRelations> {
    return apiClient.patch<WorkflowWithRelations>(`/api/workflows/${id}`, data)
  }

  /**
   * Update workflow actions
   * Replaces all actions for a workflow
   *
   * @param id - Workflow ID
   * @param actions - New actions array
   * @returns Updated workflow with relations
   */
  async updateActions(
    id: string,
    actions: WorkflowSavePayload['actions']
  ): Promise<WorkflowWithRelations> {
    return apiClient.patch<WorkflowWithRelations>(`/api/workflows/${id}/actions`, { actions })
  }

  /**
   * Activate a workflow
   *
   * @param id - Workflow ID
   * @returns Updated workflow
   */
  async activate(id: string): Promise<WorkflowWithRelations> {
    return this.update(id, { is_active: true })
  }

  /**
   * Deactivate a workflow
   *
   * @param id - Workflow ID
   * @returns Updated workflow
   */
  async deactivate(id: string): Promise<WorkflowWithRelations> {
    return this.update(id, { is_active: false })
  }

  /**
   * Delete a workflow
   *
   * @param id - Workflow ID
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`/api/workflows/${id}`)
  }

  /**
   * Duplicate a workflow
   * Creates a copy of an existing workflow with "(Copy)" appended to name
   *
   * @param id - Workflow ID to duplicate
   * @returns New workflow
   */
  async duplicate(id: string): Promise<WorkflowWithRelations> {
    return apiClient.post<WorkflowWithRelations>(`/api/workflows/${id}/duplicate`, {})
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Validate a workflow before saving
   * Checks required fields, validates references (event types, templates, users)
   *
   * @param payload - Workflow data to validate
   * @returns Validation result with errors and warnings
   *
   * @example
   * const result = await workflowsService.validate(workflowData)
   * if (!result.isValid) {
   *   console.error('Validation errors:', result.errors)
   * }
   */
  async validate(payload: WorkflowSavePayload): Promise<WorkflowValidationResponse> {
    return apiClient.post<WorkflowValidationResponse>('/api/workflows/validate', payload)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFLOW EXECUTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List workflow executions
   * Used for audit logs and monitoring
   *
   * @param options - Filter and pagination options
   * @returns Array of workflow executions
   *
   * @example
   * // Get all executions for a workflow
   * const executions = await workflowsService.listExecutions({
   *   workflowId: 'workflow-id'
   * })
   *
   * @example
   * // Get failed executions
   * const failedExecutions = await workflowsService.listExecutions({
   *   status: 'failed'
   * })
   */
  async listExecutions(
    options: WorkflowExecutionListOptions = {}
  ): Promise<WorkflowExecutionWithRelations[]> {
    const params = new URLSearchParams()

    // Filters
    if (options.workflowId) params.append('workflowId', options.workflowId)
    if (options.triggerEntityType) params.append('triggerEntityType', options.triggerEntityType)
    if (options.triggerEntityId) params.append('triggerEntityId', options.triggerEntityId)
    if (options.status) params.append('status', options.status)
    if (options.startedFrom) params.append('startedFrom', options.startedFrom)
    if (options.startedTo) params.append('startedTo', options.startedTo)

    // Pagination
    if (options.page) params.append('page', options.page.toString())
    if (options.limit) params.append('limit', options.limit.toString())

    // Sorting
    if (options.sortBy) params.append('sortBy', options.sortBy)
    if (options.sortOrder) params.append('sortOrder', options.sortOrder)

    const queryString = params.toString()
    const url = `/api/workflows/executions${queryString ? `?${queryString}` : ''}`

    return apiClient.get<WorkflowExecutionWithRelations[]>(url)
  }

  /**
   * Get a single workflow execution by ID
   *
   * @param id - Execution ID
   * @returns Workflow execution with details
   */
  async getExecution(id: string): Promise<WorkflowExecutionWithRelations> {
    return apiClient.get<WorkflowExecutionWithRelations>(`/api/workflows/executions/${id}`)
  }

  /**
   * Get executions for a specific workflow
   *
   * @param workflowId - Workflow ID
   * @param options - Additional filters
   * @returns Array of executions
   */
  async getExecutionsByWorkflow(
    workflowId: string,
    options: Omit<WorkflowExecutionListOptions, 'workflowId'> = {}
  ): Promise<WorkflowExecutionWithRelations[]> {
    return this.listExecutions({
      ...options,
      workflowId,
    })
  }

  /**
   * Get executions for a specific entity (e.g., event)
   *
   * @param entityType - Entity type (e.g., 'event')
   * @param entityId - Entity ID
   * @param options - Additional filters
   * @returns Array of executions
   */
  async getExecutionsByEntity(
    entityType: string,
    entityId: string,
    options: Omit<WorkflowExecutionListOptions, 'triggerEntityType' | 'triggerEntityId'> = {}
  ): Promise<WorkflowExecutionWithRelations[]> {
    return this.listExecutions({
      ...options,
      triggerEntityType: entityType,
      triggerEntityId: entityId,
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get workflow statistics
   * Returns aggregated stats for all workflows
   *
   * @returns Workflow statistics
   */
  async getStats(): Promise<WorkflowStats> {
    return apiClient.get<WorkflowStats>('/api/workflows/stats')
  }

  /**
   * Get statistics for a specific workflow
   *
   * @param workflowId - Workflow ID
   * @returns Workflow-specific statistics
   */
  async getWorkflowStats(workflowId: string): Promise<{
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
    partialExecutions: number
    lastExecutedAt: string | null
    totalTasksCreated: number
    averageExecutionTime: number
  }> {
    return apiClient.get(`/api/workflows/${workflowId}/stats`)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MANUAL EXECUTION (FOR TESTING)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Manually execute a workflow
   * Useful for testing workflows without creating actual events
   *
   * @param workflowId - Workflow ID to execute
   * @param eventId - Event ID to use as trigger (for context)
   * @returns Execution result
   */
  async executeManually(
    workflowId: string,
    eventId: string
  ): Promise<{
    success: boolean
    executionId: string
    tasksCreated: number
    errors?: string[]
  }> {
    return apiClient.post(`/api/workflows/${workflowId}/execute`, { eventId })
  }
}

// Export singleton instance
export const workflowsService = new WorkflowsService()

// Also export the class for testing/mocking
export { WorkflowsService }

