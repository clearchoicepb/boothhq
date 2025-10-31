/**
 * Sticky Event Context Bar
 * Displays key event information persistently across all tabs
 *
 * Shows:
 * - Event title
 * - Client/Account name
 * - Event date
 * - Status badge
 *
 * Positioned: Below main nav, above tabs (sticky)
 */

'use client'

import { Building2, Calendar, User } from 'lucide-react'
import { EventStatusBadge } from '../../event-status-badge'
import { formatDate } from '@/lib/utils/date-utils'

interface EventDate {
  id: string
  event_date: string
  start_time: string | null
  end_time: string | null
}

interface Event {
  id: string
  title: string
  status: string
  start_date: string
  event_dates?: EventDate[]
  account_name?: string | null
  contact_name?: string | null
  primary_contact?: {
    first_name: string
    last_name: string
  } | null
}

interface StickyEventContextProps {
  event: Event
}

export function StickyEventContext({ event }: StickyEventContextProps) {
  // Determine primary date
  const primaryDate = event.event_dates && event.event_dates.length > 0
    ? event.event_dates[0].event_date
    : event.start_date

  // Determine contact name
  const contactName = event.primary_contact
    ? `${event.primary_contact.first_name} ${event.primary_contact.last_name}`
    : event.contact_name

  return (
    <div className="sticky top-0 z-30 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 shadow-sm mb-6">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left side: Event info */}
          <div className="flex items-center gap-6 flex-wrap">
            {/* Event Title */}
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 truncate max-w-xs">
                {event.title}
              </h2>
              <EventStatusBadge status={event.status} />
            </div>

            {/* Divider */}
            <div className="hidden md:block h-6 w-px bg-gray-300" />

            {/* Client/Account */}
            {event.account_name && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 font-medium">
                  {event.account_name}
                </span>
              </div>
            )}

            {/* Contact */}
            {contactName && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  {contactName}
                </span>
              </div>
            )}

            {/* Event Date */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 font-medium">
                {formatDate(primaryDate)}
              </span>
            </div>
          </div>

          {/* Right side: Quick stats (optional) */}
          <div className="hidden lg:flex items-center gap-4 text-xs text-gray-500">
            {event.event_dates && event.event_dates.length > 1 && (
              <span className="px-2 py-1 bg-white rounded-full border border-gray-200">
                {event.event_dates.length} dates
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
