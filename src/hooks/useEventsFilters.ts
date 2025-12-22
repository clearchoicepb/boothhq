/**
 * useEventsFilters Hook
 *
 * Manages filtering, sorting, and statistics for events list.
 * Extracts complex filter logic from Events Dashboard component.
 *
 * Updated to use Tasks-based readiness instead of Core Tasks.
 */

import { useMemo, useState } from 'react'
import { parseLocalDate, isDateToday } from '@/lib/utils/date-utils'
import { getEventReadiness, getIncompleteEventTasks } from '@/hooks/useEventReadiness'
import type { FilterState } from '@/components/events/event-filters'
import type { Event, EventTask } from '@/types/events'
import { createLogger } from '@/lib/logger'

const log = createLogger('hooks')

// Re-export Event as FilterableEvent for clarity (they are the same)
export type FilterableEvent = Event

// Core task template interface - kept for backward compatibility
interface CoreTask {
  id: string
  task_name: string
}

// Event counts for filter badges
export interface EventCounts {
  total: number
  filtered: number
  today: number
  thisWeek: number
  thisMonth: number
  upcoming: number
  past: number
  next10Days: number
  next45Days: number
}

// Sort options
export type SortOption = 'date_asc' | 'date_desc' | 'title_asc' | 'title_desc' | 'account_asc' | 'account_desc'

export interface UseEventsFiltersParams {
  events: FilterableEvent[]
  coreTasks: CoreTask[]
  initialFilters?: Partial<FilterState>
  initialSortBy?: SortOption
  currentUserId?: string // Current user ID for "My Events" filter
}

export interface UseEventsFiltersReturn {
  // Filtered and sorted events
  filteredEvents: FilterableEvent[]
  sortedEvents: FilterableEvent[]

  // Filter state
  filters: FilterState
  setFilters: (filters: FilterState) => void

  // Sort state
  sortBy: SortOption
  setSortBy: (sortBy: SortOption) => void

  // Event counts for badges
  eventCounts: EventCounts

  // Utility functions
  getIncompleteTasks: (event: FilterableEvent) => string[]
}

/**
 * Custom hook for managing event filters, sorting, and statistics
 *
 * @param events - Array of events to filter
 * @param coreTasks - Array of core task templates
 * @param initialFilters - Initial filter state
 * @param initialSortBy - Initial sort option
 * @returns Filtered/sorted events, filter state, and utility functions
 *
 * @example
 * const { sortedEvents, filters, setFilters, sortBy, setSortBy, eventCounts } =
 *   useEventsFilters({ events, coreTasks })
 */
