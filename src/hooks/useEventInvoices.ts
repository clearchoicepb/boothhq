import { useQuery } from '@tanstack/react-query'

async function fetchEventInvoices(eventId: string): Promise<any[]> {
  const response = await fetch(`/api/invoices?event_id=${eventId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch invoices')
  }
  return response.json()
}

/**
 * Fetches invoices for an event
 */
export function useEventInvoices(eventId: string) {
  return useQuery({
    queryKey: ['event-invoices', eventId],
    queryFn: () => fetchEventInvoices(eventId),
    staleTime: 0, // Always fetch fresh data to ensure cache updates are visible
    enabled: Boolean(eventId),
  })
}
