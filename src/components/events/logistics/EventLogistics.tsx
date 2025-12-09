'use client'

import { useEventLogistics } from '@/hooks/useEventLogistics'
import { useFieldEditor } from '@/hooks/useFieldEditor'
import { usePdfExport } from '@/hooks/usePdfExport'
import { useLogisticsEditing } from '@/hooks/useLogisticsEditing'
import { generateLogisticsPdf, getLogisticsPdfFilename } from '@/lib/pdf'
import type { EventLogisticsProps, ContactInfo } from '@/types/logistics'

import { LogisticsHeader } from './LogisticsHeader'
import { LogisticsSchedule } from './LogisticsSchedule'
import { LogisticsVenue } from './LogisticsVenue'
import { LogisticsLoadIn } from './LogisticsLoadIn'
import { LogisticsContacts } from './LogisticsContacts'
import { LogisticsPackages } from './LogisticsPackages'
import { LogisticsStaff } from './LogisticsStaff'

/**
 * EventLogistics Component
 *
 * Main orchestrator component for event logistics display and editing.
 * Composes child components and manages shared state/hooks.
 */
export function EventLogistics({ eventId }: EventLogisticsProps) {
  // Fetch logistics data
  const { logistics, loading } = useEventLogistics(eventId)

  // Location editing
  const {
    isEditingLocation,
    editedLocationId,
    savingLocation,
    handleEditLocation,
    handleSaveLocation,
    handleCancelEditLocation,
    invalidateLogistics
  } = useLogisticsEditing({ eventId })

  // PDF export
  const { exportPdf, isExporting } = usePdfExport({
    filename: () => getLogisticsPdfFilename(logistics?.client_name),
    generator: async () => {
      if (!logistics) throw new Error('No logistics data')
      return generateLogisticsPdf(logistics)
    }
  })

  // Field editors for inline editing
  const notesEditor = useFieldEditor({
    initialValue: logistics?.load_in_notes || '',
    onSave: async (value) => {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ load_in_notes: value })
      })
      if (res.ok) invalidateLogistics()
    }
  })

  const loadInTimeEditor = useFieldEditor({
    initialValue: logistics?.load_in_time || '',
    onSave: async (value) => {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ load_in_time: value })
      })
      if (res.ok) invalidateLogistics()
    }
  })

  const venueContactEditor = useFieldEditor<ContactInfo>({
    initialValue: {
      name: logistics?.venue_contact_name || '',
      phone: logistics?.venue_contact_phone || '',
      email: logistics?.venue_contact_email || ''
    },
    onSave: async (value) => {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_contact_name: value.name,
          venue_contact_phone: value.phone,
          venue_contact_email: value.email
        })
      })
      if (res.ok) invalidateLogistics()
    }
  })

  const eventPlannerEditor = useFieldEditor<ContactInfo>({
    initialValue: {
      name: logistics?.event_planner_name || '',
      phone: logistics?.event_planner_phone || '',
      email: logistics?.event_planner_email || ''
    },
    onSave: async (value) => {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_planner_name: value.name,
          event_planner_phone: value.phone,
          event_planner_email: value.email
        })
      })
      if (res.ok) invalidateLogistics()
    }
  })

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // Empty state
  const hasNoData = !logistics?.event_date && !logistics?.location

  return (
    <div className="bg-white rounded-lg shadow-md p-8 max-w-5xl mx-auto">
      {/* Document Header */}
      <LogisticsHeader
        clientName={logistics?.client_name}
        isExporting={isExporting}
        onExportPdf={exportPdf}
      />

      <div className="space-y-8">
        {/* Event Schedule */}
        <LogisticsSchedule
          eventDate={logistics?.event_date}
          setupTime={logistics?.setup_time}
          loadInTime={logistics?.load_in_time}
          startTime={logistics?.start_time}
          endTime={logistics?.end_time}
          loadInTimeEditor={loadInTimeEditor}
        />

        {/* Venue Information */}
        <LogisticsVenue
          location={logistics?.location}
          isEditing={isEditingLocation}
          editedLocationId={editedLocationId}
          savingLocation={savingLocation}
          onEdit={handleEditLocation}
          onSave={handleSaveLocation}
          onCancel={handleCancelEditLocation}
        />

        {/* Load-In Details */}
        <LogisticsLoadIn
          loadInNotes={logistics?.load_in_notes}
          locationNotes={logistics?.location?.notes}
          notesEditor={notesEditor}
        />

        {/* On-Site Contacts */}
        <LogisticsContacts
          venueContactName={logistics?.venue_contact_name}
          venueContactPhone={logistics?.venue_contact_phone}
          venueContactEmail={logistics?.venue_contact_email}
          locationContact={{
            name: logistics?.location?.contact_name,
            phone: logistics?.location?.contact_phone,
            email: logistics?.location?.contact_email
          }}
          eventPlannerName={logistics?.event_planner_name}
          eventPlannerPhone={logistics?.event_planner_phone}
          eventPlannerEmail={logistics?.event_planner_email}
          venueContactEditor={venueContactEditor}
          eventPlannerEditor={eventPlannerEditor}
        />

        {/* Client Package & Items */}
        <LogisticsPackages
          packages={logistics?.packages}
          customItems={logistics?.custom_items}
        />

        {/* Event Staff */}
        <LogisticsStaff staff={logistics?.staff} />

        {/* Additional Notes */}
        {logistics?.event_notes && (
          <section className="pb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">
              Additional Notes
            </h3>
            <div className="pl-4">
              <p className="text-sm text-gray-900 whitespace-pre-wrap border-l-2 border-gray-300 pl-4">
                {logistics.event_notes}
              </p>
            </div>
          </section>
        )}

        {/* Empty State */}
        {hasNoData && (
          <section className="text-center py-12">
            <p className="text-gray-600">No logistics information available yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Event dates, times, and venue details will appear here once configured
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
