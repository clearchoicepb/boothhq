import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { EventWithRelations } from './useEventData'
import { queryKeys } from '@/lib/queryKeys'

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
    }
  })
}
