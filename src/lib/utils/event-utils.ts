/**
 * Event Utility Functions
 *
 * Shared utilities for event-related operations across the application.
 */

import type { EventDate } from '@/types/events'

/**
 * Get the next upcoming event date from a list of event dates.
 * Returns the earliest future/today date, or the most recent past date if all are past.
 *
 * @param eventDates - Array of event dates (can be null/undefined)
 * @returns The next upcoming event date, or null if no dates exist
 */
export function getNextEventDate(eventDates: EventDate[] | null | undefined): EventDate | null {
  if (!eventDates || eventDates.length === 0) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0) // Start of today

  // Sort dates chronologically
  const sortedDates = [...eventDates].sort((a, b) => {
    const dateA = new Date(a.event_date)
    const dateB = new Date(b.event_date)
    return dateA.getTime() - dateB.getTime()
  })

  // Find the first future or today date
  const nextDate = sortedDates.find(d => {
    const eventDate = new Date(d.event_date)
    eventDate.setHours(0, 0, 0, 0)
    return eventDate >= today
  })

  // If found a future/today date, return it
  if (nextDate) return nextDate

  // All dates are in the past, return the most recent one (last in sorted array)
  return sortedDates[sortedDates.length - 1]
}
