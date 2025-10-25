import { useQuery } from '@tanstack/react-query'
import { EventDate } from './useEventData'

async function fetchEventDates(eventId: string): Promise<EventDate[]> {
  const response = await fetch(`/api/event-dates?event_id=${eventId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch event dates')
  }
  return response.json()
}

/**
 * Fetches event dates with automatic caching
 */
export function useEventDates(eventId: string) {
  return useQuery({
    queryKey: ['event-dates', eventId],
    queryFn: () => fetchEventDates(eventId),
    staleTime: 30 * 1000,
    enabled: Boolean(eventId),
  })
}
