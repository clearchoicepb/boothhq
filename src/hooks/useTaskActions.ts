/**
 * Task Actions Hook
 * React Query mutations for task CRUD operations
 *
 * Following SOLID principles:
 * - Handles all mutations (create, update, delete)
 * - Automatic cache invalidation on success
 * - Optimistic updates for better UX
 * - Error handling and rollback
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksService } from '@/lib/api/services/tasksService'
import type { TaskInsert, TaskUpdate, TaskWithRelations } from '@/types/tasks'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'

const log = createLogger('hooks')

/**
 * Hook for creating a new task
 *
 * @example
 * const { createTask, isPending } = useCreateTask()
 *
 * await createTask({
 *   title: 'Follow up with client',
 *   department: 'sales',
 *   priority: 'high',
 *   assignedTo: userId
 * })
 */
export function useCreateTask() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: TaskInsert) => tasksService.create(data),
    onSuccess: (newTask) => {
      // Invalidate all task queries to refetch with new data
      queryClient.invalidateQueries({ queryKey: ['tasks'] })

      // Also invalidate related entity queries if task is linked to an entity
      if (newTask.entity_type && newTask.entity_id) {
        queryClient.invalidateQueries({
          queryKey: ['tasks', 'entity', newTask.entity_type, newTask.entity_id]
        })
      }

      toast.success('Task created successfully')
    },
    onError: (error: any) => {
      log.error({ error }, 'Failed to create task')
      toast.error(error.message || 'Failed to create task')
    },
  })

  return {
    createTask: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}

/**
 * Hook for creating a task from a template
 *
 * @example
 * const { createFromTemplate, isPending } = useCreateTaskFromTemplate()
 *
 * await createFromTemplate({
 *   templateId: 'template-123',
 *   entityType: 'opportunity',
 *   entityId: 'opp-456',
 *   assignedTo: userId
 * })
 */
export function useCreateTaskFromTemplate() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (options: {
      templateId: string
      entityType?: string | null
      entityId?: string | null
      eventDateId?: string | null
      assignedTo?: string | null
      title?: string
      priority?: 'low' | 'medium' | 'high' | 'urgent'
      dueDate?: string | null
    }) => tasksService.createFromTemplate(options),
    onSuccess: (newTask) => {
      // Invalidate all task queries to refetch with new data
      queryClient.invalidateQueries({ queryKey: ['tasks'] })

      // Also invalidate related entity queries if task is linked to an entity
      if (newTask.entity_type && newTask.entity_id) {
        queryClient.invalidateQueries({
          queryKey: ['tasks', 'entity', newTask.entity_type, newTask.entity_id]
        })
      }

      toast.success('Task created from template')
    },
    onError: (error: any) => {
      log.error({ error }, 'Failed to create task from template')
      toast.error(error.message || 'Failed to create task from template')
    },
  })

  return {
    createFromTemplate: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}

/**
 * Hook for updating a task
 *
 * @example
 * const { updateTask, isPending } = useUpdateTask()
 *
 * await updateTask({
 *   taskId: 'task-123',
 *   updates: { status: 'completed' }
 * })
 */
export function useUpdateTask() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: TaskUpdate }) =>
      tasksService.update(taskId, updates),
    onSuccess: (updatedTask, variables) => {
      // Update the specific task in cache
      queryClient.setQueryData(['tasks', variables.taskId], updatedTask)

      // Invalidate all task lists to refetch
      queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false })

      toast.success('Task updated successfully')
    },
    onError: (error: any) => {
      log.error({ error }, 'Failed to update task')
      toast.error(error.message || 'Failed to update task')
    },
  })

  return {
    updateTask: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}

/**
 * Hook for updating task status
 * Convenience hook for the common operation of changing status
 *
 * @example
 * const { updateStatus, isPending } = useUpdateTaskStatus()
 *
 * await updateStatus({
 *   taskId: 'task-123',
 *   status: 'completed'
 * })
 */
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: 'pending' | 'in_progress' | 'completed' | 'cancelled' }) =>
      tasksService.updateStatus(taskId, status),
    onMutate: async ({ taskId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks', taskId] })

      // Snapshot previous value
      const previousTask = queryClient.getQueryData<TaskWithRelations>(['tasks', taskId])

      // Optimistically update the cache
      if (previousTask) {
        queryClient.setQueryData(['tasks', taskId], {
          ...previousTask,
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
      }

      return { previousTask }
    },
    onSuccess: (updatedTask, variables) => {
      // Update with real data from server
      queryClient.setQueryData(['tasks', variables.taskId], updatedTask)

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false })

      const statusMessages = {
        pending: 'Task marked as pending',
        in_progress: 'Task in progress',
        completed: 'Task completed!',
        cancelled: 'Task cancelled',
      }
      toast.success(statusMessages[variables.status])
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(['tasks', variables.taskId], context.previousTask)
      }
      log.error({ error }, 'Failed to update task status')
      toast.error(error.message || 'Failed to update task status')
    },
  })

  return {
    updateStatus: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}

