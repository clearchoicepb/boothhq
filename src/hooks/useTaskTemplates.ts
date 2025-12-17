/**
 * Task Templates Hooks
 *
 * React Query hooks for managing task templates.
 * Following SOLID principles - hooks handle data fetching, mutations, and caching.
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  taskTemplateService,
  type TaskTemplate,
  type CreateTaskTemplateInput,
} from '@/lib/api/services/taskTemplateService'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'

const log = createLogger('hooks')

/**
 * Hook to fetch all task templates
 *
 * @param filters - Optional filters for department, task_type, and enabled status
 * @returns Query result with task templates
 *
 * @example
 * const { data: templates, isLoading } = useTaskTemplates()
 *
 * @example
 * const { data: salesTemplates } = useTaskTemplates({ department: 'sales', enabled: true })
 *
 * @example
 * const { data: designTemplates } = useTaskTemplates({ task_type: 'design', enabled: true })
 */
export function useTaskTemplates(filters?: {
  department?: string
  task_type?: string
  enabled?: boolean
}) {
  return useQuery({
    queryKey: ['task-templates', filters],
    queryFn: () => taskTemplateService.getAll(filters),
  })
}

/**
 * Hook to fetch templates for a specific task type
 * Only returns enabled templates, useful for template dropdowns in task creation
 *
 * @param taskType - Unified task type (general, design, operations, etc.)
 * @returns Query result with enabled templates for the task type
 *
 * @example
 * const { data: designTemplates } = useTaskTemplatesByTaskType('design')
 */
export function useTaskTemplatesByTaskType(taskType: string) {
  return useQuery({
    queryKey: ['task-templates', 'task-type', taskType],
    queryFn: () => taskTemplateService.getByTaskType(taskType),
    enabled: !!taskType,
  })
}

/**
 * Hook to fetch templates for a specific department
 * Only returns enabled templates, useful for quick-add menus
 *
 * @param department - Department ID
 * @returns Query result with enabled templates for the department
 *
 * @example
 * const { data: salesTemplates } = useTaskTemplatesByDepartment('sales')
 */
export function useTaskTemplatesByDepartment(department: string) {
  return useQuery({
    queryKey: ['task-templates', 'department', department],
    queryFn: () => taskTemplateService.getByDepartment(department),
    enabled: !!department,
  })
}

/**
 * Hook to fetch a single template by ID
 *
 * @param id - Template ID
 * @returns Query result with the template
 *
 * @example
 * const { data: template } = useTaskTemplate(templateId)
 */
export function useTaskTemplate(id: string) {
  return useQuery({
    queryKey: ['task-templates', id],
    queryFn: () => taskTemplateService.getById(id),
    enabled: !!id,
  })
}

/**
 * Hook for task template mutations (create, update, delete, toggle)
 *
 * @returns Object with mutation functions
 *
 * @example
 * const { createTemplate, updateTemplate, deleteTemplate } = useTaskTemplateMutations()
 *
 * createTemplate.mutate({
 *   name: 'Follow Up Lead',
 *   department: 'sales',
 *   default_title: 'Follow up with lead',
 *   default_priority: 'high'
 * })
 */
export function useTaskTemplateMutations() {
  const queryClient = useQueryClient()

  const createTemplate = useMutation({
    mutationFn: (input: CreateTaskTemplateInput) =>
      taskTemplateService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] })
      toast.success('Template created successfully')
    },
    onError: (error: Error) => {
      log.error({ error }, 'Failed to create template')
      toast.error(error.message || 'Failed to create template')
    },
  })

  const updateTemplate = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<CreateTaskTemplateInput>
    }) => taskTemplateService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] })
      toast.success('Template updated successfully')
    },
    onError: (error: Error) => {
      log.error({ error }, 'Failed to update template')
      toast.error(error.message || 'Failed to update template')
    },
  })

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => taskTemplateService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] })
      toast.success('Template deleted successfully')
    },
    onError: (error: Error) => {
      log.error({ error }, 'Failed to delete template')
      toast.error(error.message || 'Failed to delete template')
    },
  })

  const toggleEnabled = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      taskTemplateService.toggleEnabled(id, enabled),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] })
      toast.success(
        variables.enabled ? 'Template enabled' : 'Template disabled'
      )
    },
    onError: (error: Error) => {
      log.error({ error }, 'Failed to toggle template')
      toast.error(error.message || 'Failed to toggle template')
    },
  })

  return {
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleEnabled,
  }
}
