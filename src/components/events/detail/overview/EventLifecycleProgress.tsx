/**
 * Event Lifecycle Progress Indicator
 * Visual progress bar showing event stage from Planning to Complete
 *
 * Inspired by Opportunities stage progress indicator
 */

'use client'

import { getDaysUntil } from '@/lib/utils/date-utils'

interface EventDate {
  id: string
  event_date: string
  start_time: string | null
  end_time: string | null
}

interface Event {
  id: string
  status: string
  payment_status: string | null
  start_date: string
  event_dates?: EventDate[]
  updated_at: string
}

interface EventLifecycleProgressProps {
  event: Event
}

/**
 * Determines the current lifecycle stage based on event date proximity and status
 */
function getLifecycleStage(event: Event): 'planning' | 'setup' | 'execution' | 'complete' {
  const eventDate = event.event_dates && event.event_dates.length > 0
    ? event.event_dates[0].event_date
    : event.start_date

  const daysUntil = getDaysUntil(eventDate)

  // If event is marked completed or cancelled
  if (event.status === 'completed' || event.status === 'cancelled') {
    return 'complete'
  }

  // If event date has passed or is today
  if (daysUntil !== null && daysUntil <= 0) {
    return 'execution'
  }

  // If event is within 7 days
  if (daysUntil !== null && daysUntil <= 7) {
    return 'setup'
  }

  // Otherwise, still planning
  return 'planning'
}

/**
 * Get stage index for progress calculation
 */
function getStageIndex(stage: string): number {
  const stages = ['planning', 'setup', 'execution', 'complete']
  return stages.indexOf(stage)
}

export function EventLifecycleProgress({ event }: EventLifecycleProgressProps) {
  const currentStage = getLifecycleStage(event)
  const currentStageIndex = getStageIndex(currentStage)

  const eventDate = event.event_dates && event.event_dates.length > 0
    ? event.event_dates[0].event_date
    : event.start_date

  const daysUntil = getDaysUntil(eventDate)

  // Calculate days in current stage (days since last updated)
  const daysSinceUpdated = Math.floor(
    (new Date().getTime() - new Date(event.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  const stages = [
    { id: 'planning', name: 'Planning', color: 'bg-blue-400' },
    { id: 'setup', name: 'Setup', color: 'bg-yellow-400' },
    { id: 'execution', name: 'Execution', color: 'bg-green-400' },
    { id: 'complete', name: 'Complete', color: 'bg-gray-400' }
  ]

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-500">Event Lifecycle</label>
        <span className="text-xs text-gray-500">
          {daysUntil !== null && daysUntil > 0
            ? `${daysUntil} day${daysUntil !== 1 ? 's' : ''} until event`
            : daysUntil === 0
            ? 'Event is today!'
            : daysUntil !== null
            ? `Event was ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`
            : ''}
          {daysSinceUpdated > 0 && (
            <> · {daysSinceUpdated} day{daysSinceUpdated !== 1 ? 's' : ''} in current stage</>
          )}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {stages.map((stage, index) => {
          const isActive = currentStage === stage.id
          const isCompleted = currentStageIndex > index
          const isUpcoming = currentStageIndex < index

          return (
            <div key={stage.id} className="flex-1">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-[#347dc4] shadow-md'
                    : isCompleted
                    ? stage.color
                    : 'bg-gray-200'
                }`}
              />
              <p
                className={`text-[9px] mt-1 text-center transition-all duration-300 ${
                  isActive
                    ? 'font-semibold text-gray-900'
                    : isCompleted
                    ? 'text-gray-600'
                    : 'text-gray-400'
                }`}
              >
                {stage.name}
              </p>
            </div>
          )
        })}
      </div>

      {/* Status indicators */}
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#347dc4]" />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-200" />
          <span>Upcoming</span>
        </div>
      </div>
    </div>
  )
}
