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
    staleTime: 60 * 1000,
    enabled: Boolean(eventId),
  })
}
