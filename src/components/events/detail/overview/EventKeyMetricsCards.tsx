/**
 * Event Key Metrics Cards
 * Displays 4 critical event metrics: Event Date, Payment Status, Event Value, Status
 *
 * Follows the pattern from OpportunityKeyMetricsCards for consistency
 */

'use client'

import { Calendar, DollarSign } from 'lucide-react'
import { formatDate, getDaysUntil } from '@/lib/utils/date-utils'
import { PaymentStatusBadge } from '../../payment-status-badge'
import { EventStatusBadge } from '../../event-status-badge'

interface EventDate {
  id: string
  event_date: string
  start_time: string | null
  end_time: string | null
  location_id: string | null
  notes: string | null
}

interface Event {
  id: string
  status: string
  payment_status: string | null
  event_value: string | null
  start_date: string
  event_dates?: EventDate[]
}

interface PaymentStatusOption {
  id: string
  status_name: string
  status_color: string | null
}

interface EventKeyMetricsCardsProps {
  event: Event
  paymentStatusOptions: PaymentStatusOption[]
  isEditingPaymentStatus: boolean
  onStartEditPaymentStatus: () => void
  onUpdatePaymentStatus: (status: string) => void
  onCancelEditPaymentStatus: () => void
  isEditingStatus?: boolean
  onStatusChange?: (status: string) => void
  canEdit: boolean
}

export function EventKeyMetricsCards({
  event,
  paymentStatusOptions,
  isEditingPaymentStatus,
  onStartEditPaymentStatus,
  onUpdatePaymentStatus,
  onCancelEditPaymentStatus,
  isEditingStatus = false,
  onStatusChange,
  canEdit
}: EventKeyMetricsCardsProps) {
  // Determine which date to display (first event_date or start_date fallback)
  const primaryDate = event.event_dates && event.event_dates.length > 0
    ? event.event_dates[0].event_date
    : event.start_date

  const daysUntil = getDaysUntil(primaryDate)
  const hasMultipleDates = event.event_dates && event.event_dates.length > 1

  // Format event value
  const eventValue = event.event_value
    ? parseFloat(event.event_value).toLocaleString()
    : '0'

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Event Date Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <label className="block text-sm font-medium text-gray-500 mb-3">Event Date</label>
        <div>
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-[#347dc4] mr-2 flex-shrink-0" />
            <p className="text-2xl font-bold text-gray-900">
              {formatDate(primaryDate)}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {daysUntil !== null && daysUntil > 0
              ? `${daysUntil} day${daysUntil !== 1 ? 's' : ''} away`
              : daysUntil === 0
              ? 'Today!'
              : daysUntil !== null
              ? `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`
              : ''}
          </p>
          {hasMultipleDates && (
            <p className="text-xs text-gray-500">
              +{event.event_dates!.length - 1} more date{event.event_dates!.length > 2 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Payment Status Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <label className="block text-sm font-medium text-gray-500 mb-3">Payment Status</label>
        {isEditingPaymentStatus ? (
          <div className="flex flex-col gap-2">
            <select
              value={event.payment_status || ''}
              onChange={(e) => onUpdatePaymentStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-transparent text-gray-900"
            >
              <option value="">Not Set</option>
              {paymentStatusOptions.map((option) => (
                <option key={option.id} value={option.status_name}>
                  {option.status_name}
                </option>
              ))}
            </select>
            <button
              onClick={onCancelEditPaymentStatus}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div
            className={canEdit ? 'cursor-pointer' : ''}
            onClick={canEdit ? onStartEditPaymentStatus : undefined}
          >
            <PaymentStatusBadge
              status={event.payment_status}
              color={paymentStatusOptions.find(opt => opt.status_name === event.payment_status)?.status_color}
            />
            {canEdit && (
              <p className="text-xs text-gray-400 mt-2 hover:text-gray-600">
                Click to edit
              </p>
            )}
          </div>
        )}
      </div>

      {/* Event Value Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <label className="block text-sm font-medium text-gray-500 mb-3">Event Value</label>
        <div className="flex items-baseline">
          <DollarSign className="h-6 w-6 text-[#347dc4] mr-1 mt-1" />
          <p className="text-4xl font-bold text-[#347dc4]">
            {eventValue}
          </p>
        </div>
        {event.payment_status && (
          <p className="text-xs text-gray-500 mt-2">
            Status: {event.payment_status}
          </p>
        )}
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <label className="block text-sm font-medium text-gray-500 mb-3">Event Status</label>
        {isEditingStatus && onStatusChange ? (
          <select
            value={event.status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-4 py-3 text-lg font-semibold rounded-md border-2 focus:outline-none focus:ring-2 focus:ring-[#347dc4] text-gray-900"
          >
            <option value="planning">Planning</option>
            <option value="confirmed">Confirmed</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        ) : (
          <div>
            <EventStatusBadge status={event.status} />
            {canEdit && onStatusChange && (
              <p className="text-xs text-gray-400 mt-2">
                Contact admin to change status
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
