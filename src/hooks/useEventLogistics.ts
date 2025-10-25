/**
 * Custom hook for fetching event logistics data
 * Encapsulates data fetching and loading state
 */

import { useState, useEffect } from 'react'

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

export function useEventLogistics(eventId: string, tenant: string) {
  const [logistics, setLogistics] = useState<LogisticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchLogistics = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/logistics?tenant=${tenant}`)
      if (!response.ok) throw new Error('Failed to fetch logistics')
      const data = await response.json()
      // API returns { logistics: {...} }, so unwrap it
      setLogistics(data.logistics || data)
    } catch (error) {
      console.error('Error fetching logistics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogistics()
  }, [eventId, tenant])

  return {
    logistics,
    loading,
    refetch: fetchLogistics
  }
}
