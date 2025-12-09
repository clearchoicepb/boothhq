'use client'

import { Calendar } from 'lucide-react'
import type { FilterState, EventCounts } from '@/types/events'

interface ResultsSummaryProps {
  filters: FilterState
  eventCounts: EventCounts
}

/**
 * Summary of filtered results (showing X of Y events)
 */
export function ResultsSummary({ filters, eventCounts }: ResultsSummaryProps) {
  const getDateRangeDescription = () => {
    switch (filters.dateRangeFilter) {
      case 'all':
        return 'All events regardless of date'
      case 'today':
        return 'Events happening today'
      case 'this_week':
        return 'Events in the next 7 days'
      case 'this_month':
        return 'Events in the current month'
      case 'upcoming':
        return 'Events scheduled for today and beyond'
      case 'past':
        return 'Events that have already occurred'
      case 'custom_days':
        return filters.customDaysFilter ? `Events in the next ${filters.customDaysFilter} days` : ''
      default:
        return ''
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-[#347dc4]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#347dc4] bg-opacity-10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-[#347dc4]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Showing {eventCounts.filtered} of {eventCounts.total} events
            </p>
            <p className="text-xs text-gray-600">
              {getDateRangeDescription()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