export function useEventsFilters({
  events,
  coreTasks,
  initialFilters,
  initialSortBy = 'date_asc',
  currentUserId
}: UseEventsFiltersParams): UseEventsFiltersReturn {
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    dateRangeFilter: 'upcoming',
    customDaysFilter: null,
    statusFilter: 'all',
    taskFilter: 'all',
    taskDateRangeFilter: 14,
    selectedTaskIds: [],
    assignedToFilter: 'all',
    ...initialFilters
  })

  // Sort state
  const [sortBy, setSortBy] = useState<SortOption>(initialSortBy)

  /**
   * Get incomplete tasks for an event
   * Now uses the Tasks table via event.event_tasks instead of Core Tasks
   */
  const getIncompleteTasks = (event: FilterableEvent): string[] => {
    // Use the new Tasks-based calculation
    const incompleteTasks = getIncompleteEventTasks(event)
    return incompleteTasks.map(task => task.id)
  }

  /**
   * Check if event matches selected specific tasks
   */
  const matchesSelectedTasks = (event: FilterableEvent): boolean => {
    if (filters.selectedTaskIds.length === 0) return true

    const incompleteTasks = getIncompleteTasks(event)
    return filters.selectedTaskIds.some(taskId => incompleteTasks.includes(taskId))
  }

  /**
   * Check if event is within task date range (for incomplete task filter)
   */
  const isWithinTaskDateRange = (event: FilterableEvent): boolean => {
    if (!event.start_date) return false
    const eventDate = parseLocalDate(event.start_date)
    eventDate.setHours(0, 0, 0, 0)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + filters.taskDateRangeFilter)
    futureDate.setHours(23, 59, 59, 999)
    return eventDate >= now && eventDate <= futureDate
  }

  /**
   * Calculate event counts for different date filters
   */
  const eventCounts: EventCounts = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const counts: EventCounts = {
      total: events.length,
      filtered: 0, // Will be set after filtering
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      upcoming: 0,
      past: 0,
      next10Days: 0,
      next45Days: 0
    }

    events.forEach(event => {
      if (!event.start_date) return

      const eventDate = parseLocalDate(event.start_date)
      eventDate.setHours(0, 0, 0, 0)

      const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      // Today
      if (isDateToday(event.start_date)) {
        counts.today++
      }

      // This week (next 7 days)
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      if (eventDate >= now && eventDate <= weekEnd) {
        counts.thisWeek++
      }

      // This month
      if (eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear()) {
        counts.thisMonth++
      }

      // Upcoming (future events)
      if (eventDate >= now) {
        counts.upcoming++
      }

      // Past
      if (eventDate < now) {
        counts.past++
      }

      // Next 10 days
      if (daysUntil >= 0 && daysUntil <= 10) {
        counts.next10Days++
      }

      // Next 45 days with incomplete tasks
      // Now uses Tasks-based calculation - no longer requires coreTasks.length check
      if (daysUntil >= 0 && daysUntil <= 45) {
        const readiness = getEventReadiness(event)
        if (readiness.hasTasks && !readiness.isReady) {
          counts.next45Days++
        }
      }
    })

    return counts
  }, [events])

  /**
   * Apply all filters to events
   */
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Search filter
      const matchesSearch =
        (event.title || '').toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        (event.location || '').toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        (event.account_name && event.account_name.toLowerCase().includes(filters.searchTerm.toLowerCase()))

      if (!matchesSearch) return false

      // Status filter
      if (filters.statusFilter !== 'all' && event.status !== filters.statusFilter) {
        return false
      }

      // Date range filter
      if (filters.dateRangeFilter !== 'all' && event.start_date) {
        const now = new Date()
        now.setHours(0, 0, 0, 0)

        const eventDate = parseLocalDate(event.start_date)
        eventDate.setHours(0, 0, 0, 0)

        switch (filters.dateRangeFilter) {
          case 'today':
            if (!isDateToday(event.start_date)) return false
            break

          case 'this_week':
            const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            if (eventDate < now || eventDate > weekEnd) return false
            break

          case 'this_month':
            if (
              eventDate.getMonth() !== now.getMonth() ||
              eventDate.getFullYear() !== now.getFullYear()
            )
              return false
            break

          case 'upcoming':
            if (eventDate < now) return false
            break

          case 'past':
            if (eventDate >= now) return false
            break

          case 'custom_days':
            if (filters.customDaysFilter !== null) {
              const customEnd = new Date(now.getTime() + filters.customDaysFilter * 24 * 60 * 60 * 1000)
              customEnd.setHours(23, 59, 59, 999)
              if (eventDate < now || eventDate > customEnd) return false
            }
            break
        }
      }

      // Task filter - now uses Tasks-based readiness
      if (filters.taskFilter === 'incomplete') {
        const readiness = getEventReadiness(event)
        const hasIncomplete = readiness.hasTasks && !readiness.isReady
        const matchesTaskDateRange = isWithinTaskDateRange(event)
        const matchesSpecificTasks = matchesSelectedTasks(event)

        if (!(hasIncomplete && matchesTaskDateRange && matchesSpecificTasks)) {
          return false
        }
      }

      // Assigned To filter
      if (filters.assignedToFilter === 'my_events') {
        // Debug logging - structured format, no PII
        log.debug({
          hasUserId: !!currentUserId,
          eventId: event.id,
          staffAssignmentCount: event.event_staff_assignments?.length || 0
        }, 'My Events filter checking event')
        
        // Only filter if currentUserId is available and event has staff assignments
        if (!currentUserId) {
          log.warn({ eventId: event.id }, 'My Events filter: no currentUserId available, showing all events')
          // If no user ID, show all events when "My Events" is selected (fallback)
          return true
        }
        
        // Check if current user is assigned to this event
        if (!event.event_staff_assignments || event.event_staff_assignments.length === 0) {
          // No staff assignments means user is not assigned
          return false
        }
        
        const isAssigned = event.event_staff_assignments.some(
          assignment => assignment.user_id === currentUserId
        )

        if (!isAssigned) {
          return false
        }
      }

      return true
    })
  }, [events, filters, currentUserId])

  /**
   * Sort filtered events based on selected sort option
   */
  const sortedEvents = useMemo(() => {
    const sorted = [...filteredEvents]

    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          // Earliest date first
          const aDate = a.start_date ? parseLocalDate(a.start_date) : new Date(a.created_at)
          const bDate = b.start_date ? parseLocalDate(b.start_date) : new Date(b.created_at)
          return aDate.getTime() - bDate.getTime()

        case 'date_desc':
          // Latest date first
          const aDateDesc = a.start_date ? parseLocalDate(a.start_date) : new Date(a.created_at)
          const bDateDesc = b.start_date ? parseLocalDate(b.start_date) : new Date(b.created_at)
          return bDateDesc.getTime() - aDateDesc.getTime()

        case 'title_asc':
          // Title A-Z
          return (a.title || '').localeCompare(b.title || '')

        case 'title_desc':
          // Title Z-A
          return (b.title || '').localeCompare(a.title || '')

        case 'account_asc':
          // Account A-Z
          return (a.account_name || '').localeCompare(b.account_name || '')

        case 'account_desc':
          // Account Z-A
          return (b.account_name || '').localeCompare(a.account_name || '')

        default:
          // Default: earliest date first
          const aDateDefault = a.start_date ? parseLocalDate(a.start_date) : new Date(a.created_at)
          const bDateDefault = b.start_date ? parseLocalDate(b.start_date) : new Date(b.created_at)
          return aDateDefault.getTime() - bDateDefault.getTime()
      }
    })

    return sorted
  }, [filteredEvents, sortBy])

  return {
    filteredEvents,
    sortedEvents,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    eventCounts: {
      ...eventCounts,
      filtered: filteredEvents.length
    },
    getIncompleteTasks
  }
}
