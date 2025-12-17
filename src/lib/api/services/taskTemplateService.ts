/**
 * Task Template Service
 *
 * Single Responsibility: Manage task templates
 *
 * Handles all task template CRUD operations following SOLID principles.
 * This service provides a clean API layer between components and the backend.
 */

export interface TaskTemplate {
  id: string
  tenant_id: string
  name: string
  description: string | null
  department: string
  task_type: string | null
  default_title: string
  default_description: string | null
  default_priority: 'low' | 'medium' | 'high' | 'urgent'
  default_due_in_days: number | null
  requires_assignment: boolean
  enabled: boolean
  display_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateTaskTemplateInput {
  name: string
  description?: string | null
  department: string
  task_type?: string | null
  default_title: string
  default_description?: string | null
  default_priority: 'low' | 'medium' | 'high' | 'urgent'
  default_due_in_days?: number | null
  requires_assignment?: boolean
  enabled?: boolean
  display_order?: number
}

export interface UpdateTaskTemplateInput extends Partial<CreateTaskTemplateInput> {
  id: string
}

/**
 * Task Template Service Class
 *
 * Provides methods for managing task templates with proper error handling
 * and consistent API patterns.
 */
class TaskTemplateService {
  /**
   * Get all templates for current tenant
   */
  async getAll(filters?: {
    department?: string
    task_type?: string
    enabled?: boolean
  }): Promise<TaskTemplate[]> {
    const params = new URLSearchParams()
    if (filters?.department) params.append('department', filters.department)
    if (filters?.task_type) params.append('task_type', filters.task_type)
    if (filters?.enabled !== undefined) params.append('enabled', String(filters.enabled))

    const response = await fetch(`/api/task-templates?${params}`)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch task templates' }))
      throw new Error(error.error || 'Failed to fetch task templates')
    }
    return response.json()
  }

  /**
   * Get templates by unified task type (for template dropdowns)
   * Only returns enabled templates, sorted by display_order
   */
  async getByTaskType(taskType: string): Promise<TaskTemplate[]> {
    return this.getAll({ task_type: taskType, enabled: true })
  }

  /**
   * Get templates by department (for quick-add menus)
   * Only returns enabled templates, sorted by display_order
   */
  async getByDepartment(department: string): Promise<TaskTemplate[]> {
    return this.getAll({ department, enabled: true })
  }

  /**
   * Get single template by ID
   */
  async getById(id: string): Promise<TaskTemplate> {
    const response = await fetch(`/api/task-templates/${id}`)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch task template' }))
      throw new Error(error.error || 'Failed to fetch task template')
    }
    return response.json()
  }

  /**
   * Create new template
   */
  async create(input: CreateTaskTemplateInput): Promise<TaskTemplate> {
    const response = await fetch('/api/task-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create task template' }))
      throw new Error(error.error || 'Failed to create task template')
    }

    const result = await response.json()
    return result.template
  }

  /**
   * Update existing template
   */
  async update(id: string, updates: Partial<CreateTaskTemplateInput>): Promise<TaskTemplate> {
    const response = await fetch(`/api/task-templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update task template' }))
      throw new Error(error.error || 'Failed to update task template')
    }

    const result = await response.json()
    return result.template
  }

  /**
   * Delete template
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/task-templates/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete task template' }))
      throw new Error(error.error || 'Failed to delete task template')
    }
  }

  /**
   * Toggle template enabled status
   */
  async toggleEnabled(id: string, enabled: boolean): Promise<TaskTemplate> {
    return this.update(id, { enabled })
  }

  /**
   * Reorder templates within a department
   */
  async reorder(department: string, templateIds: string[]): Promise<void> {
    const response = await fetch('/api/task-templates/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department, templateIds })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to reorder templates' }))
      throw new Error(error.error || 'Failed to reorder templates')
    }
  }
}

// Export singleton instance
export const taskTemplateService = new TaskTemplateService()
