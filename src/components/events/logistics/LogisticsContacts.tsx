'use client'

import { Edit } from 'lucide-react'
import type { LogisticsContactsProps, ContactInfo } from '@/types/logistics'

/**
 * ContactEditForm Component
 *
 * Inline form for editing contact information.
 */
function ContactEditForm({
  editedValue,
  isSaving,
  onSave,
  onCancel,
  onChange
}: {
  editedValue: ContactInfo
  isSaving: boolean
  onSave: () => void
  onCancel: () => void
  onChange: (value: ContactInfo) => void
}) {
  return (
    <div className="space-y-2 print:hidden">
      <input
        type="text"
        placeholder="Name"
        value={editedValue.name}
        onChange={(e) => onChange({ ...editedValue, name: e.target.value })}
        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
      />
      <input
        type="tel"
        placeholder="Phone"
        value={editedValue.phone}
        onChange={(e) => onChange({ ...editedValue, phone: e.target.value })}
        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
      />
      <input
        type="email"
        placeholder="Email"
        value={editedValue.email}
        onChange={(e) => onChange({ ...editedValue, email: e.target.value })}
        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-3 py-1 bg-[#347dc4] text-white rounded text-xs hover:bg-[#2d6ba8]"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

/**
 * ContactDisplay Component
 *
 * Read-only display of contact information.
 */
function ContactDisplay({
  name,
  phone,
  email
}: {
  name?: string
  phone?: string
  email?: string
}) {
  return (
    <div className="space-y-2 pl-4">
      <div className="flex">
        <span className="text-sm font-semibold text-gray-700 w-24">Name:</span>
        <span className="text-sm text-gray-900">{name || 'Not specified'}</span>
      </div>
      {phone && (
        <div className="flex">
          <span className="text-sm font-semibold text-gray-700 w-24">Phone:</span>
          <span className="text-sm text-gray-900">{phone}</span>
        </div>
      )}
      {email && (
        <div className="flex">
          <span className="text-sm font-semibold text-gray-700 w-24">Email:</span>
          <span className="text-sm text-gray-900">{email}</span>
        </div>
      )}
    </div>
  )
}

/**
 * LogisticsContacts Component
 *
 * Displays on-site contacts with editable venue contact and event planner sections.
 */
export function LogisticsContacts({
  venueContactName,
  venueContactPhone,
  venueContactEmail,
  locationContact,
  eventPlannerName,
  eventPlannerPhone,
  eventPlannerEmail,
  venueContactEditor,
  eventPlannerEditor
}: LogisticsContactsProps) {
  // Compute effective venue contact values (event-level overrides location-level)
  const effectiveVenueName = venueContactName || locationContact?.name
  const effectiveVenuePhone = venueContactPhone || locationContact?.phone
  const effectiveVenueEmail = venueContactEmail || locationContact?.email

  return (
    <section className="pb-6 border-b border-gray-300">
      <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">
        On-Site Contacts
      </h3>

      <div className="pl-4 space-y-6">
        {/* Venue Contact */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-gray-900 uppercase">Venue Contact</h4>
            {!venueContactEditor.isEditing && (
              <button
                onClick={venueContactEditor.startEdit}
                className="text-xs text-[#347dc4] hover:underline print:hidden"
              >
                <Edit className="h-3 w-3 inline" /> Edit
              </button>
            )}
          </div>

          {venueContactEditor.isEditing ? (
            <ContactEditForm
              editedValue={venueContactEditor.editedValue}
              isSaving={venueContactEditor.isSaving}
              onSave={venueContactEditor.saveEdit}
              onCancel={venueContactEditor.cancelEdit}
              onChange={venueContactEditor.setEditedValue}
            />
          ) : (
            <ContactDisplay
              name={effectiveVenueName}
              phone={effectiveVenuePhone}
              email={effectiveVenueEmail}
            />
          )}
        </div>

        {/* Event Planner Contact */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-gray-900 uppercase">Event Planner</h4>
            {!eventPlannerEditor.isEditing && (
              <button
                onClick={eventPlannerEditor.startEdit}
                className="text-xs text-[#347dc4] hover:underline print:hidden"
              >
                <Edit className="h-3 w-3 inline" /> Edit
              </button>
            )}
          </div>

          {eventPlannerEditor.isEditing ? (
            <ContactEditForm
              editedValue={eventPlannerEditor.editedValue}
              isSaving={eventPlannerEditor.isSaving}
              onSave={eventPlannerEditor.saveEdit}
              onCancel={eventPlannerEditor.cancelEdit}
              onChange={eventPlannerEditor.setEditedValue}
            />
          ) : (
            <ContactDisplay
              name={eventPlannerName}
              phone={eventPlannerPhone}
              email={eventPlannerEmail}
            />
          )}
        </div>
      </div>
    </section>
  )
}
