import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { EventWithRelations } from './useEventData'
import { queryKeys } from '@/lib/queryKeys'
import { createLogger } from '@/lib/logger'
import toast from 'react-hot-toast'

const log = createLogger('hooks')

async function fetchEvent(eventId: string): Promise<EventWithRelations> {
  const response = await fetch(`/api/events/${eventId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch event')
  }
  return response.json()
}

/**
 * Fetches event details with automatic caching and background refetching
 */
export function useEventDetail(eventId: string) {
  return useQuery({
    queryKey: queryKeys.events.detail(eventId),
    queryFn: () => fetchEvent(eventId),
    staleTime: 30 * 1000,
    enabled: Boolean(eventId),
  })
}

/**
 * Mutation hook for updating event
 */
export function useUpdateEvent(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<EventWithRelations>) => {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) {
        throw new Error('Failed to update event')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) })
      toast.success('Event updated successfully')
    },
    onError: (error: Error) => {
      log.error({ error, eventId }, 'Failed to update event')
      toast.error(error.message || 'Failed to update event')
    }
  })
}

/**
 * Mutation hook for deleting event
 */
export function useDeleteEvent(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        throw new Error('Failed to delete event')
      }
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() })
      queryClient.removeQueries({ queryKey: queryKeys.events.detail(eventId) })
      toast.success('Event deleted successfully')
    },
    onError: (error: Error) => {
      log.error({ error, eventId }, 'Failed to delete event')
      toast.error(error.message || 'Failed to delete event')
    }
  })
}

/**
 * Response type for duplicate event API
 */
interface DuplicateEventResponse {
  id: string
  title: string
  warnings?: string[]
}

/**
 * Mutation hook for duplicating an event
 */
export function useDuplicateEvent(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<DuplicateEventResponse> => {
      const response = await fetch(`/api/events/${eventId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to duplicate event')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() })
      toast.success('Event duplicated successfully!')
    },
    onError: (error: Error) => {
      log.error({ error, eventId }, 'Failed to duplicate event')
      toast.error(error.message || 'Failed to duplicate event')
    }
  })
}

/**
 * Response type for trigger workflows API
 */
interface TriggerWorkflowsResponse {
  success: boolean
  message: string
  error?: string
  hint?: string
  stats: {
    workflowsExecuted: number
    tasksCreated: number
    designItemsCreated: number
  }
}

/**
 * Mutation hook for triggering workflows on an event
 */
export function useTriggerWorkflows(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<TriggerWorkflowsResponse> => {
      const response = await fetch(`/api/events/${eventId}/trigger-workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()
      if (!response.ok) {
        const error = new Error(result.error || 'Failed to trigger workflows') as Error & { hint?: string }
        error.hint = result.hint
        throw error
      }
      return result
    },
    onSuccess: (data) => {
      if (data.stats.workflowsExecuted === 0) {
        toast('Workflows have already been executed for this event.')
      } else {
        toast.success(`Success! Created ${data.stats.tasksCreated} tasks and ${data.stats.designItemsCreated} design items.`)
        // Invalidate relevant queries to refresh data
        queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) })
      }
    },
    onError: (error: Error & { hint?: string }) => {
      log.error({ error, eventId }, 'Failed to trigger workflows')
      toast.error(`Failed: ${error.message}${error.hint ? ` - ${error.hint}` : ''}`)
    }
  })
}
