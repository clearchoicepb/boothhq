// Main component
export { EventFilters } from './EventFilters'

// Sub-components (for advanced usage)
export { QuickViewPresets } from './QuickViewPresets'
export { SearchAndBasicFilters } from './SearchAndBasicFilters'
export { ActiveFilterChips } from './ActiveFilterChips'
export { AdvancedFiltersPanel } from './AdvancedFiltersPanel'
export { ResultsSummary } from './ResultsSummary'

// Re-export types from centralized location
export type { FilterState, EventFiltersProps, EventCounts, CoreTask } from '@/types/events'
