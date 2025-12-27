/**
 * Custom hook for fetching event logistics data using React Query
 * Provides automatic caching, background refetching, and built-in loading/error states
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { LogisticsData } from '@/types/logistics'

async function fetchEventLogistics(
  eventId: string,
  eventDateId?: string
): Promise<LogisticsData> {
  const url = eventDateId
    ? `/api/events/${eventId}/logistics?event_date_id=${eventDateId}`
    : `/api/events/${eventId}/logistics`

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch logistics')
  const data = await response.json()
  return data.logistics
}

export function useEventLogistics(eventId: string, eventDateId?: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['event-logistics', eventId, eventDateId],
    queryFn: () => fetchEventLogistics(eventId, eventDateId),
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    enabled: Boolean(eventId),
  })

  const invalidateLogistics = () => {
    queryClient.invalidateQueries({ queryKey: ['event-logistics', eventId] })
  }

  return {
    logistics: query.data || null,
    loading: query.isLoading,
    error: query.error,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
    invalidateLogistics
  }
}
