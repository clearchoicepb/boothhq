'use client'

import { useCallback } from 'react'
import { useFilterPresets } from '@/hooks/useFilterPresets'
import { useActiveFilterState } from '@/hooks/useActiveFilterState'
import { QuickViewPresets } from './QuickViewPresets'
import { SearchAndBasicFilters } from './SearchAndBasicFilters'
import { ActiveFilterChips } from './ActiveFilterChips'
import { AdvancedFiltersPanel } from './AdvancedFiltersPanel'
import { ResultsSummary } from './ResultsSummary'
import type { FilterState, EventFiltersProps } from '@/types/events'

// Re-export types for backward compatibility
export type { FilterState } from '@/types/events'

/**
 * Main EventFilters component - orchestrates all filter sub-components
 */
export function EventFilters({
  filters,
  onFiltersChange,
  coreTasks,
  eventCounts
}: EventFiltersProps) {
  // Use custom hooks for presets and active filter state
  const {
    applyOperationsView,
    applyPlanningView,
    applyAllEvents,
    clearAllFilters,
    isOperationsViewActive,
    isPlanningViewActive,
    isAllEventsActive
  } = useFilterPresets({ filters, onFiltersChange })

  const { hasActiveFilters, activeFilterCount } = useActiveFilterState(filters)

  // Helper to update a single filter
  const updateFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      onFiltersChange({ ...filters, [key]: value })
    },
    [filters, onFiltersChange]
  )

  // Helper to update multiple filters at once
  const updateMultipleFilters = useCallback(
    (updates: Partial<FilterState>) => {
      onFiltersChange({ ...filters, ...updates })
    },
    [filters, onFiltersChange]
  )

  return (
    <div className="space-y-4">
      {/* Quick View Presets */}
      <QuickViewPresets
        eventCounts={eventCounts}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        isOperationsViewActive={isOperationsViewActive}
        isPlanningViewActive={isPlanningViewActive}
        isAllEventsActive={isAllEventsActive}
        onApplyOperationsView={applyOperationsView}
        onApplyPlanningView={applyPlanningView}
        onApplyAllEvents={applyAllEvents}
        onClearAllFilters={clearAllFilters}
      />

      {/* Search and Basic Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <SearchAndBasicFilters
          filters={filters}
          eventCounts={eventCounts}
          onUpdateFilter={updateFilter}
          onUpdateMultipleFilters={updateMultipleFilters}
        />

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <ActiveFilterChips
            filters={filters}
            activeFilterCount={activeFilterCount}
            onUpdateFilter={updateFilter}
            onUpdateMultipleFilters={updateMultipleFilters}
          />
        )}
      </div>

      {/* Advanced Filters Panel */}
      <AdvancedFiltersPanel
        filters={filters}
        coreTasks={coreTasks}
        onUpdateFilter={updateFilter}
        onUpdateMultipleFilters={updateMultipleFilters}
      />

      {/* Results Summary */}
      <ResultsSummary filters={filters} eventCounts={eventCounts} />
    </div>
  )
}