/**
 * Hook for reassigning a task to a different user
 *
 * @example
 * const { reassignTask, isPending } = useReassignTask()
 *
 * await reassignTask({
 *   taskId: 'task-123',
 *   assignedTo: 'user-456'
 * })
 */
export function useReassignTask() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ taskId, assignedTo }: { taskId: string; assignedTo: string | null }) =>
      tasksService.reassign(taskId, assignedTo),
    onSuccess: (updatedTask, variables) => {
      queryClient.setQueryData(['tasks', variables.taskId], updatedTask)
      queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false })

      toast.success(
        variables.assignedTo
          ? 'Task reassigned successfully'
          : 'Task unassigned'
      )
    },
    onError: (error: any) => {
      log.error({ error }, 'Failed to reassign task')
      toast.error(error.message || 'Failed to reassign task')
    },
  })

  return {
    reassignTask: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}

/**
 * Hook for updating task priority
 *
 * @example
 * const { updatePriority, isPending } = useUpdateTaskPriority()
 *
 * await updatePriority({
 *   taskId: 'task-123',
 *   priority: 'urgent'
 * })
 */
export function useUpdateTaskPriority() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ taskId, priority }: { taskId: string; priority: 'low' | 'medium' | 'high' | 'urgent' }) =>
      tasksService.updatePriority(taskId, priority),
    onSuccess: (updatedTask, variables) => {
      queryClient.setQueryData(['tasks', variables.taskId], updatedTask)
      queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false })

      toast.success(`Priority updated to ${variables.priority}`)
    },
    onError: (error: any) => {
      log.error({ error }, 'Failed to update priority')
      toast.error(error.message || 'Failed to update priority')
    },
  })

  return {
    updatePriority: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}

/**
 * Hook for deleting a task
 *
 * @example
 * const { deleteTask, isPending } = useDeleteTask()
 *
 * await deleteTask('task-123')
 */
export function useDeleteTask() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (taskId: string) => tasksService.delete(taskId),
    onSuccess: (_, taskId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['tasks', taskId] })

      // Invalidate all task lists
      queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false })

      toast.success('Task deleted successfully')
    },
    onError: (error: any) => {
      log.error({ error }, 'Failed to delete task')
      toast.error(error.message || 'Failed to delete task')
    },
  })

  return {
    deleteTask: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}

/**
 * Hook for bulk updating tasks
 *
 * @example
 * const { bulkUpdate, isPending } = useBulkUpdateTasks()
 *
 * await bulkUpdate({
 *   taskIds: ['task-1', 'task-2', 'task-3'],
 *   updates: { status: 'completed' }
 * })
 */
export function useBulkUpdateTasks() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ taskIds, updates }: { taskIds: string[]; updates: TaskUpdate }) =>
      tasksService.bulkUpdate(taskIds, updates),
    onSuccess: (_, variables) => {
      // Invalidate all task queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] })

      toast.success(`${variables.taskIds.length} tasks updated successfully`)
    },
    onError: (error: any) => {
      log.error({ error }, 'Failed to bulk update tasks')
      toast.error(error.message || 'Failed to update tasks')
    },
  })

  return {
    bulkUpdate: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}

/**
 * Hook for bulk deleting tasks
 *
 * @example
 * const { bulkDelete, isPending } = useBulkDeleteTasks()
 *
 * await bulkDelete(['task-1', 'task-2', 'task-3'])
 */
export function useBulkDeleteTasks() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (taskIds: string[]) => tasksService.bulkDelete(taskIds),
    onSuccess: (_, taskIds) => {
      // Remove all from cache
      taskIds.forEach(id => {
        queryClient.removeQueries({ queryKey: ['tasks', id] })
      })

      // Invalidate all task lists
      queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false })

      toast.success(`${taskIds.length} tasks deleted successfully`)
    },
    onError: (error: any) => {
      log.error({ error }, 'Failed to bulk delete tasks')
      toast.error(error.message || 'Failed to delete tasks')
    },
  })

  return {
    bulkDelete: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}

/**
 * Convenience hook that returns all task actions
 * Use this when you need multiple actions in one component
 *
 * @example
 * const taskActions = useTaskActions()
 *
 * await taskActions.create({ title: 'New task', ... })
 * await taskActions.updateStatus('task-123', 'completed')
 * await taskActions.delete('task-123')
 */
