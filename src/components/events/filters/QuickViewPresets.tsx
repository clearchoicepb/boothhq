'use client'

import { Zap, X, AlertCircle, CheckCircle2, Calendar } from 'lucide-react'
import type { EventCounts } from '@/types/events'

interface QuickViewPresetsProps {
  eventCounts: EventCounts
  hasActiveFilters: boolean
  activeFilterCount: number
  isOperationsViewActive: boolean
  isPlanningViewActive: boolean
  isAllEventsActive: boolean
  onApplyOperationsView: () => void
  onApplyPlanningView: () => void
  onApplyAllEvents: () => void
  onClearAllFilters: () => void
}

/**
 * Quick view preset buttons (Operations, Planning, All Events)
 */
export function QuickViewPresets({
  eventCounts,
  hasActiveFilters,
  activeFilterCount,
  isOperationsViewActive,
  isPlanningViewActive,
  isAllEventsActive,
  onApplyOperationsView,
  onApplyPlanningView,
  onApplyAllEvents,
  onClearAllFilters
}: QuickViewPresetsProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-[#347dc4]" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Quick Views</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearAllFilters}
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
          onClick={onApplyOperationsView}
          className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all duration-200 text-left ${
            isOperationsViewActive
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
          onClick={onApplyPlanningView}
          className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all duration-200 text-left ${
            isPlanningViewActive
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
          onClick={onApplyAllEvents}
          className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all duration-200 text-left ${
            isAllEventsActive
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
  )
}
