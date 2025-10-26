/**
 * Custom hook for fetching event logistics data using React Query
 * Provides automatic caching, background refetching, and built-in loading/error states
 */

import { useQuery } from '@tanstack/react-query'

interface LogisticsData {
  client_name?: string
  event_date?: string
  load_in_time?: string
  load_in_notes?: string
  start_time?: string
  end_time?: string
  location?: {
    name: string
    address_line1?: string
    address_line2?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
    contact_name?: string
    contact_phone?: string
    contact_email?: string
    notes?: string
  }
  venue_contact_name?: string
  venue_contact_phone?: string
  venue_contact_email?: string
  event_planner_name?: string
  event_planner_phone?: string
  event_planner_email?: string
  event_notes?: string
  packages?: Array<{
    id: string
    name: string
    type: string
  }>
  custom_items?: Array<{
    id: string
    item_name: string
    item_type: string
  }>
  equipment?: Array<{
    id: string
    name: string
    type: string
    serial_number?: string
    status: string
    checked_out_at?: string
    checked_in_at?: string
    condition_notes?: string
  }>
  staff?: Array<{
    id: string
    name: string
    email?: string
    role?: string
    role_type?: string
    notes?: string
    is_event_day: boolean
  }>
}

async function fetchEventLogistics(eventId: string): Promise<LogisticsData> {
  // No tenant parameter needed - the API route gets tenant from the session
  const response = await fetch(`/api/events/${eventId}/logistics`)
  if (!response.ok) throw new Error('Failed to fetch logistics')
  const data = await response.json()
  // API returns { logistics: {...} }, so unwrap it
  return data.logistics || data
}

export function useEventLogistics(eventId: string) {
  const query = useQuery({
    // Tenant is determined server-side from session, so not needed in query key
    queryKey: ['event-logistics', eventId],
    queryFn: () => fetchEventLogistics(eventId),
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    enabled: Boolean(eventId), // Only fetch if we have eventId
  })

  return {
    logistics: query.data || null,
    loading: query.isLoading,
    error: query.error,
    isRefetching: query.isRefetching,
    refetch: query.refetch
  }
}
