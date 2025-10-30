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
import { EventLifecycleProgress } from '../overview/EventLifecycleProgress'
import { EventAccountContactCard } from '../../event-account-contact-card'
import { EventDatesCard } from '../../event-dates-card'
import { EventDescriptionCard } from '../../event-description-card'
import { NotesSection } from '@/components/notes-section'

interface EventDate {
  id: string
  event_date: string
  start_time: string | null
  end_time: string | null
  location_id: string | null
  notes: string | null
  status: string
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
  event_category: string | null
  event_type: string | null
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

interface EventOverviewTabProps {
  event: Event
  eventDates: EventDate[]
  paymentStatusOptions: PaymentStatusOption[]
  tenantSubdomain: string

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

export function EventOverviewTab({
  event,
  eventDates,
  paymentStatusOptions,
  tenantSubdomain,
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
  return (
    <div className="space-y-6">
      {/* Event Lifecycle Progress Indicator */}
      <EventLifecycleProgress event={event} />

      {/* Key Metrics: Event Date, Payment Status, Event Value, Status */}
      <EventKeyMetricsCards
        event={event}
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
              {event.event_category && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                  <p className="text-sm text-gray-900 capitalize">{event.event_category}</p>
                </div>
              )}
              {event.event_type && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                  <p className="text-sm text-gray-900 capitalize">{event.event_type}</p>
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