export function useTaskActions() {
  const { createTask } = useCreateTask()
  const { createFromTemplate } = useCreateTaskFromTemplate()
  const { updateTask } = useUpdateTask()
  const { updateStatus } = useUpdateTaskStatus()
  const { reassignTask } = useReassignTask()
  const { updatePriority } = useUpdateTaskPriority()
  const { deleteTask } = useDeleteTask()
  const { bulkUpdate } = useBulkUpdateTasks()
  const { bulkDelete } = useBulkDeleteTasks()

  return {
    create: createTask,
    createFromTemplate,
    update: updateTask,
    updateStatus,
    reassign: reassignTask,
    updatePriority,
    delete: deleteTask,
    bulkUpdate,
    bulkDelete,
  }
}

// =========================================================================
// SUBTASK HOOKS (added 2025-12-23)
// =========================================================================

/**
 * Hook for creating a subtask
 *
 * @example
 * const { createSubtask, isPending } = useCreateSubtask()
 *
 * await createSubtask({
 *   parentTaskId: 'task-123',
 *   title: 'Review documentation',
 *   priority: 'medium'
 * })
 */
export function useCreateSubtask() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({
      parentTaskId,
      ...data
    }: {
      parentTaskId: string
    } & Omit<TaskInsert, 'parentTaskId'>) =>
      tasksService.createSubtask(parentTaskId, data),
    onSuccess: (newSubtask, variables) => {
      // Invalidate parent task query to refetch with new subtask
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.parentTaskId],
      })
      // Invalidate subtasks list
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'subtasks', variables.parentTaskId],
      })
      // Invalidate general task lists (for progress updates)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })

      toast.success('Subtask created')
    },
    onError: (error: any) => {
      log.error({ error }, 'Failed to create subtask')
      toast.error(error.message || 'Failed to create subtask')
    },
  })

  return {
    createSubtask: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}

/**
 * Hook for reordering subtasks within a parent
 *
 * @example
 * const { reorderSubtasks, isPending } = useReorderSubtasks()
 *
 * await reorderSubtasks({
 *   parentTaskId: 'task-123',
 *   subtaskIds: ['subtask-3', 'subtask-1', 'subtask-2']
 * })
 */
export function useReorderSubtasks() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({
      subtaskIds,
    }: {
      parentTaskId: string
      subtaskIds: string[]
    }) => tasksService.reorderSubtasks(subtaskIds),
    onSuccess: (_, variables) => {
      // Invalidate subtasks list to show new order
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'subtasks', variables.parentTaskId],
      })
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.parentTaskId],
      })

      toast.success('Subtasks reordered')
    },
    onError: (error: any) => {
      log.error({ error }, 'Failed to reorder subtasks')
      toast.error(error.message || 'Failed to reorder subtasks')
    },
  })

  return {
    reorderSubtasks: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}

/**
 * Hook for updating a subtask's status (with parent cache invalidation)
 *
 * @example
 * const { updateSubtaskStatus, isPending } = useUpdateSubtaskStatus()
 *
 * await updateSubtaskStatus({
 *   subtaskId: 'subtask-123',
 *   parentTaskId: 'task-456',
 *   status: 'completed'
 * })
 */
export function useUpdateSubtaskStatus() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({
      subtaskId,
      status,
    }: {
      subtaskId: string
      parentTaskId: string
      status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    }) => tasksService.updateStatus(subtaskId, status),
    onMutate: async ({ subtaskId, parentTaskId, status }) => {
      // Optimistically update subtasks list
      await queryClient.cancelQueries({
        queryKey: ['tasks', 'subtasks', parentTaskId],
      })

      const previousSubtasks = queryClient.getQueryData<TaskWithRelations[]>([
        'tasks',
        'subtasks',
        parentTaskId,
      ])

      if (previousSubtasks) {
        queryClient.setQueryData(
          ['tasks', 'subtasks', parentTaskId],
          previousSubtasks.map((st) =>
            st.id === subtaskId
              ? {
                  ...st,
                  status,
                  completed_at:
                    status === 'completed' ? new Date().toISOString() : null,
                }
              : st
          )
        )
      }

      return { previousSubtasks }
    },
    onSuccess: (_, variables) => {
      // Invalidate parent task to update progress
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.parentTaskId],
      })
      // Invalidate task lists for progress badge updates
      queryClient.invalidateQueries({ queryKey: ['tasks', 'with-progress'] })

      const statusMessages = {
        pending: 'Subtask marked as pending',
        in_progress: 'Subtask in progress',
        completed: 'Subtask completed!',
        cancelled: 'Subtask cancelled',
      }
      toast.success(statusMessages[variables.status])
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousSubtasks) {
        queryClient.setQueryData(
          ['tasks', 'subtasks', variables.parentTaskId],
          context.previousSubtasks
        )
      }
      log.error({ error }, 'Failed to update subtask status')
      toast.error(error.message || 'Failed to update subtask status')
    },
  })

  return {
    updateSubtaskStatus: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}
