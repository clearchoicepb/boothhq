'use client'

import { X, Users } from 'lucide-react'
import type { FilterState } from '@/types/events'

interface ActiveFilterChipsProps {
  filters: FilterState
  activeFilterCount: number
  onUpdateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  onUpdateMultipleFilters: (updates: Partial<FilterState>) => void
}

/**
 * Display active filter chips with remove buttons
 */
export function ActiveFilterChips({
  filters,
  activeFilterCount,
  onUpdateFilter,
  onUpdateMultipleFilters
}: ActiveFilterChipsProps) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Active Filters ({activeFilterCount})
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.dateRangeFilter !== 'upcoming' && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Date: {filters.dateRangeFilter === 'custom_days' ? `Next ${filters.customDaysFilter} days` : filters.dateRangeFilter.replace(/_/g, ' ')}
            <button
              onClick={() => onUpdateMultipleFilters({ dateRangeFilter: 'upcoming', customDaysFilter: null })}
              className="hover:opacity-70"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        {filters.assignedToFilter !== 'all' && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Users className="h-3 w-3" />
            My Events
            <button
              onClick={() => onUpdateFilter('assignedToFilter', 'all')}
              className="hover:opacity-70"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        {filters.searchTerm && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Search: &quot;{filters.searchTerm}&quot;
            <button
              onClick={() => onUpdateFilter('searchTerm', '')}
              className="hover:opacity-70"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
      </div>
    </div>
  )
}
