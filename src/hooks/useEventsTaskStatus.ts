import { useQuery } from '@tanstack/react-query'

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
    queryKey: ['events-task-status', eventIds],
    queryFn: () => fetchTaskStatus(eventIds),
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
    enabled: eventIds.length > 0, // Only run if we have event IDs
  })
}
