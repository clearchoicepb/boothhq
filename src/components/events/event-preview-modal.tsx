'use client'

import { useEffect, useState } from 'react'
import { Calendar, MapPin, Building2, User, CheckCircle2, Clock, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils/date-utils'
import Link from 'next/link'
import { Modal } from '@/components/ui/modal'

interface EventDate {
  id: string
  event_date: string
  start_time?: string
  end_time?: string
  location_id?: string
  locations?: {
    id: string
    name: string
  }
}

interface EventPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  tenantSubdomain: string
  selectedEventDate?: EventDate | null
}

export function EventPreviewModal({
  isOpen,
  onClose,
  eventId,
  tenantSubdomain,
  selectedEventDate
}: EventPreviewModalProps) {
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Debug: Log what date we're supposed to show
  useEffect(() => {
    if (isOpen) {
      console.log('[PREVIEW MODAL] Opening with:', {
        eventId,
        selectedEventDate,
        hasSelectedDate: !!selectedEventDate,
        selectedDateValue: selectedEventDate?.event_date
      })
    }
  }, [isOpen, eventId, selectedEventDate])

  useEffect(() => {
    if (isOpen && eventId) {
      fetchEventDetails()
    }
  }, [isOpen, eventId])

  const fetchEventDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/events/${eventId}`)
      const data = await response.json()
      setEvent(data)
    } catch (error) {
      console.error('Error fetching event details:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Event Preview"
      className="sm:max-w-2xl"
    >
      <div className="flex max-h-[80vh] flex-col">
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-3/4 rounded bg-gray-200"></div>
              <div className="h-4 w-1/2 rounded bg-gray-200"></div>
              <div className="h-4 w-2/3 rounded bg-gray-200"></div>
              <div className="h-32 rounded bg-gray-200"></div>
            </div>
          ) : event ? (
            <div className="space-y-4">
              {/* Title and Status */}
              <div>
                <h3 className="mb-2 text-2xl font-bold text-gray-900">
                  {event.title || 'Untitled Event'}
                </h3>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                    event.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : event.status === 'confirmed'
                        ? 'bg-blue-100 text-blue-800'
                        : event.status === 'scheduled'
                          ? 'bg-purple-100 text-purple-800'
                          : event.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {event.status}
                </span>
              </div>

              {/* Category & Type */}
              {(event.event_categories || event.event_types) && (
                <div className="flex flex-wrap gap-2">
                  {event.event_categories && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium"
                      style={{
                        backgroundColor: event.event_categories.color + '20',
                        color: event.event_categories.color,
                        borderColor: event.event_categories.color + '40',
                        borderWidth: '1px'
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: event.event_categories.color }}
                      />
                      {event.event_categories.name}
                    </span>
                  )}
                  {event.event_types && (
                    <span className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                      {event.event_types.name}
                    </span>
                  )}
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 gap-4 border-t border-gray-200 py-4 md:grid-cols-2">
                {/* Date */}
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Date</p>
                    <p className="text-sm text-gray-600">
                      {selectedEventDate
                        ? formatDate(selectedEventDate.event_date)
                        : event.start_date
                          ? formatDate(event.start_date)
                          : 'Not set'}
                    </p>
                    {selectedEventDate && (selectedEventDate.start_time || selectedEventDate.end_time) && (
                      <p className="mt-1 text-xs text-gray-500">
                        {selectedEventDate.start_time && selectedEventDate.end_time
                          ? `${selectedEventDate.start_time} - ${selectedEventDate.end_time}`
                          : selectedEventDate.start_time || selectedEventDate.end_time}
                      </p>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Location</p>
                    <p className="text-sm text-gray-600">
                      {selectedEventDate?.locations?.name || event.event_dates?.[0]?.locations?.name || event.location || 'TBD'}
                    </p>
                  </div>
                </div>

                {/* Account */}
                {event.account_name && (
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Account</p>
                      <p className="text-sm text-gray-600">{event.account_name}</p>
                    </div>
                  </div>
                )}

                {/* Contact */}
                {event.contact_name && (
                  <div className="flex items-start gap-3">
                    <User className="mt-0.5 h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Contact</p>
                      <p className="text-sm text-gray-600">{event.contact_name}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {event.description && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="mb-2 text-sm font-medium text-gray-900">Description</p>
                  <p className="whitespace-pre-wrap text-sm text-gray-600">{event.description}</p>
                </div>
              )}

              {/* Task Progress */}
              {event.task_completions && event.task_completions.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="mb-3 text-sm font-medium text-gray-900">Tasks</p>
                  <div className="space-y-2">
                    {event.task_completions.map((task: any, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        {task.is_completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400" />
                        )}
                        <span
                          className={`text-sm ${task.is_completed ? 'text-gray-600 line-through' : 'text-gray-900'}`}
                        >
                          Task {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-600">Event not found</p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end border-t border-gray-200 pt-4">
          <Link
            href={`/${tenantSubdomain}/events/${eventId}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-md bg-[#347dc4] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2c6ba8]"
          >
            Open Full Details
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </Modal>
  )
}
