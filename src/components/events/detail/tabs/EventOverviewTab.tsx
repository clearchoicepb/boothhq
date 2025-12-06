/**
 * Event Overview Tab - SOLID-Compliant Orchestrator
 * Composes sub-components to display event overview information
 *
 * Following the pattern from OpportunityOverviewTab for consistency:
 * - Single Responsibility: Only orchestrates child components
 * - Open/Closed: Extensible through composition
 * - Interface Segregation: Child components receive only what they need
 * - Dependency Inversion: Uses hooks for business logic abstraction
 */

'use client'

import { EventKeyMetricsCards } from '../overview/EventKeyMetricsCards'
import { EventAccountContactCard } from '../../event-account-contact-card'
import { EventDatesCard } from '../../event-dates-card'
import { EventDescriptionCard } from '../../event-description-card'
import { EventTypeBadge } from '../../event-type-badge'
import { NotesSection } from '@/components/notes-section'
import type { EventDate } from '@/types/events'

interface EventCategory {
  id: string
  name: string
  slug: string
  color: string
  icon?: string
}

interface EventType {
  id: string
  name: string
  slug: string
  color?: string
  icon?: string
}

interface Event {
  id: string
  title: string
  description: string | null
  status: string
  payment_status: string | null
  event_value: string | null
  start_date: string
  end_date: string | null
  event_category: EventCategory | null
  event_type: EventType | null
  location: string | null
  date_type: string | null
  guest_count: number | null
  account_id: string | null
  account_name: string | null
  contact_id: string | null
  contact_name: string | null
  primary_contact_id: string | null
  primary_contact?: any
  event_planner_id?: string | null
  event_planner?: any
  opportunity_id?: string | null
  opportunity_name?: string | null
  mailing_address_line1?: string | null
  mailing_address_line2?: string | null
  mailing_city?: string | null
  mailing_state?: string | null
  mailing_postal_code?: string | null
  mailing_country?: string | null
  event_dates?: EventDate[]
  created_at: string
  updated_at: string
}

interface PaymentStatusOption {
  id: string
  status_name: string
  status_color: string | null
}

interface Invoice {
  id: string
  invoice_number: string
  status: string
  total_amount: number
  paid_amount: number
  balance_amount: number
}

interface EventOverviewTabProps {
  event: Event
  eventDates: EventDate[]
  paymentStatusOptions: PaymentStatusOption[]
  tenantSubdomain: string
  invoices?: Invoice[]

  // Editing states
  isEditingAccountContact: boolean
  editAccountId: string
  editContactId: string
  editEventPlannerId?: string
  isEditingPaymentStatus: boolean
  isEditingDescription: boolean
  editedDescription: string

  // Event handlers
  onStartEditAccountContact: () => void
  onSaveAccountContact: () => void
  onCancelEditAccountContact: () => void
  onAccountChange: (accountId: string | null) => void
  onContactChange: (contactId: string | null) => void
  onEventPlannerChange?: (eventPlannerId: string | null) => void

  onStartEditPaymentStatus: () => void
  onUpdatePaymentStatus: (status: string) => void
  onCancelEditPaymentStatus: () => void

  onStartEditDescription: () => void
  onDescriptionChange: (description: string) => void
  onSaveDescription: () => void
  onCancelEditDescription: () => void

  // Permissions
  canManageEvents: boolean

  // Other handlers
  activeEventDateTab: number
  onEventDateTabChange: (tab: number) => void
  onDateClick: (date: EventDate) => void

  // Staff data for sidebar
  staffAssignments: any[]
  onNavigateToStaffing: () => void
}

/**
 * Derive payment status from invoice statuses
 */
function derivePaymentStatus(invoices: Invoice[]): string | null {
  if (!invoices || invoices.length === 0) return null

  const statuses = invoices.map(inv => inv.status)

  // If all invoices are paid_in_full, event is fully paid
  if (statuses.every(s => s === 'paid_in_full')) {
    return 'Paid in Full'
  }

  // If all invoices are draft or cancelled, no payment status
  if (statuses.every(s => s === 'draft' || s === 'cancelled')) {
    return null
  }

  // If any invoice has partial payment
  if (statuses.some(s => s === 'partially_paid')) {
    return 'Partially Paid'
  }

  // If any invoice is past due
  if (statuses.some(s => s === 'past_due')) {
    return 'Past Due'
  }

  // If no payments received on active invoices
  if (statuses.some(s => s === 'no_payments_received')) {
    return 'No Payments Received'
  }

  return null
}

