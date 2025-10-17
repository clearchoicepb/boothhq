import { useState, useCallback, useEffect } from 'react'
import { Event as EventType } from '@/lib/supabase-client'

/**
 * Event with related data (account, contact, opportunity names, category, type, payment status)
 */
export interface EventWithRelations extends EventType {
  account_name: string | null
  contact_name: string | null
  opportunity_name: string | null
  event_category?: {
    name: string
    color: string
  }
  event_type?: {
    name: string
  }
  payment_status?: {
    name: string
    color: string
  }
  event_dates?: Array<{
    id: string
    event_date: string
    start_time: string | null
    end_time: string | null
  }>
}

/**
 * Event date with location and staff information
 */
export interface EventDate {
  id: string
  event_date: string
  start_time: string | null
  end_time: string | null
  location_id: string | null
  location_name: string | null
  notes: string | null
  status: string
  created_at?: string
  updated_at?: string
}

/**
 * Custom hook for managing event data fetching and CRUD operations
 * 
 * @param eventId - The ID of the event to fetch
 * @param session - The user session object
 * @param tenantSubdomain - The tenant subdomain for routing
 * @returns Event data, loading state, and CRUD operations
 */
export function useEventData(
  eventId: string,
  session: any,
  tenantSubdomain: string
) {
  const [event, setEvent] = useState<EventWithRelations | null>(null)
  const [eventDates, setEventDates] = useState<EventDate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch the main event data
   */
  const fetchEvent = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/events/${eventId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch event')
      }

      const data = await response.json()
      setEvent(data)
    } catch (err) {
      console.error('Error fetching event:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch event')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  /**
   * Fetch event dates for this event
   */
  const fetchEventDates = useCallback(async () => {
    try {
      const response = await fetch(`/api/event-dates?event_id=${eventId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch event dates')
      }
      
      const data = await response.json()
      setEventDates(data)
    } catch (err) {
      console.error('Error fetching event dates:', err)
      // Don't set error state here - event dates are supplementary
    }
  }, [eventId])

  /**
   * Update event data
   */
  const updateEvent = async (data: Partial<EventType>) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to update event')
      }

      await fetchEvent()
      return true
    } catch (err) {
      console.error('Error updating event:', err)
      setError(err instanceof Error ? err.message : 'Failed to update event')
      return false
    }
  }

  /**
   * Delete the event
   */
  const deleteEvent = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete event')
      }

      return true
    } catch (err) {
      console.error('Error deleting event:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete event')
      return false
    }
  }

  /**
   * Refetch all event data
   */
  const refetch = useCallback(() => {
    fetchEvent()
    fetchEventDates()
  }, [fetchEvent, fetchEventDates])

  /**
   * Initial data fetch on mount
   */
  useEffect(() => {
    if (session && eventId) {
      fetchEvent()
      fetchEventDates()
    }
  }, [fetchEvent, fetchEventDates, session, eventId])

  return {
    // Data
    event,
    eventDates,
    loading,
    error,
    
    // CRUD Operations
    fetchEvent,
    fetchEventDates,
    updateEvent,
    deleteEvent,
    refetch,
    
    // Setters (for advanced use cases)
    setEvent,
    setEventDates,
  }
}

