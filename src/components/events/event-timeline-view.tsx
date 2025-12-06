'use client'

import { useState } from 'react'
import { EventTimelineCard } from './event-timeline-card'
import { EventPreviewModal } from './event-preview-modal'
import { getDaysUntil } from '@/lib/utils/date-utils'
import type { Event, EventDate } from '@/types/events'

interface EventTimelineViewProps {
  events: Event[]
  tenantSubdomain: string
  coreTasks: any[]
}

export function EventTimelineView({
  events,
  tenantSubdomain,
  coreTasks
}: EventTimelineViewProps) {
  const [previewEventId, setPreviewEventId] = useState<string | null>(null)
  const [previewEventDate, setPreviewEventDate] = useState<EventDate | null>(null)

  const totalTasksPerEvent = coreTasks.length

  // Handler for opening preview modal with event date
  const handleOpenPreview = (event: Event) => {
    // Use _currentEventDate if available (for exploded multi-date events)
    // Otherwise use the first event_dates entry, or null
    const eventDate = event._currentEventDate || event.event_dates?.[0] || null
    const eventId = event._originalEventId || event.id

    setPreviewEventId(eventId)
    setPreviewEventDate(eventDate)
  }

  // Handler for closing preview modal
  const handleClosePreview = () => {
    setPreviewEventId(null)
    setPreviewEventDate(null)
  }

  // Helper function to calculate task progress for an event
  const getTaskProgress = (event: Event) => {
    if (totalTasksPerEvent === 0) {
      return { completed: 0, total: 0, percentage: 100 }
    }

    const completedTasks = event.task_completions?.filter(tc => tc.is_completed).length || 0
    const percentage = Math.round((completedTasks / totalTasksPerEvent) * 100)

    return {
      completed: completedTasks,
      total: totalTasksPerEvent,
      percentage
    }
  }

  // Group events into timeline sections
  const groupEventsByTimeline = () => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const groups = {
      todayTomorrow: [] as Event[],
      thisWeek: [] as Event[],
      nextTwoWeeks: [] as Event[],
      next15To45Days: [] as Event[],
      beyond45Days: [] as Event[]
    }

    events.forEach(event => {
      const daysUntil = event.start_date ? getDaysUntil(event.start_date) : null

      if (daysUntil === null || daysUntil < 0) {
        return // Skip past events
      }

      if (daysUntil <= 1) {
        // Today (0) and Tomorrow (1)
        groups.todayTomorrow.push(event)
      } else if (daysUntil <= 7) {
        // 2-7 days out
        groups.thisWeek.push(event)
      } else if (daysUntil <= 14) {
        // 8-14 days out
        groups.nextTwoWeeks.push(event)
      } else if (daysUntil <= 45) {
        // 15-45 days out
        groups.next15To45Days.push(event)
      } else {
        // 46+ days out
        groups.beyond45Days.push(event)
      }
    })

    return groups
  }

  const groupedEvents = groupEventsByTimeline()

  const timelineSections = [
    {
      id: 'todayTomorrow',
      title: 'TODAY & TOMORROW',
      subtitle: 'Critical Priority',
      icon: '🔥',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      textColor: 'text-red-800',
      events: groupedEvents.todayTomorrow
    },
    {
      id: 'thisWeek',
      title: 'THIS WEEK',
      subtitle: '2-7 Days Out',
      icon: '⚠️',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      textColor: 'text-orange-800',
      events: groupedEvents.thisWeek
    },
    {
      id: 'nextTwoWeeks',
      title: 'NEXT 8-14 DAYS',
      subtitle: 'Attention Needed',
      icon: '📅',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
      textColor: 'text-yellow-800',
      events: groupedEvents.nextTwoWeeks
    },
    {
      id: 'next15To45Days',
      title: '15-45 DAYS',
      subtitle: 'Planning Phase',
      icon: '📋',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      textColor: 'text-blue-800',
      events: groupedEvents.next15To45Days
    },
    {
      id: 'beyond45Days',
      title: 'BEYOND 45 DAYS',
      subtitle: 'Future Planning',
      icon: '🗓️',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-300',
      textColor: 'text-gray-800',
      events: groupedEvents.beyond45Days
    }
  ]

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="p-6">
          {/* Desktop: Grid Layout */}
          <div className="hidden lg:grid lg:grid-cols-5 gap-4">
            {timelineSections.map(section => (
              <div key={section.id} className="flex flex-col">
                {/* Section Header */}
                <div className={`${section.bgColor} border-2 ${section.borderColor} rounded-lg p-3 mb-3`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{section.icon}</span>
                    <div className="flex-1">
                      <h3 className={`text-xs font-bold uppercase tracking-wide ${section.textColor}`}>
                        {section.title}
                      </h3>
                      <p className="text-xs text-gray-600">{section.subtitle}</p>
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${section.textColor} mt-1`}>
                    {section.events.length} {section.events.length === 1 ? 'event' : 'events'}
                  </div>
                </div>

                {/* Event Cards */}
                <div className="space-y-3 flex-1 min-h-[200px]">
                  {section.events.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-400">No events</p>
                    </div>
                  ) : (
                    section.events.map(event => (
                      <EventTimelineCard
                        key={event.id}
                        event={event}
                        tenantSubdomain={tenantSubdomain}
                        taskProgress={getTaskProgress(event)}
                        onClick={() => handleOpenPreview(event)}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

        {/* Mobile/Tablet: Horizontal Scrolling Sections */}
        <div className="lg:hidden space-y-6">
          {timelineSections.map(section => (
            <div key={section.id}>
              {/* Section Header */}
              <div className={`${section.bgColor} border-2 ${section.borderColor} rounded-lg p-3 mb-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{section.icon}</span>
                    <div>
                      <h3 className={`text-sm font-bold uppercase tracking-wide ${section.textColor}`}>
                        {section.title}
                      </h3>
                      <p className="text-xs text-gray-600">{section.subtitle}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${section.textColor}`}>
                    {section.events.length}
                  </span>
                </div>
              </div>

              {/* Horizontal Scroll Container */}
              {section.events.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-400">No events in this section</p>
                </div>
              ) : (
                <div className="overflow-x-auto pb-2 -mx-4 px-4">
                  <div className="flex gap-3" style={{ minWidth: 'min-content' }}>
                    {section.events.map(event => (
                      <div key={event.id} className="w-72 flex-shrink-0">
                        <EventTimelineCard
                          event={event}
                          tenantSubdomain={tenantSubdomain}
                          taskProgress={getTaskProgress(event)}
                          onClick={() => handleOpenPreview(event)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {previewEventId && (
        <EventPreviewModal
          isOpen={!!previewEventId}
          onClose={handleClosePreview}
          eventId={previewEventId}
          tenantSubdomain={tenantSubdomain}
          selectedEventDate={previewEventDate}
        />
      )}
    </div>
  )
}
