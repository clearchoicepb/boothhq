/**
 * Unified Task Service
 *
 * Single service for all task operations regardless of task_type.
 * Replaces separate handling of tasks, design items, and operations items.
 *
 * This service provides:
 * - Unified task creation (general, design, operations, sales, admin, project, misc)
 * - Task updates with automatic status change handling
 * - Filtered queries by task type
 * - Template-based task creation with timeline calculations
 * - My Tasks aggregation across all task types
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type UnifiedTaskType = 'general' | 'design' | 'operations' | 'sales' | 'admin' | 'project' | 'misc'

export type UnifiedTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'awaiting_approval'
  | 'needs_revision'
  | 'approved'
  | 'completed'
  | 'cancelled'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface CreateTaskInput {
  tenant_id: string
  title: string
  description?: string
  task_type: UnifiedTaskType
  task_template_id?: string
  assigned_to?: string
  created_by?: string
  entity_type?: string  // 'event', 'opportunity', 'project', 'account'
  entity_id?: string
  event_date_id?: string
  project_id?: string
  due_date?: string
  priority?: TaskPriority
  department?: string

  // Design-specific fields (optional, used when task_type = 'design')
  quantity?: number
  requires_approval?: boolean
  design_deadline?: string
  design_start_date?: string
  product_id?: string
  client_notes?: string
  internal_notes?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: UnifiedTaskStatus
  assigned_to?: string | null
  due_date?: string | null
  priority?: TaskPriority

  // Design-specific updates
  quantity?: number
  revision_count?: number
  design_file_urls?: string[]
  proof_file_urls?: string[]
  final_file_urls?: string[]
  client_notes?: string
  internal_notes?: string
  approval_notes?: string

  // Status workflow
  submitted_for_approval_at?: string | null
  approved_at?: string | null
  approved_by?: string | null
  started_at?: string | null
  completed_at?: string | null
}

export interface TaskFilters {
  status?: UnifiedTaskStatus | UnifiedTaskStatus[]
  assigned_to?: string
  entity_type?: string
  entity_id?: string
  requires_approval?: boolean
  department?: string
  due_date_before?: string
  due_date_after?: string
}

export interface UnifiedTask {
  id: string
  tenant_id: string
  title: string
  description: string | null
  status: UnifiedTaskStatus
  priority: TaskPriority
  task_type: UnifiedTaskType
  task_template_id: string | null
  department: string | null
  assigned_to: string | null
  created_by: string | null
  entity_type: string | null
  entity_id: string | null
  event_date_id: string | null
  project_id: string | null
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string

  // Design-specific fields
  quantity: number | null
  revision_count: number | null
  design_file_urls: string[] | null
  proof_file_urls: string[] | null
  final_file_urls: string[] | null
  client_notes: string | null
  internal_notes: string | null
  design_deadline: string | null
  design_start_date: string | null
  product_id: string | null

  // Approval workflow
  requires_approval: boolean
  approved_by: string | null
  approval_notes: string | null
  submitted_for_approval_at: string | null
  approved_at: string | null

  // Timeline
  assigned_at: string | null
  started_at: string | null

  // Workflow tracking
  auto_created: boolean | null
  workflow_id: string | null
  workflow_execution_id: string | null

  // Migration tracking
  migrated_from_table: string | null
  migrated_from_id: string | null
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export const unifiedTaskService = {
  /**
   * Create a new task of any type
   */
  async create(
    supabase: SupabaseClient<Database>,
    input: CreateTaskInput
  ): Promise<{ data: UnifiedTask | null; error: Error | null }> {
    const taskData: Record<string, unknown> = {
      tenant_id: input.tenant_id,
      title: input.title,
      description: input.description || null,
      task_type: input.task_type,
      task_template_id: input.task_template_id || null,
      assigned_to: input.assigned_to || null,
      created_by: input.created_by || null,
      entity_type: input.entity_type || null,
      entity_id: input.entity_id || null,
      event_date_id: input.event_date_id || null,
      project_id: input.project_id || null,
      due_date: input.due_date || null,
      priority: input.priority || 'medium',
      department: input.department || input.task_type,
      status: 'pending',

      // Design fields
      quantity: input.quantity ?? (input.task_type === 'design' ? 1 : null),
      requires_approval: input.requires_approval ?? (input.task_type === 'design'),
      design_deadline: input.design_deadline || null,
      design_start_date: input.design_start_date || null,
      product_id: input.product_id || null,
      client_notes: input.client_notes || null,
      internal_notes: input.internal_notes || null,

      // Timestamps
      assigned_at: input.assigned_to ? new Date().toISOString() : null,
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData as any)
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data: data as UnifiedTask, error: null }
  },

  /**
   * Update any task - handles all task types uniformly
   */
  async update(
    supabase: SupabaseClient<Database>,
    taskId: string,
    tenantId: string,
    input: UpdateTaskInput
  ): Promise<{ data: UnifiedTask | null; error: Error | null }> {
    // Build update object, only including provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    // Map all provided fields
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        updateData[key] = value
      }
    })

    // Handle status change side effects
    if (input.status) {
      if (input.status === 'completed' || input.status === 'approved') {
        updateData.completed_at = updateData.completed_at || new Date().toISOString()
      }
      if (input.status === 'in_progress' && input.started_at === undefined) {
        updateData.started_at = new Date().toISOString()
      }
      if (input.status === 'awaiting_approval' && input.submitted_for_approval_at === undefined) {
        updateData.submitted_for_approval_at = new Date().toISOString()
      }
    }

    // Handle assignment change
    if (input.assigned_to !== undefined) {
      updateData.assigned_at = input.assigned_to ? new Date().toISOString() : null
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData as any)
      .eq('id', taskId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data: data as UnifiedTask, error: null }
  },

  /**
   * Get tasks by type (for dashboards)
   */
  async getByType(
    supabase: SupabaseClient<Database>,
    tenantId: string,
    taskType: UnifiedTaskType,
    filters?: TaskFilters
  ): Promise<{ data: UnifiedTask[]; error: Error | null }> {
    let query = supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email, avatar_url),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name)
      `)
      .eq('tenant_id', tenantId)
      .eq('task_type', taskType)

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    if (filters?.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to)
    }

    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type)
    }

    if (filters?.entity_id) {
      query = query.eq('entity_id', filters.entity_id)
    }

    if (filters?.requires_approval !== undefined) {
      query = query.eq('requires_approval', filters.requires_approval)
    }

    if (filters?.department) {
      query = query.eq('department', filters.department)
    }

    if (filters?.due_date_before) {
      query = query.lte('due_date', filters.due_date_before)
    }

    if (filters?.due_date_after) {
      query = query.gte('due_date', filters.due_date_after)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return { data: [], error: new Error(error.message) }
    }

    return { data: (data || []) as UnifiedTask[], error: null }
  },

  /**
   * Get all tasks for "My Tasks" - regardless of type
   */
  async getMyTasks(
    supabase: SupabaseClient<Database>,
    tenantId: string,
    userId: string,
    includeCompleted: boolean = false
  ): Promise<{ data: UnifiedTask[]; error: Error | null }> {
    let query = supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email, avatar_url)
      `)
      .eq('tenant_id', tenantId)
      .eq('assigned_to', userId)

    if (!includeCompleted) {
      query = query.not('status', 'in', '("completed","cancelled","approved")')
    }

    const { data: tasks, error } = await query.order('due_date', { ascending: true, nullsFirst: false })

    if (error) {
      return { data: [], error: new Error(error.message) }
    }

    // Fetch event data for tasks linked to events (polymorphic relationship)
    const eventTasks = (tasks || []).filter(t => t.entity_type === 'event' && t.entity_id)
    const eventIds = [...new Set(eventTasks.map(t => t.entity_id))]

    let eventsMap: Record<string, any> = {}
    if (eventIds.length > 0) {
      const { data: events } = await supabase
        .from('events')
        .select('id, event_name, event_date, client_name')
        .in('id', eventIds)

      if (events) {
        eventsMap = Object.fromEntries(events.map(e => [e.id, e]))
      }
    }

    // Attach event data to tasks
    const data = (tasks || []).map(task => ({
      ...task,
      event: task.entity_type === 'event' && task.entity_id ? eventsMap[task.entity_id] || null : null
    }))

    return { data: data as UnifiedTask[], error: null }
  },

  /**
   * Get tasks for an entity (event, opportunity, etc.)
   */
  async getForEntity(
    supabase: SupabaseClient<Database>,
    tenantId: string,
    entityType: string,
    entityId: string,
    taskType?: UnifiedTaskType
  ): Promise<{ data: UnifiedTask[]; error: Error | null }> {
    let query = supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email, avatar_url),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name),
        template:task_templates(id, name, task_type)
      `)
      .eq('tenant_id', tenantId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)

    if (taskType) {
      query = query.eq('task_type', taskType)
    }

    const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false })

    if (error) {
      return { data: [], error: new Error(error.message) }
    }

    return { data: (data || []) as UnifiedTask[], error: null }
  },

  /**
   * Create task from template
   */
  async createFromTemplate(
    supabase: SupabaseClient<Database>,
    tenantId: string,
    templateId: string,
    overrides: Partial<CreateTaskInput>
  ): Promise<{ data: UnifiedTask | null; error: Error | null }> {
    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('task_templates')
      .select('*')
      .eq('id', templateId)
      .eq('tenant_id', tenantId)
      .single()

    if (templateError || !template) {
      return { data: null, error: templateError || new Error('Template not found') }
    }

    // Calculate due date if template has days_before_event and we have an event
    let calculatedDueDate = overrides.due_date
    if (!calculatedDueDate && template.days_before_event && overrides.entity_type === 'event' && overrides.entity_id) {
      // Fetch event date
      const { data: event } = await supabase
        .from('events')
        .select('event_date, start_date')
        .eq('id', overrides.entity_id)
        .single()

      const eventDate = event?.start_date || event?.event_date
      if (eventDate) {
        const eventDateObj = new Date(eventDate)
        eventDateObj.setDate(eventDateObj.getDate() - template.days_before_event)
        calculatedDueDate = eventDateObj.toISOString().split('T')[0]
      }
    }

    // Calculate start date
    let calculatedStartDate = overrides.design_start_date
    if (!calculatedStartDate && template.start_days_before_event && overrides.entity_type === 'event' && overrides.entity_id) {
      const { data: event } = await supabase
        .from('events')
        .select('event_date, start_date')
        .eq('id', overrides.entity_id)
        .single()

      const eventDate = event?.start_date || event?.event_date
      if (eventDate) {
        const eventDateObj = new Date(eventDate)
        eventDateObj.setDate(eventDateObj.getDate() - template.start_days_before_event)
        calculatedStartDate = eventDateObj.toISOString().split('T')[0]
      }
    }

    // Create task with template defaults + overrides
    return this.create(supabase, {
      tenant_id: tenantId,
      title: overrides.title || template.default_title || template.name,
      description: overrides.description || template.default_description,
      task_type: (template.task_type as UnifiedTaskType) || 'general',
      task_template_id: templateId,
      department: template.department,
      requires_approval: template.requires_approval,
      quantity: template.default_quantity,
      due_date: calculatedDueDate,
      design_deadline: calculatedDueDate,
      design_start_date: calculatedStartDate,
      priority: (template.default_priority as TaskPriority) || 'medium',
      ...overrides,
    })
  },

  /**
   * Submit task for approval (design tasks)
   */
  async submitForApproval(
    supabase: SupabaseClient<Database>,
    taskId: string,
    tenantId: string
  ): Promise<{ data: UnifiedTask | null; error: Error | null }> {
    return this.update(supabase, taskId, tenantId, {
      status: 'awaiting_approval',
      submitted_for_approval_at: new Date().toISOString(),
    })
  },

  /**
   * Approve task
   */
  async approve(
    supabase: SupabaseClient<Database>,
    taskId: string,
    tenantId: string,
    approvedBy: string,
    approvalNotes?: string
  ): Promise<{ data: UnifiedTask | null; error: Error | null }> {
    return this.update(supabase, taskId, tenantId, {
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      approval_notes: approvalNotes,
    })
  },

  /**
   * Request revision on task
   */
  async requestRevision(
    supabase: SupabaseClient<Database>,
    taskId: string,
    tenantId: string,
    notes: string
  ): Promise<{ data: UnifiedTask | null; error: Error | null }> {
    // First get current revision count
    const { data: current } = await supabase
      .from('tasks')
      .select('revision_count')
      .eq('id', taskId)
      .eq('tenant_id', tenantId)
      .single()

    return this.update(supabase, taskId, tenantId, {
      status: 'needs_revision',
      approval_notes: notes,
      revision_count: (current?.revision_count || 0) + 1,
    })
  },
}

export type { UnifiedTask as Task }
