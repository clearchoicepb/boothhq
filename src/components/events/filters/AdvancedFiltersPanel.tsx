'use client'

import { useState } from 'react'
import { Filter, ChevronDown, ChevronUp, AlertCircle, X } from 'lucide-react'
import type { FilterState, CoreTask } from '@/types/events'

interface AdvancedFiltersPanelProps {
  filters: FilterState
  /** @deprecated Core Tasks system has been replaced by unified Tasks. This prop will be empty. */
  coreTasks?: CoreTask[]
  onUpdateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  onUpdateMultipleFilters: (updates: Partial<FilterState>) => void
}

/**
 * Collapsible advanced filters panel (Task completion, date range, task selection)
 */
export function AdvancedFiltersPanel({
  filters,
  coreTasks = [],
  onUpdateFilter,
  onUpdateMultipleFilters
}: AdvancedFiltersPanelProps) {
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)

  return (
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
                  onUpdateMultipleFilters({
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
                onClick={() => onUpdateFilter('taskFilter', 'incomplete')}
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
                  onChange={(e) => onUpdateFilter('taskDateRangeFilter', Number(e.target.value))}
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
                        onClick={() => onUpdateFilter('selectedTaskIds', [])}
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
                              onUpdateFilter('selectedTaskIds', [...filters.selectedTaskIds, task.id])
                            } else {
                              onUpdateFilter('selectedTaskIds', filters.selectedTaskIds.filter(t => t !== task.id))
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
                            onClick={() => onUpdateFilter('selectedTaskIds', filters.selectedTaskIds.filter(t => t !== taskId))}
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
  )
}
