import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

async function fetchTaskStatus(eventIds: string[]): Promise<Record<string, any>> {
  if (eventIds.length === 0) return {}

  const ids = eventIds.join(',')
  const response = await fetch(`/api/events/tasks-status?ids=${ids}`)
  if (!response.ok) {
    throw new Error('Failed to fetch task status')
  }
  const data = await response.json()
  return data.taskStatus || {}
}

/**
 * Fetches task status for multiple events
 */
export function useEventsTaskStatus(eventIds: string[]) {
  return useQuery({
    queryKey: queryKeys.events.taskStatus(eventIds),
    queryFn: () => fetchTaskStatus(eventIds),
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
    enabled: eventIds.length > 0, // Only run if we have event IDs
  })
}
