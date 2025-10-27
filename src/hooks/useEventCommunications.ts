import { useQuery } from '@tanstack/react-query'

async function fetchEventCommunications(eventId: string, page: number = 1): Promise<any[]> {
  const response = await fetch(`/api/communications?event_id=${eventId}&page=${page}`)
  if (!response.ok) {
    throw new Error('Failed to fetch communications')
  }
  return response.json()
}

/**
 * Fetches communications for an event with pagination support
 */
export function useEventCommunications(eventId: string, page: number = 1) {
  return useQuery({
    queryKey: ['event-communications', eventId, page],
    queryFn: () => fetchEventCommunications(eventId, page),
    staleTime: 30 * 1000,
    enabled: Boolean(eventId),
  })
}
