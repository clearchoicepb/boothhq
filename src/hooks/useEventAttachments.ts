import { useQuery } from '@tanstack/react-query'

async function fetchEventAttachments(eventId: string): Promise<any[]> {
  const response = await fetch(`/api/attachments?entity_type=event&entity_id=${eventId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch attachments')
  }
  return response.json()
}

/**
 * Fetches attachments for an event
 */
export function useEventAttachments(eventId: string) {
  return useQuery({
    queryKey: ['event-attachments', eventId],
    queryFn: () => fetchEventAttachments(eventId),
    staleTime: 60 * 1000,
    enabled: Boolean(eventId),
  })
}
