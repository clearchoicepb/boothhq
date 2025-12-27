'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileDown, Phone, MapPin, Edit2, Save, X, Calendar, Clock, Users, Package, FileText, Loader2 } from 'lucide-react'
import { useEventLogistics } from '@/hooks/useEventLogistics'
import { Button } from '@/components/ui/button'
import { generateLogisticsPdf, getLogisticsPdfFilename } from '@/lib/pdf'
import type { EventLogisticsProps, LogisticsContact, LogisticsStaffMember } from '@/types/logistics'

/**
 * Format time string to 12-hour format (e.g., "6:00 PM")
 */
function formatTime(time: string | null | undefined): string {
  if (!time) return ''

  // Handle HH:MM:SS or HH:MM format
  const parts = time.split(':')
  if (parts.length < 2) return time

  const hours = parseInt(parts[0], 10)
  const minutes = parts[1]

  if (isNaN(hours)) return time

  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12

  return `${displayHours}:${minutes} ${period}`
}

/**
 * Format date to full format (e.g., "Saturday, January 18, 2025")
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''

  const date = new Date(dateStr + 'T00:00:00') // Prevent timezone issues
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Format phone number for tel: link (strip non-digits, add +1 if needed)
 */
function formatPhoneForLink(phone: string | null | undefined): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `+1${digits}` : `+${digits}`
}

/**
 * Build Google Maps URL from location data
 */
function buildMapsUrl(location: {
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  name?: string | null
}): string {
  const parts = [
    location.address_line1,
    location.address_line2,
    location.city,
    location.state,
    location.postal_code
  ].filter(Boolean)

  const address = parts.join(', ')
  if (!address && location.name) {
    return `https://maps.google.com/?q=${encodeURIComponent(location.name)}`
  }
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`
}

/**
 * Format full address for display
 */
function formatAddress(location: {
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
}): string {
  const line1 = location.address_line1 || ''
  const line2 = location.address_line2 || ''
  const cityStateZip = [location.city, location.state].filter(Boolean).join(', ')
  const withZip = location.postal_code ? `${cityStateZip} ${location.postal_code}` : cityStateZip

  return [line1, line2, withZip].filter(Boolean).join('\n')
}

/**
 * Clickable phone number component
 */
function PhoneLink({ phone, className = '' }: { phone: string | null | undefined; className?: string }) {
  if (!phone) return <span className="text-gray-400 italic">Not provided</span>

  return (
    <a
      href={`tel:${formatPhoneForLink(phone)}`}
      className={`text-[#347dc4] hover:underline inline-flex items-center gap-1 ${className}`}
    >
      <Phone className="h-3 w-3" />
      {phone}
    </a>
  )
}

/**
 * Contact display with name and clickable phone
 */
function ContactDisplay({
  label,
  contact
}: {
  label: string
  contact: LogisticsContact | null | undefined
}) {
  if (!contact?.name && !contact?.phone) return null

  return (
    <div className="flex flex-wrap items-center gap-x-2 py-2">
      <span className="font-medium text-gray-700">{label}:</span>
      <span className="text-gray-900">{contact?.name || 'Unknown'}</span>
      {contact?.phone && (
        <>
          <span className="text-gray-400">•</span>
          <PhoneLink phone={contact.phone} />
        </>
      )}
    </div>
  )
}

/**
 * Staff member display with clickable phone and schedule
 */
function StaffMemberDisplay({ staff }: { staff: LogisticsStaffMember }) {
  const hasSchedule = staff.arrival_time || staff.start_time || staff.end_time

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="text-gray-900 font-medium">{staff.name}</span>
        {staff.phone && (
          <>
            <span className="text-gray-400">•</span>
            <PhoneLink phone={staff.phone} />
          </>
        )}
      </div>
      {hasSchedule && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
          {staff.arrival_time && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Arrival: {formatTime(staff.arrival_time)}</span>
            </div>
          )}
          {(staff.start_time || staff.end_time) && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Shift: {formatTime(staff.start_time)} - {formatTime(staff.end_time)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Section header component
 */
function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
      <Icon className="h-5 w-5 text-[#347dc4]" />
      {title}
    </h3>
  )
}

/**
 * Event type badge component
 */
function EventTypeBadge({ type }: { type: string | null | undefined }) {
  if (!type) return null

  // Format type for display (e.g., "corporate_event" -> "Corporate Event")
  const formatted = type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#347dc4]/10 text-[#347dc4]">
      {formatted}
    </span>
  )
}

