import { Event as EventType } from '@/lib/supabase-client'
import { useEventDetail, useUpdateEvent, useDeleteEvent } from './useEventDetail'
import { useEventDates } from './useEventDates'
import type { EventDate } from '@/types/events'
import { createLogger } from '@/lib/logger'

const log = createLogger('hooks')

export type { EventDate }

/**
 * Event with related data (account, contact, opportunity names, category, type, payment status)
 */
export interface EventWithRelations extends EventType {
  account_name: string | null
  contact_name: string | null // Legacy field
  opportunity_name: string | null
  // New many-to-many contact fields
  primary_contact?: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    job_title: string | null
  } | null
  primary_contact_name?: string | null
  event_planner?: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    company: string | null
  } | null
  event_planner_name?: string | null
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
    setup_time: string | null
    start_time: string | null
    end_time: string | null
  }>
}

/**
 * Custom hook for managing event data fetching and CRUD operations
 * Now powered by React Query for better caching and performance
 *
 * @param eventId - The ID of the event to fetch
 * @returns Event data, loading state, and CRUD operations
 */
export function useEventData(eventId: string) {
  // Use React Query hooks for data fetching
  const eventQuery = useEventDetail(eventId)
  const eventDatesQuery = useEventDates(eventId)
  const updateMutation = useUpdateEvent(eventId)
  const deleteMutation = useDeleteEvent(eventId)

  /**
   * Update event data with React Query mutation
   */
  const updateEvent = async (data: Partial<EventType>) => {
    try {
      await updateMutation.mutateAsync(data)
      return true
    } catch (err) {
      log.error({ err }, 'Error updating event')
      return false
    }
  }

  /**
   * Delete the event with React Query mutation
   */
  const deleteEvent = async () => {
    try {
      await deleteMutation.mutateAsync()
      return true
    } catch (err) {
      log.error({ err }, 'Error deleting event')
      return false
    }
  }

  /**
   * Refetch all event data
   */
  const refetch = () => {
    eventQuery.refetch()
    eventDatesQuery.refetch()
  }

  return {
    // Data
    event: eventQuery.data ?? null,
    eventDates: eventDatesQuery.data ?? [],
    loading: eventQuery.isLoading || eventDatesQuery.isLoading,
    error: eventQuery.error?.message ?? eventDatesQuery.error?.message ?? null,

    // CRUD Operations
    fetchEvent: eventQuery.refetch,
    fetchEventDates: eventDatesQuery.refetch,
    updateEvent,
    deleteEvent,
    refetch,

    // Setters (for backward compatibility - now no-ops)
    setEvent: () => {},
    setEventDates: () => {},

    // React Query state (for advanced use cases)
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

