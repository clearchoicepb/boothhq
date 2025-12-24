import { useQuery } from '@tanstack/react-query'
import type { EventStaffingItem } from '@/app/api/events/staffing/route'

/**
 * Staffing filter types
 */
export type StaffingNeedsFilter = 'event_manager' | 'designer' | 'event_staff' | 'all'

/**
 * Options for useEventStaffing hook
 */
export interface UseEventStaffingOptions {
  needs?: StaffingNeedsFilter
  daysAhead?: number | null
}

/**
 * Fetches staffing data from the API
 */
async function fetchEventStaffing(options?: UseEventStaffingOptions): Promise<EventStaffingItem[]> {
  const params = new URLSearchParams()

  if (options?.needs) {
    params.set('needs', options.needs)
  }

  if (options?.daysAhead !== null && options?.daysAhead !== undefined) {
    params.set('days_ahead', options.daysAhead.toString())
  }

  const url = `/api/events/staffing${params.toString() ? `?${params.toString()}` : ''}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch staffing data')
  }

  return response.json()
}

/**
 * Hook to fetch events that need staffing
 *
 * @param options - Filter options
 * @returns Query result with staffing data
 *
 * @example
 * ```tsx
 * // Fetch events needing event managers
 * const { data, isLoading } = useEventStaffing({ needs: 'event_manager' })
 *
 * // Fetch events needing event staff in next 90 days
 * const { data } = useEventStaffing({ needs: 'event_staff', daysAhead: 90 })
 * ```
 */
export function useEventStaffing(options?: UseEventStaffingOptions) {
  return useQuery({
    queryKey: ['event-staffing', options?.needs || 'all', options?.daysAhead || 'all'],
    queryFn: () => fetchEventStaffing(options),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Staffing counts for each category
 */
export interface StaffingCounts {
  eventManagerCount: number
  designerCount: number
  eventStaffCount: number
  totalCount: number
}

/**
 * Fetches all staffing data and computes counts
 */
async function fetchStaffingCounts(): Promise<StaffingCounts> {
  // Fetch all events needing staffing (without 90-day filter for counts)
  const allStaffing = await fetchEventStaffing({ needs: 'all' })

  // Also fetch event staff with 90-day filter
  const eventStaffFiltered = await fetchEventStaffing({
    needs: 'event_staff',
    daysAhead: 90
  })

  return {
    eventManagerCount: allStaffing.filter(e => e.needs_event_manager).length,
    designerCount: allStaffing.filter(e => e.needs_designer).length,
    eventStaffCount: eventStaffFiltered.length,
    totalCount: allStaffing.length
  }
}

/**
 * Hook to fetch staffing counts for tab badges
 *
 * @returns Query result with staffing counts
 *
 * @example
 * ```tsx
 * const { data: counts } = useStaffingCounts()
 * // counts.eventManagerCount, counts.designerCount, counts.eventStaffCount
 * ```
 */
export function useStaffingCounts() {
  return useQuery({
    queryKey: ['event-staffing-counts'],
    queryFn: fetchStaffingCounts,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}
