import { Calendar, Clock, MapPin } from 'lucide-react'
import { EventStatusBadge } from './event-status-badge'
import { EventDate } from '@/hooks/useEventData'
import { formatDate, formatTime } from '@/lib/utils/date-utils'

interface EventDatesCardProps {
  eventDates: EventDate[]
  activeTab: number
  onTabChange: (index: number) => void
  onDateClick: (date: EventDate) => void
}

/**
 * Displays event dates in tabs with details for each date
 */
export function EventDatesCard({
  eventDates,
  activeTab,
  onTabChange,
  onDateClick,
}: EventDatesCardProps) {
  if (!eventDates || eventDates.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Dates</h2>
        <p className="text-gray-500 text-sm">No event dates set</p>
      </div>
    )
  }

  // If only one date, show simplified view
  if (eventDates.length === 1) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Date</h2>
        <div
          className="border border-gray-200 rounded-lg p-4 hover:border-[#347dc4] transition-colors cursor-pointer"
          onClick={() => onDateClick(eventDates[0])}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
              <span className="font-medium text-gray-900">
                {formatDate(eventDates[0].event_date)}
              </span>
            </div>
            <EventStatusBadge status={eventDates[0].status} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            {eventDates[0].setup_time && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>Setup: {formatTime(eventDates[0].setup_time)}</span>
              </div>
            )}
            {eventDates[0].start_time && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>Start: {formatTime(eventDates[0].start_time)}</span>
              </div>
            )}
            {eventDates[0].end_time && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>End: {formatTime(eventDates[0].end_time)}</span>
              </div>
            )}
            {eventDates[0].location_name && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{eventDates[0].location_name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Multiple dates - show tabs
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Dates</h2>
      
      {/* Date tabs */}
      <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
        {eventDates.map((date, index) => (
          <button
            key={date.id}
            onClick={() => onTabChange(index)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
              activeTab === index
                ? 'border-b-2 border-[#347dc4] text-[#347dc4]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Date {index + 1}
          </button>
        ))}
      </div>

      {/* Active date content */}
      {eventDates[activeTab] && (
        <div
          className="border border-gray-200 rounded-lg p-4 hover:border-[#347dc4] transition-colors cursor-pointer"
          onClick={() => onDateClick(eventDates[activeTab])}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-lg font-semibold text-gray-900">
                {formatDate(eventDates[activeTab].event_date, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <EventStatusBadge status={eventDates[activeTab].status} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            {eventDates[activeTab].setup_time && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Setup Time</label>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">{formatTime(eventDates[activeTab].setup_time)}</span>
                </div>
              </div>
            )}
            {eventDates[activeTab].start_time && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">{formatTime(eventDates[activeTab].start_time)}</span>
                </div>
              </div>
            )}
            {eventDates[activeTab].end_time && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">End Time</label>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">{formatTime(eventDates[activeTab].end_time)}</span>
                </div>
              </div>
            )}
          </div>

          {eventDates[activeTab].location_name && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900">{eventDates[activeTab].location_name}</span>
              </div>
            </div>
          )}

          {eventDates[activeTab].notes && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <p className="text-sm text-gray-700">{eventDates[activeTab].notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

