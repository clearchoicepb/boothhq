import { useCallback, useMemo } from 'react'
import type { FilterState } from '@/types/events'

interface UseFilterPresetsProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
}

interface UseFilterPresetsReturn {
  applyOperationsView: () => void
  applyPlanningView: () => void
  applyAllEvents: () => void
  clearAllFilters: () => void
  isOperationsViewActive: boolean
  isPlanningViewActive: boolean
  isAllEventsActive: boolean
}

/**
 * Hook for managing filter presets (Operations View, Planning View, All Events)
 */
export function useFilterPresets({
  filters,
  onFiltersChange
}: UseFilterPresetsProps): UseFilterPresetsReturn {
  const updateMultipleFilters = useCallback(
    (updates: Partial<FilterState>) => {
      onFiltersChange({ ...filters, ...updates })
    },
    [filters, onFiltersChange]
  )

  const applyOperationsView = useCallback(() => {
    updateMultipleFilters({
      dateRangeFilter: 'custom_days',
      customDaysFilter: 10,
      statusFilter: 'all',
      taskFilter: 'all',
      selectedTaskIds: [],
      searchTerm: '',
      assignedToFilter: 'all'
    })
  }, [updateMultipleFilters])

  const applyPlanningView = useCallback(() => {
    updateMultipleFilters({
      dateRangeFilter: 'all',
      statusFilter: 'all',
      taskFilter: 'incomplete',
      taskDateRangeFilter: 45,
      selectedTaskIds: [],
      searchTerm: '',
      assignedToFilter: 'all'
    })
  }, [updateMultipleFilters])

  const applyAllEvents = useCallback(() => {
    updateMultipleFilters({
      dateRangeFilter: 'upcoming',
      customDaysFilter: null,
      statusFilter: 'all',
      taskFilter: 'all',
      selectedTaskIds: [],
      searchTerm: '',
      assignedToFilter: 'all'
    })
  }, [updateMultipleFilters])

  const clearAllFilters = useCallback(() => {
    updateMultipleFilters({
      dateRangeFilter: 'upcoming',
      customDaysFilter: null,
      statusFilter: 'all',
      taskFilter: 'all',
      selectedTaskIds: [],
      searchTerm: '',
      assignedToFilter: 'all'
    })
  }, [updateMultipleFilters])

  // Active state detection
  const isOperationsViewActive = useMemo(
    () =>
      filters.dateRangeFilter === 'custom_days' &&
      filters.customDaysFilter === 10 &&
      filters.taskFilter === 'all',
    [filters.dateRangeFilter, filters.customDaysFilter, filters.taskFilter]
  )

  const isPlanningViewActive = useMemo(
    () => filters.taskFilter === 'incomplete' && filters.taskDateRangeFilter === 45,
    [filters.taskFilter, filters.taskDateRangeFilter]
  )

  // Compute hasActiveFilters locally for isAllEventsActive check
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

  const isAllEventsActive = useMemo(
    () =>
      filters.dateRangeFilter === 'upcoming' &&
      filters.taskFilter === 'all' &&
      !hasActiveFilters,
    [filters.dateRangeFilter, filters.taskFilter, hasActiveFilters]
  )

  return {
    applyOperationsView,
    applyPlanningView,
    applyAllEvents,
    clearAllFilters,
    isOperationsViewActive,
    isPlanningViewActive,
    isAllEventsActive
  }
}
