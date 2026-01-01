'use client'

import { Search, X } from 'lucide-react'
import type { FilterState, EventCounts } from '@/types/events'

interface SearchAndBasicFiltersProps {
  filters: FilterState
  eventCounts: EventCounts
  onUpdateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  onUpdateMultipleFilters: (updates: Partial<FilterState>) => void
}

/**
 * Search bar and basic filter dropdowns (Date Range, Status, Assigned To)
 */
export function SearchAndBasicFilters({
  filters,
  eventCounts,
  onUpdateFilter,
  onUpdateMultipleFilters
}: SearchAndBasicFiltersProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-3">
      {/* Search Bar */}
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search events by name, location, or account..."
            value={filters.searchTerm}
            onChange={(e) => onUpdateFilter('searchTerm', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#347dc4] focus:border-transparent text-sm"
          />
          {filters.searchTerm && (
            <button
              onClick={() => onUpdateFilter('searchTerm', '')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Date Range Dropdown */}
      <div className="w-full lg:w-48">
        <select
          value={filters.dateRangeFilter}
          onChange={(e) => onUpdateMultipleFilters({
            dateRangeFilter: e.target.value as FilterState['dateRangeFilter'],
            customDaysFilter: null
          })}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 focus:ring-2 focus:ring-[#347dc4] focus:border-transparent text-sm"
        >
          <option value="all">All Events ({eventCounts.total})</option>
          <option value="today">Today ({eventCounts.today})</option>
          <option value="this_week">This Week ({eventCounts.thisWeek})</option>
          <option value="this_month">This Month ({eventCounts.thisMonth})</option>
          <option value="upcoming">Upcoming ({eventCounts.upcoming})</option>
          <option value="past">Past ({eventCounts.past})</option>
        </select>
      </div>

      {/* Assigned To Dropdown */}
      <div className="w-full lg:w-48">
        <select
          value={filters.assignedToFilter}
          onChange={(e) => onUpdateFilter('assignedToFilter', e.target.value as FilterState['assignedToFilter'])}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 focus:ring-2 focus:ring-[#347dc4] focus:border-transparent text-sm"
        >
          <option value="all">All Events</option>
          <option value="my_events">My Events</option>
        </select>
      </div>
    </div>
  )
}