export function EventOverviewTab({
  event,
  eventDates,
  paymentStatusOptions,
  tenantSubdomain,
  invoices = [],
  isEditingAccountContact,
  editAccountId,
  editContactId,
  editEventPlannerId,
  isEditingPaymentStatus,
  isEditingDescription,
  editedDescription,
  onStartEditAccountContact,
  onSaveAccountContact,
  onCancelEditAccountContact,
  onAccountChange,
  onContactChange,
  onEventPlannerChange,
  onStartEditPaymentStatus,
  onUpdatePaymentStatus,
  onCancelEditPaymentStatus,
  onStartEditDescription,
  onDescriptionChange,
  onSaveDescription,
  onCancelEditDescription,
  canManageEvents,
  activeEventDateTab,
  onEventDateTabChange,
  onDateClick,
  staffAssignments,
  onNavigateToStaffing
}: EventOverviewTabProps) {
  // Calculate Event Value from all invoices
  const calculatedEventValue = invoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0)

  // Derive Payment Status from invoice statuses
  const derivedPaymentStatus = derivePaymentStatus(invoices)

  // Create enhanced event object with calculated values
  const enhancedEvent = {
    ...event,
    event_value: calculatedEventValue > 0 ? calculatedEventValue.toString() : event.event_value,
    payment_status: derivedPaymentStatus || event.payment_status
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics: Event Date, Payment Status, Event Value, Status */}
      <EventKeyMetricsCards
        event={enhancedEvent}
        paymentStatusOptions={paymentStatusOptions}
        isEditingPaymentStatus={isEditingPaymentStatus}
        onStartEditPaymentStatus={onStartEditPaymentStatus}
        onUpdatePaymentStatus={onUpdatePaymentStatus}
        onCancelEditPaymentStatus={onCancelEditPaymentStatus}
        canEdit={canManageEvents}
      />

      {/* Main Content and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account and Contact */}
          <EventAccountContactCard
            event={event}
            isEditing={isEditingAccountContact}
            editAccountId={editAccountId}
            editContactId={editContactId}
            editEventPlannerId={editEventPlannerId}
            tenantSubdomain={tenantSubdomain}
            onStartEdit={onStartEditAccountContact}
            onSave={onSaveAccountContact}
            onCancel={onCancelEditAccountContact}
            onAccountChange={onAccountChange}
            onContactChange={onContactChange}
            onEventPlannerChange={onEventPlannerChange}
            canEdit={canManageEvents}
          />

          {/* Event Dates */}
          <EventDatesCard
            eventDates={eventDates}
            activeTab={activeEventDateTab}
            onTabChange={onEventDateTabChange}
            onDateClick={onDateClick}
          />

          {/* Mailing Address */}
          {(event.mailing_address_line1 || event.mailing_city) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Mailing Address</h2>
              <div className="text-sm text-gray-600">
                {event.mailing_address_line1 && <p>{event.mailing_address_line1}</p>}
                {event.mailing_address_line2 && <p>{event.mailing_address_line2}</p>}
                <p>
                  {event.mailing_city}
                  {event.mailing_state && `, ${event.mailing_state}`}
                  {event.mailing_postal_code && ` ${event.mailing_postal_code}`}
                </p>
                {event.mailing_country && <p>{event.mailing_country}</p>}
              </div>
            </div>
          )}

          {/* Notes */}
          <NotesSection
            entityId={event.id}
            entityType="event"
          />
        </div>

        {/* Sidebar - 1/3 width */}
        <div className="space-y-6">
          {/* Description */}
          {event.description && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Event Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h3>
            <div className="space-y-3">
              {(event.event_category || event.event_type) && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Category & Type</label>
                  <EventTypeBadge
                    category={event.event_category}
                    type={event.event_type}
                  />
                </div>
              )}
              {event.guest_count && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Guest Count</label>
                  <p className="text-sm text-gray-900">{event.guest_count}</p>
                </div>
              )}
            </div>
          </div>

          {/* Staffing Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Staffing</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Operations Team</span>
                <span className="font-semibold text-gray-900">
                  {staffAssignments.filter(s => !s.event_date_id && s.staff_roles?.type === 'operations').length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Event Staff</span>
                <span className="font-semibold text-gray-900">
                  {staffAssignments.filter(s => s.event_date_id && s.staff_roles?.type === 'event_staff').length}
                </span>
              </div>
              <button
                onClick={onNavigateToStaffing}
                className="w-full mt-3 px-4 py-2 text-sm font-medium text-[#347dc4] bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
              >
                Manage Staff →
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Created</p>
                <p className="text-xs text-gray-500">
                  {new Date(event.created_at).toLocaleDateString()} at{' '}
                  {new Date(event.created_at).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Last Updated</p>
                <p className="text-xs text-gray-500">
                  {new Date(event.updated_at).toLocaleDateString()} at{' '}
                  {new Date(event.updated_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
