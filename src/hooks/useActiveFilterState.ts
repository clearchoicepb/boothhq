import { useMemo } from 'react'
import type { FilterState } from '@/types/events'

interface UseActiveFilterStateReturn {
  hasActiveFilters: boolean
  activeFilterCount: number
}

/**
 * Hook for computing active filter state (whether filters are active and count)
 */
export function useActiveFilterState(filters: FilterState): UseActiveFilterStateReturn {
  const hasActiveFilters = useMemo(
    () =>
      filters.statusFilter !== 'all' ||
      filters.dateRangeFilter !== 'upcoming' ||
      filters.searchTerm !== '' ||
      filters.taskFilter !== 'all' ||
      filters.selectedTaskIds.length > 0 ||
      filters.customDaysFilter !== null ||
      filters.assignedToFilter !== 'all',
    [filters]
  )

  const activeFilterCount = useMemo(
    () =>
      [
        filters.statusFilter !== 'all',
        filters.dateRangeFilter !== 'upcoming',
        filters.searchTerm !== '',
        filters.taskFilter !== 'all',
        filters.selectedTaskIds.length > 0,
        filters.customDaysFilter !== null,
        filters.assignedToFilter !== 'all'
      ].filter(Boolean).length,
    [filters]
  )

  return {
    hasActiveFilters,
    activeFilterCount
  }
}
