import { useQuery } from '@tanstack/react-query'

/**
 * React Query hook for fetching contracts associated with an event
 */
export function useEventContracts(eventId: string) {
  return useQuery({
    queryKey: ['event-contracts', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/contracts?event_id=${eventId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch contracts')
      }
      return response.json()
    },
    staleTime: 30000, // Consider data stale after 30 seconds
    enabled: !!eventId
  })
}

