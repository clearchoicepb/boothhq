import { useQuery } from '@tanstack/react-query'

async function fetchEventActivities(eventId: string): Promise<any[]> {
  const response = await fetch(`/api/events/${eventId}/activity`)
  if (!response.ok) {
    throw new Error('Failed to fetch activities')
  }
  return response.json()
}

/**
 * Fetches activities for an event
 */
export function useEventActivities(eventId: string) {
  return useQuery({
    queryKey: ['event-activities', eventId],
    queryFn: () => fetchEventActivities(eventId),
    staleTime: 0, // Always refetch - activity data should be fresh
    enabled: Boolean(eventId),
  })
}
