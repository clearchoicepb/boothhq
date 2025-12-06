/**
 * Event Details Panel
 * Displays event dates with internal tab navigation for multiple dates
 */

'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils/date-utils'
import type { EventDate } from '@/types/events'

interface EventDetailsPanelProps {
  eventDates: EventDate[]
  locations: Record<string, any>
}

export function EventDetailsPanel({ eventDates, locations }: EventDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState(0)

  if (!eventDates || eventDates.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h2>
        <div className="py-8 text-center">
          <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No event dates</h3>
          <p className="text-sm text-gray-600">
            Event dates will appear here once added to this opportunity.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h2>

      {/* Tabs for multiple event dates */}
      {eventDates.length > 1 && (
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-4 overflow-x-auto">
            {eventDates.map((eventDate, index) => (
              <button
                key={eventDate.id}
                onClick={() => setActiveTab(index)}
                className={`whitespace-nowrap py-2 px-3 border-b-2 font-medium text-sm ${
                  activeTab === index
                    ? 'border-[#347dc4] text-[#347dc4]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {formatDate(eventDate.event_date)}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Event date details */}
      {eventDates.map((eventDate, index) => (
        <div
          key={eventDate.id}
          className={eventDates.length > 1 && activeTab !== index ? 'hidden' : ''}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                <p className="text-sm text-gray-900">
                  {formatDate(eventDate.event_date, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
              <p className="text-sm text-gray-900">
                {eventDate.start_time && eventDate.end_time
                  ? `${formatTime(eventDate.start_time)} - ${formatTime(eventDate.end_time)}`
                  : formatTime(eventDate.start_time) || '-'}
              </p>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
              <p className="text-sm text-gray-900">
                {eventDate.location_id && locations[eventDate.location_id]
                  ? locations[eventDate.location_id].name
                  : 'Not specified'}
              </p>
            </div>
            {eventDate.notes && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <p className="text-sm text-gray-900">{eventDate.notes}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
