'use client'

import { Calendar, MapPin, Building2, CheckCircle2, AlertCircle } from 'lucide-react'
import { formatDateShort, getDaysUntil, isDateToday } from '@/lib/utils/date-utils'
import type { Event } from '@/types/events'

interface EventTimelineCardProps {
  event: Event
  tenantSubdomain: string
  taskProgress: {
    completed: number
    total: number
    percentage: number
  }
  onClick: () => void
}

export function EventTimelineCard({
  event,
  tenantSubdomain,
  taskProgress,
  onClick
}: EventTimelineCardProps) {
  const daysUntil = event.start_date ? getDaysUntil(event.start_date) : null
  const displayDate = event.start_date ? formatDateShort(event.start_date) : 'No date'
  const displayLocation = event.event_dates?.[0]?.locations?.name || event.location || 'TBD'

  // Determine priority level
  const getPriorityLevel = () => {
    if (daysUntil === null || daysUntil < 0) return 'none'
    if (daysUntil <= 2) return 'critical'
    if (daysUntil <= 7) return 'high'
    if (daysUntil <= 14) return 'medium'
    if (daysUntil <= 30) return 'low'
    return 'none'
  }

  const priorityLevel = getPriorityLevel()

  const priorityConfig = {
    critical: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800', dot: 'bg-red-500' },
    high: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800', dot: 'bg-orange-500' },
    medium: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800', dot: 'bg-yellow-500' },
    low: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800', dot: 'bg-blue-500' },
    none: { bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-800', dot: 'bg-gray-400' }
  }

  const priority = priorityConfig[priorityLevel]

  return (
    <div
      onClick={onClick}
      className={`${priority.bg} border-2 ${priority.border} rounded-lg p-3 cursor-pointer hover:shadow-md transition-all duration-200 group`}
    >
      {/* Header with title and days until */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-sm text-gray-900 line-clamp-2 flex-1 pr-2 group-hover:text-[#347dc4]">
          {event.title || 'Untitled Event'}
        </h4>
        {daysUntil !== null && daysUntil >= 0 && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${priority.text} ${priority.bg} flex-shrink-0`}>
            {isDateToday(event.start_date) ? 'TODAY' : `${daysUntil}d`}
          </span>
        )}
      </div>

      {/* Category & Type */}
      <div className="flex flex-wrap gap-1 mb-2">
        {event.event_categories && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
            style={{
              backgroundColor: event.event_categories.color + '15',
              color: event.event_categories.color,
              borderColor: event.event_categories.color + '40',
              borderWidth: '1px'
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: event.event_categories.color }}
            />
            {event.event_categories.name}
          </span>
        )}
        {event.event_types && (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
            {event.event_types.name}
          </span>
        )}
      </div>

      {/* Date */}
      <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
        <Calendar className="h-3 w-3 flex-shrink-0" />
        <span>{displayDate}</span>
      </div>

      {/* Location */}
      <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
        <MapPin className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{displayLocation}</span>
      </div>

      {/* Account */}
      {event.account_name && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
          <Building2 className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{event.account_name}</span>
        </div>
      )}

      {/* Task Progress */}
      {taskProgress.total > 0 && (
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Tasks</span>
            <span className={`text-xs font-bold ${
              taskProgress.percentage === 100 ? 'text-green-600' :
              taskProgress.percentage >= 75 ? 'text-blue-600' :
              taskProgress.percentage >= 50 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {taskProgress.completed}/{taskProgress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                taskProgress.percentage === 100 ? 'bg-green-500' :
                taskProgress.percentage >= 75 ? 'bg-blue-500' :
                taskProgress.percentage >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${taskProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Task Ready Badge */}
      <div className="mt-2 flex items-center gap-1 flex-wrap">
        {taskProgress.percentage === 100 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </span>
        )}

        {taskProgress.percentage < 100 && taskProgress.total > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
            <AlertCircle className="h-3 w-3" />
            {taskProgress.total - taskProgress.completed} left
          </span>
        )}
      </div>
    </div>
  )
}
