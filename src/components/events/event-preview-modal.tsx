'use client'

import { useEffect, useState } from 'react'
import { X, Calendar, MapPin, Building2, User, CheckCircle2, Clock, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils/date-utils'
import Link from 'next/link'

interface EventPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  tenantSubdomain: string
}

export function EventPreviewModal({
  isOpen,
  onClose,
  eventId,
  tenantSubdomain
}: EventPreviewModalProps) {
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Event Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ) : event ? (
            <div className="space-y-4">
              {/* Title and Status */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {event.title || 'Untitled Event'}
                </h3>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  event.status === 'completed' ? 'bg-green-100 text-green-800' :
                  event.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                  event.status === 'scheduled' ? 'bg-purple-100 text-purple-800' :
                  event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {event.status}
                </span>
              </div>

              {/* Category & Type */}
              {(event.event_categories || event.event_types) && (
                <div className="flex flex-wrap gap-2">
                  {event.event_categories && (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium"
                      style={{
                        backgroundColor: event.event_categories.color + '20',
                        color: event.event_categories.color,
                        borderColor: event.event_categories.color + '40',
                        borderWidth: '1px'
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: event.event_categories.color }}
                      />
                      {event.event_categories.name}
                    </span>
                  )}
                  {event.event_types && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm font-medium">
                      {event.event_types.name}
                    </span>
                  )}
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-t border-gray-200">
                {/* Date */}
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Date</p>
                    <p className="text-sm text-gray-600">
                      {event.start_date ? formatDate(event.start_date) : 'Not set'}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Location</p>
                    <p className="text-sm text-gray-600">
                      {event.event_dates?.[0]?.locations?.name || event.location || 'TBD'}
                    </p>
                  </div>
                </div>

                {/* Account */}
                {event.account_name && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Account</p>
                      <p className="text-sm text-gray-600">{event.account_name}</p>
                    </div>
                  </div>
                )}

                {/* Contact */}
                {event.contact_name && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
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
                  <p className="text-sm font-medium text-gray-900 mb-2">Description</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{event.description}</p>
                </div>
              )}

              {/* Task Progress */}
              {event.task_completions && event.task_completions.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-900 mb-3">Tasks</p>
                  <div className="space-y-2">
                    {event.task_completions.map((task: any, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        {task.is_completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={`text-sm ${task.is_completed ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
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

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Close
          </button>
          <Link
            href={`/${tenantSubdomain}/events/${eventId}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#347dc4] text-white rounded-md hover:bg-[#2c6ba8] text-sm font-medium transition-colors"
          >
            Open Full Details
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