/**
 * EventLogistics Component
 *
 * Main component for displaying event logistics with 8 sections.
 * Supports multi-date events and inline editing for notes fields.
 */
export function EventLogistics({ eventId, eventDateId: propEventDateId }: EventLogisticsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Use URL param if available, otherwise fall back to prop
  const urlEventDateId = searchParams.get('event_date_id')
  const currentEventDateId = urlEventDateId || propEventDateId

  const { logistics, loading, invalidateLogistics } = useEventLogistics(eventId, currentEventDateId)

  // Handle date selection - update URL without full page reload
  const handleDateSelect = useCallback((newDateId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('event_date_id', newDateId)
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  // Editable state for Onsite Contact
  const [isEditingOnsiteContact, setIsEditingOnsiteContact] = useState(false)
  const [onsiteContactName, setOnsiteContactName] = useState('')
  const [onsiteContactPhone, setOnsiteContactPhone] = useState('')
  const [savingOnsiteContact, setSavingOnsiteContact] = useState(false)

  // Editable state for Event Planner
  const [isEditingEventPlanner, setIsEditingEventPlanner] = useState(false)
  const [eventPlannerName, setEventPlannerName] = useState('')
  const [eventPlannerPhone, setEventPlannerPhone] = useState('')
  const [savingEventPlanner, setSavingEventPlanner] = useState(false)

  // Editable state for Load-In Notes
  const [isEditingLoadIn, setIsEditingLoadIn] = useState(false)
  const [loadInNotes, setLoadInNotes] = useState('')
  const [savingLoadIn, setSavingLoadIn] = useState(false)

  // Editable state for Parking Instructions
  const [isEditingParking, setIsEditingParking] = useState(false)
  const [parkingInstructions, setParkingInstructions] = useState('')
  const [savingParking, setSavingParking] = useState(false)

  // Editable state for Event Notes
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [eventNotes, setEventNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  // PDF export state
  const [isExporting, setIsExporting] = useState(false)

  // Handle PDF export
  const handleExportPdf = async () => {
    if (!logistics) return
    setIsExporting(true)
    try {
      const doc = await generateLogisticsPdf(logistics)
      const filename = getLogisticsPdfFilename(logistics.client_name || undefined)
      doc.save(filename)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Sync local state with fetched data
  useEffect(() => {
    if (logistics) {
      setOnsiteContactName(logistics.onsite_contact?.name || '')
      setOnsiteContactPhone(logistics.onsite_contact?.phone || '')
      setEventPlannerName(logistics.event_planner?.name || '')
      setEventPlannerPhone(logistics.event_planner?.phone || '')
      setLoadInNotes(logistics.load_in_notes || '')
      setParkingInstructions(logistics.parking_instructions || '')
      setEventNotes(logistics.event_notes || '')
    }
  }, [logistics])

  // Save Onsite Contact
  const saveOnsiteContact = async () => {
    setSavingOnsiteContact(true)
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_contact_name: onsiteContactName,
          venue_contact_phone: onsiteContactPhone
        })
      })
      if (res.ok) {
        invalidateLogistics()
        setIsEditingOnsiteContact(false)
      }
    } finally {
      setSavingOnsiteContact(false)
    }
  }

  // Save Event Planner
  const saveEventPlanner = async () => {
    setSavingEventPlanner(true)
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_planner_name: eventPlannerName,
          event_planner_phone: eventPlannerPhone
        })
      })
      if (res.ok) {
        invalidateLogistics()
        setIsEditingEventPlanner(false)
      }
    } finally {
      setSavingEventPlanner(false)
    }
  }

  // Save Load-In Notes
  const saveLoadInNotes = async () => {
    setSavingLoadIn(true)
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ load_in_notes: loadInNotes })
      })
      if (res.ok) {
        invalidateLogistics()
        setIsEditingLoadIn(false)
      }
    } finally {
      setSavingLoadIn(false)
    }
  }

  // Save Parking Instructions (saved to location notes)
  const saveParkingInstructions = async () => {
    setSavingParking(true)
    try {
      // Update the location notes if we have a location_id
      const locationId = logistics?.location?.id
      if (locationId) {
        const res = await fetch(`/api/locations/${locationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: parkingInstructions })
        })
        if (res.ok) {
          invalidateLogistics()
          setIsEditingParking(false)
        }
      } else {
        // No location - just close the editor
        setIsEditingParking(false)
      }
    } finally {
      setSavingParking(false)
    }
  }

  // Save Event Notes
  const saveEventNotes = async () => {
    setSavingNotes(true)
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: eventNotes })
      })
      if (res.ok) {
        invalidateLogistics()
        setIsEditingNotes(false)
      }
    } finally {
      setSavingNotes(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!logistics) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-600">No logistics information available</p>
        <p className="text-sm text-gray-500 mt-1">
          Event details will appear here once configured
        </p>
      </div>
    )
  }

  const hasSchedule = logistics.event_date || logistics.setup_time || logistics.start_time || logistics.end_time
  const hasLocation = logistics.location?.name || logistics.location?.address_line1
  // hasContacts removed - section always shows now
  const hasScope = logistics.packages.length > 0 || logistics.add_ons.length > 0 || logistics.equipment.length > 0
  const hasStaff = logistics.event_staff.length > 0 || logistics.event_managers.length > 0

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* ========== SECTION 1: HEADER ========== */}
      <div className="bg-gradient-to-r from-[#347dc4] to-[#2d6ba8] px-6 py-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {logistics.event_title || 'Event Logistics'}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {logistics.event_type && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20">
                  {logistics.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              )}
              {logistics.client_name && (
                <span className="text-white/90">
                  Client: <strong>{logistics.client_name}</strong>
                </span>
              )}
            </div>
            {logistics.client_contact?.name && (
              <div className="mt-2 text-sm text-white/80">
                Contact: {logistics.client_contact.name}
                {logistics.client_contact.phone && (
                  <a
                    href={`tel:${formatPhoneForLink(logistics.client_contact.phone)}`}
                    className="ml-2 text-white hover:underline"
                  >
                    {logistics.client_contact.phone}
                  </a>
                )}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20 print:hidden"
            onClick={handleExportPdf}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* ========== SECTION 2: EVENT SCHEDULE ========== */}
        {hasSchedule && (
          <section>
            <SectionHeader icon={Calendar} title="Event Schedule" />
            <div className="bg-gray-50 rounded-lg p-4">
              {logistics.event_date && (
                <p className="text-lg font-semibold text-gray-900 mb-3">
                  {formatDate(logistics.event_date)}
                </p>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {logistics.setup_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Setup:</span>
                    <span className="font-medium">{formatTime(logistics.setup_time)}</span>
                  </div>
                )}
                {logistics.start_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Start:</span>
                    <span className="font-medium">{formatTime(logistics.start_time)}</span>
                  </div>
                )}
                {logistics.end_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">End:</span>
                    <span className="font-medium">{formatTime(logistics.end_time)}</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ========== SECTION 3: EVENT LOCATION ========== */}
        {hasLocation && (
          <section>
            <SectionHeader icon={MapPin} title="Event Location" />
            <div className="bg-gray-50 rounded-lg p-4">
              {logistics.location?.name && (
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  {logistics.location.name}
                </p>
              )}
              {logistics.location?.address_line1 && (
                <a
                  href={buildMapsUrl(logistics.location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-2 text-[#347dc4] hover:underline"
                >
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="whitespace-pre-line">
                    {formatAddress(logistics.location)}
                  </span>
                </a>
              )}
            </div>
          </section>
        )}

        {/* ========== SECTION 4: EVENT CONTACTS ========== */}
        <section>
          <SectionHeader icon={Phone} title="Event Contacts" />
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            {/* Onsite Contact - Always visible, editable */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Onsite Contact</label>
                {!isEditingOnsiteContact && (
                  <button
                    onClick={() => setIsEditingOnsiteContact(true)}
                    className="text-[#347dc4] hover:text-[#2d6ba8] text-sm flex items-center gap-1 print:hidden"
                  >
                    <Edit2 className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>
              {isEditingOnsiteContact ? (
                <div className="space-y-2 print:hidden">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={onsiteContactName}
                      onChange={(e) => setOnsiteContactName(e.target.value)}
                      placeholder="Contact name"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
                    />
                    <input
                      type="tel"
                      value={onsiteContactPhone}
                      onChange={(e) => setOnsiteContactPhone(e.target.value)}
                      placeholder="Phone number"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveOnsiteContact} disabled={savingOnsiteContact}>
                      <Save className="h-3 w-3 mr-1" />
                      {savingOnsiteContact ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setOnsiteContactName(logistics.onsite_contact?.name || '')
                        setOnsiteContactPhone(logistics.onsite_contact?.phone || '')
                        setIsEditingOnsiteContact(false)
                      }}
                      disabled={savingOnsiteContact}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-2">
                  {onsiteContactName ? (
                    <>
                      <span className="text-gray-900">{onsiteContactName}</span>
                      {onsiteContactPhone && (
                        <>
                          <span className="text-gray-400">•</span>
                          <PhoneLink phone={onsiteContactPhone} />
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400 italic">No onsite contact provided</span>
                  )}
                </div>
              )}
            </div>

            {/* Event Planner - Always visible, editable */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Event Planner</label>
                {!isEditingEventPlanner && (
                  <button
                    onClick={() => setIsEditingEventPlanner(true)}
                    className="text-[#347dc4] hover:text-[#2d6ba8] text-sm flex items-center gap-1 print:hidden"
                  >
                    <Edit2 className="h-3 w-3" />
                    {eventPlannerName ? 'Edit' : 'Add'}
                  </button>
                )}
              </div>
              {isEditingEventPlanner ? (
                <div className="space-y-2 print:hidden">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={eventPlannerName}
                      onChange={(e) => setEventPlannerName(e.target.value)}
                      placeholder="Planner name"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
                    />
                    <input
                      type="tel"
                      value={eventPlannerPhone}
                      onChange={(e) => setEventPlannerPhone(e.target.value)}
                      placeholder="Phone number"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEventPlanner} disabled={savingEventPlanner}>
                      <Save className="h-3 w-3 mr-1" />
                      {savingEventPlanner ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEventPlannerName(logistics.event_planner?.name || '')
                        setEventPlannerPhone(logistics.event_planner?.phone || '')
                        setIsEditingEventPlanner(false)
                      }}
                      disabled={savingEventPlanner}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-2">
                  {eventPlannerName ? (
                    <>
                      <span className="text-gray-900">{eventPlannerName}</span>
                      {eventPlannerPhone && (
                        <>
                          <span className="text-gray-400">•</span>
                          <PhoneLink phone={eventPlannerPhone} />
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400 italic">No Event Planner listed</span>
                  )}
                </div>
              )}
            </div>

            {/* Client Contact - Display only */}
            {logistics.client_contact?.name && (
              <div className="border-t border-gray-200 pt-4">
                <label className="text-sm font-medium text-gray-700 block mb-2">Client</label>
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="text-gray-900">{logistics.client_contact.name}</span>
                  {logistics.client_contact.phone && (
                    <>
                      <span className="text-gray-400">•</span>
                      <PhoneLink phone={logistics.client_contact.phone} />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ========== SECTION 5: ARRIVAL INSTRUCTIONS ========== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionHeader icon={FileText} title="Arrival Instructions" />
          </div>

          {/* Load-In Notes - Editable */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Load-In Notes</label>
              {!isEditingLoadIn && (
                <button
                  onClick={() => setIsEditingLoadIn(true)}
                  className="text-[#347dc4] hover:text-[#2d6ba8] text-sm flex items-center gap-1 print:hidden"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>
            {isEditingLoadIn ? (
              <div className="space-y-2 print:hidden">
                <textarea
                  value={loadInNotes}
                  onChange={(e) => setLoadInNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
                  placeholder="Enter load-in instructions, security info, check-in procedures..."
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={saveLoadInNotes}
                    disabled={savingLoadIn}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {savingLoadIn ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setLoadInNotes(logistics.load_in_notes || '')
                      setIsEditingLoadIn(false)
                    }}
                    disabled={savingLoadIn}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                {loadInNotes ? (
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{loadInNotes}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No load-in notes provided</p>
                )}
              </div>
            )}
          </div>

          {/* Parking Instructions - Editable */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Parking Instructions</label>
              {!isEditingParking && (
                <button
                  onClick={() => setIsEditingParking(true)}
                  className="text-[#347dc4] hover:text-[#2d6ba8] text-sm flex items-center gap-1 print:hidden"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>
            {isEditingParking ? (
              <div className="space-y-2 print:hidden">
                <textarea
                  value={parkingInstructions}
                  onChange={(e) => setParkingInstructions(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
                  placeholder="Enter parking instructions, venue access info..."
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={saveParkingInstructions}
                    disabled={savingParking}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {savingParking ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setParkingInstructions(logistics.parking_instructions || '')
                      setIsEditingParking(false)
                    }}
                    disabled={savingParking}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                {parkingInstructions ? (
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{parkingInstructions}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No parking instructions provided</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ========== SECTION 6: EVENT SCOPE ========== */}
        {hasScope && (
          <section>
            <SectionHeader icon={Package} title="Event Scope" />
            <div className="grid gap-4 md:grid-cols-2">
              {/* Packages */}
              {logistics.packages.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Packages</h4>
                  <ul className="space-y-2">
                    {logistics.packages.map(pkg => (
                      <li key={pkg.id} className="text-sm text-gray-700">
                        • {pkg.name}
                        {pkg.description && (
                          <span className="text-gray-500 ml-1">({pkg.description})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Add-Ons */}
              {logistics.add_ons.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Add-Ons</h4>
                  <ul className="space-y-2">
                    {logistics.add_ons.map(addon => (
                      <li key={addon.id} className="text-sm text-gray-700">
                        • {addon.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Equipment */}
              {logistics.equipment.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
                  <h4 className="font-medium text-gray-900 mb-3">Equipment</h4>
                  <ul className="space-y-2">
                    {logistics.equipment.map(equip => (
                      <li key={equip.id} className="text-sm text-gray-700">
                        • {equip.name}
                        {equip.type && <span className="text-gray-500"> ({equip.type})</span>}
                        {equip.serial_number && (
                          <span className="text-gray-400 ml-2">SN: {equip.serial_number}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ========== SECTION 7: EVENT NOTES ========== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionHeader icon={FileText} title="Event Notes" />
            {!isEditingNotes && (
              <button
                onClick={() => setIsEditingNotes(true)}
                className="text-[#347dc4] hover:text-[#2d6ba8] text-sm flex items-center gap-1 print:hidden"
              >
                <Edit2 className="h-3 w-3" />
                Edit
              </button>
            )}
          </div>

          {isEditingNotes ? (
            <div className="space-y-2 print:hidden">
              <textarea
                value={eventNotes}
                onChange={(e) => setEventNotes(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
                placeholder="Add notes for the onsite team..."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={saveEventNotes}
                  disabled={savingNotes}
                >
                  <Save className="h-3 w-3 mr-1" />
                  {savingNotes ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEventNotes(logistics.event_notes || '')
                    setIsEditingNotes(false)
                  }}
                  disabled={savingNotes}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 min-h-[100px]">
              {eventNotes ? (
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{eventNotes}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No event notes</p>
              )}
            </div>
          )}
        </section>

        {/* ========== SECTION 8: EVENT STAFF ========== */}
        {hasStaff && (
          <section>
            <SectionHeader icon={Users} title="Event Staff" />
            <div className="grid gap-4 md:grid-cols-2">
              {/* Event Staff */}
              {logistics.event_staff.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Event Staff</h4>
                  <div className="space-y-1">
                    {logistics.event_staff.map(staff => (
                      <StaffMemberDisplay key={staff.id} staff={staff} />
                    ))}
                  </div>
                </div>
              )}

              {/* Event Managers */}
              {logistics.event_managers.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Event Managers</h4>
                  <div className="space-y-1">
                    {logistics.event_managers.map(manager => (
                      <StaffMemberDisplay key={manager.id} staff={manager} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Multi-date selector (if applicable) */}
        {logistics.all_event_dates.length > 1 && (
          <section className="border-t pt-6 print:hidden">
            <p className="text-sm text-gray-600 mb-2">
              This event has multiple dates. Currently viewing:
            </p>
            <div className="flex flex-wrap gap-2">
              {logistics.all_event_dates.map(ed => (
                <button
                  key={ed.id}
                  onClick={() => handleDateSelect(ed.id)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    ed.id === logistics.event_date_id
                      ? 'bg-[#347dc4] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {formatDate(ed.event_date)}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
