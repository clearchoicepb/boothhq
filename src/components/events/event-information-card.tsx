import { Calendar, MapPin, DollarSign, Users, Edit, X, Check } from 'lucide-react'
import { EventStatusBadge } from './event-status-badge'
import { EventTypeBadge } from './event-type-badge'
import { PaymentStatusBadge } from './payment-status-badge'
import { EventWithRelations } from '@/hooks/useEventData'
import { formatDate } from '@/lib/utils/date-utils'

interface PaymentStatusOption {
  id: string
  status_name: string
  status_color: string | null
}

interface EventInformationCardProps {
  event: EventWithRelations
  paymentStatusOptions: PaymentStatusOption[]
  isEditingPaymentStatus: boolean
  canManageEvents: boolean
  onStartEditPaymentStatus: () => void
  onUpdatePaymentStatus: (status: string) => void
  onCancelEditPaymentStatus: () => void
}

/**
 * Displays core event information including status, type, location, dates, etc.
 */
export function EventInformationCard({
  event,
  paymentStatusOptions,
  isEditingPaymentStatus,
  canManageEvents,
  onStartEditPaymentStatus,
  onUpdatePaymentStatus,
  onCancelEditPaymentStatus,
}: EventInformationCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Event Category & Type */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-500 mb-2">Event Category & Type</label>
          <EventTypeBadge 
            category={event.event_category} 
            type={event.event_type} 
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
          <EventStatusBadge status={event.status} />
        </div>

        {/* Payment Status */}
        <div>
          <label htmlFor="payment-status" className="block text-sm font-medium text-gray-500 mb-1">Payment Status</label>
          {isEditingPaymentStatus ? (
            <div className="flex items-center gap-2">
              <select
                id="payment-status"
                name="payment-status"
                value={event.payment_status?.name || ''}
                onChange={(e) => onUpdatePaymentStatus(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
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
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <PaymentStatusBadge
                status={event.payment_status?.name}
                color={event.payment_status?.color}
              />
              {canManageEvents && (
                <button
                  onClick={onStartEditPaymentStatus}
                  className="p-1 text-gray-400 hover:text-[#347dc4]"
                  title="Edit payment status"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Start Date</label>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-900">
              {formatDate(event.start_date)}
            </span>
          </div>
        </div>

        {/* End Date */}
        {event.end_date && (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">End Date</label>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-900">
                {formatDate(event.end_date)}
              </span>
            </div>
          </div>
        )}

        {/* Location */}
        {event.location && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 mb-1">Location</label>
            <div className="flex items-center">
              <MapPin className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-900">{event.location}</span>
            </div>
          </div>
        )}

        {/* Date Type */}
        {event.date_type && (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Date Type</label>
            <span className="text-sm text-gray-900 capitalize">
              {event.date_type.replace(/_/g, ' ')}
            </span>
          </div>
        )}

        {/* Guest Count */}
        {event.guest_count && (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Guest Count</label>
            <div className="flex items-center">
              <Users className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-900">{event.guest_count}</span>
            </div>
          </div>
        )}

        {/* Event Value */}
        {event.event_value && (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Event Value</label>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-900">
                ${parseFloat(event.event_value).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

