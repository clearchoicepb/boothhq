'use client'

import { useState } from 'react'
import { Search, Filter, ChevronDown, ChevronUp, X, CheckCircle2, AlertCircle, Zap, Calendar, Users } from 'lucide-react'

export interface FilterState {
  searchTerm: string
  dateRangeFilter: 'all' | 'today' | 'this_week' | 'this_month' | 'upcoming' | 'past' | 'custom_days'
  customDaysFilter: number | null
  statusFilter: string
  taskFilter: 'all' | 'incomplete'
  taskDateRangeFilter: number
  selectedTaskIds: string[]
}

interface EventFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  coreTasks: Array<{ id: string; task_name: string }>
  eventCounts: {
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
}

export function EventFilters({
  filters,
  onFiltersChange,
  coreTasks,
  eventCounts
}: EventFiltersProps) {
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const updateMultipleFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  // Filter preset handlers
  const applyOperationsView = () => {
    updateMultipleFilters({
      dateRangeFilter: 'custom_days',
      customDaysFilter: 10,
      statusFilter: 'all',
      taskFilter: 'all',
      selectedTaskIds: [],
      searchTerm: ''
    })
  }

  const applyPlanningView = () => {
    updateMultipleFilters({
      dateRangeFilter: 'all',
      statusFilter: 'all',
      taskFilter: 'incomplete',
      taskDateRangeFilter: 45,
      selectedTaskIds: [],
      searchTerm: ''
    })
  }

  const applyAllEvents = () => {
    updateMultipleFilters({
      dateRangeFilter: 'upcoming',
      customDaysFilter: null,
      statusFilter: 'all',
      taskFilter: 'all',
      selectedTaskIds: [],
      searchTerm: ''
    })
  }

  const clearAllFilters = () => {
    updateMultipleFilters({
      dateRangeFilter: 'upcoming',
      customDaysFilter: null,
      statusFilter: 'all',
      taskFilter: 'all',
      selectedTaskIds: [],
      searchTerm: ''
    })
  }

  // Check if any non-default filters are active
  const hasActiveFilters =
    filters.statusFilter !== 'all' ||
    filters.dateRangeFilter !== 'upcoming' ||
    filters.searchTerm !== '' ||
    filters.taskFilter !== 'all' ||
    filters.selectedTaskIds.length > 0 ||
    filters.customDaysFilter !== null

  const activeFilterCount = [
    filters.statusFilter !== 'all',
    filters.dateRangeFilter !== 'upcoming',
    filters.searchTerm !== '',
    filters.taskFilter !== 'all',
    filters.selectedTaskIds.length > 0,
    filters.customDaysFilter !== null
  ].filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Filter Presets - Prominent at top */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#347dc4]" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Quick Views</h3>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-md text-xs font-semibold hover:bg-red-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-600 text-white rounded-full text-xs">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Operations View Preset */}
          <button
            onClick={applyOperationsView}
            className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all duration-200 text-left ${
              filters.dateRangeFilter === 'custom_days' && filters.customDaysFilter === 10 && filters.taskFilter === 'all'
                ? 'border-red-500 bg-red-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-gray-900">Operations View</h4>
                <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-xs font-bold">
                  {eventCounts.next10Days}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">Critical: Next 10 days</p>
            </div>
          </button>

          {/* Planning View Preset */}
          <button
            onClick={applyPlanningView}
            className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all duration-200 text-left ${
              filters.taskFilter === 'incomplete' && filters.taskDateRangeFilter === 45
                ? 'border-orange-500 bg-orange-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-gray-900">Planning View</h4>
                <span className="px-2 py-0.5 bg-orange-600 text-white rounded-full text-xs font-bold">
                  {eventCounts.next45Days}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">45 days, incomplete tasks</p>
            </div>
          </button>

          {/* All Events Preset */}
          <button
            onClick={applyAllEvents}
            className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all duration-200 text-left ${
              filters.dateRangeFilter === 'upcoming' && filters.taskFilter === 'all' && !hasActiveFilters
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-gray-900">All Upcoming</h4>
                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs font-bold">
                  {eventCounts.upcoming}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">All future events</p>
            </div>
          </button>
        </div>
      </div>

      {/* Search Bar and Filters - Single Row */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search events by name, location, or account..."
                value={filters.searchTerm}
                onChange={(e) => updateFilter('searchTerm', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#347dc4] focus:border-transparent text-sm"
              />
              {filters.searchTerm && (
                <button
                  onClick={() => updateFilter('searchTerm', '')}
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
              onChange={(e) => updateMultipleFilters({
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

          {/* Status Dropdown */}
          <div className="w-full lg:w-48">
            <select
              value={filters.statusFilter}
              onChange={(e) => updateFilter('statusFilter', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 focus:ring-2 focus:ring-[#347dc4] focus:border-transparent text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="postponed">Postponed</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
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
                    onClick={() => updateMultipleFilters({ dateRangeFilter: 'upcoming', customDaysFilter: null })}
                    className="hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Status: {filters.statusFilter}
                  <button
                    onClick={() => updateFilter('statusFilter', 'all')}
                    className="hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.searchTerm && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Search: "{filters.searchTerm}"
                  <button
                    onClick={() => updateFilter('searchTerm', '')}
                    className="hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Filters - Collapsible */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-[#347dc4]" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Advanced Filters</h3>
            {(filters.taskFilter !== 'all' || filters.selectedTaskIds.length > 0) && (
              <span className="px-2 py-0.5 bg-orange-600 text-white rounded-full text-xs font-bold">
                {filters.taskFilter === 'incomplete' ? '!' : ''}
                {filters.selectedTaskIds.length > 0 ? filters.selectedTaskIds.length : ''}
              </span>
            )}
          </div>
          {advancedFiltersOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {advancedFiltersOpen && (
          <div className="px-6 pb-6 space-y-4 border-t border-gray-200 pt-4">
            {/* Task Filter Mode */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Task Completion Filter
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    updateMultipleFilters({
                      taskFilter: 'all',
                      selectedTaskIds: []
                    })
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    filters.taskFilter === 'all'
                      ? 'bg-[#347dc4] text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  All Events
                </button>
                <button
                  onClick={() => updateFilter('taskFilter', 'incomplete')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    filters.taskFilter === 'incomplete'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-orange-50'
                  }`}
                >
                  <AlertCircle className="h-4 w-4" />
                  Incomplete Tasks Only
                </button>
              </div>
            </div>

            {filters.taskFilter === 'incomplete' && (
              <>
                {/* Task Date Range */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Events within next
                  </label>
                  <select
                    value={filters.taskDateRangeFilter}
                    onChange={(e) => updateFilter('taskDateRangeFilter', Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={45}>45 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>

                {/* Specific Task Selection */}
                {coreTasks.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Filter by Specific Tasks
                      </label>
                      {filters.selectedTaskIds.length > 0 && (
                        <button
                          onClick={() => updateFilter('selectedTaskIds', [])}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          Clear ({filters.selectedTaskIds.length})
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                      {coreTasks.map(task => (
                        <label
                          key={task.id}
                          className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-blue-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={filters.selectedTaskIds.includes(task.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                updateFilter('selectedTaskIds', [...filters.selectedTaskIds, task.id])
                              } else {
                                updateFilter('selectedTaskIds', filters.selectedTaskIds.filter(t => t !== task.id))
                              }
                            }}
                            className="w-4 h-4 text-[#347dc4] border-gray-300 rounded focus:ring-[#347dc4]"
                          />
                          <span className="text-sm text-gray-700">{task.task_name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Task Filters Display */}
                {filters.selectedTaskIds.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Selected Tasks ({filters.selectedTaskIds.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {filters.selectedTaskIds.map(taskId => {
                        const task = coreTasks.find(t => t.id === taskId)
                        return task ? (
                          <span
                            key={taskId}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {task.task_name}
                            <button
                              onClick={() => updateFilter('selectedTaskIds', filters.selectedTaskIds.filter(t => t !== taskId))}
                              className="hover:opacity-70"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Results Summary */}
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
                {filters.dateRangeFilter === 'all' && 'All events regardless of date'}
                {filters.dateRangeFilter === 'today' && 'Events happening today'}
                {filters.dateRangeFilter === 'this_week' && 'Events in the next 7 days'}
                {filters.dateRangeFilter === 'this_month' && 'Events in the current month'}
                {filters.dateRangeFilter === 'upcoming' && 'Events scheduled for today and beyond'}
                {filters.dateRangeFilter === 'past' && 'Events that have already occurred'}
                {filters.dateRangeFilter === 'custom_days' && filters.customDaysFilter && `Events in the next ${filters.customDaysFilter} days`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
