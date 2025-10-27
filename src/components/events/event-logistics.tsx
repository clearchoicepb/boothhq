'use client'

import { useState, useEffect } from 'react'
import {
  MapPin,
  Clock,
  User,
  Phone,
  Mail,
  Calendar,
  Package,
  Navigation,
  Car,
  Settings,
  Edit,
  Save,
  X,
  FileDown
} from 'lucide-react'
import { LocationSelect } from '@/components/location-select'
import { Button } from '@/components/ui/button'
import { useEventLogistics } from '@/hooks/useEventLogistics'
import { useFieldEditor } from '@/hooks/useFieldEditor'
import { useQueryClient } from '@tanstack/react-query'

interface EventLogisticsProps {
  eventId: string
  tenant: string
}

interface LogisticsData {
  client_name?: string
  event_date?: string
  load_in_time?: string
  load_in_notes?: string
  start_time?: string
  end_time?: string
  location?: {
    name: string
    address_line1?: string
    address_line2?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
    contact_name?: string
    contact_phone?: string
    contact_email?: string
    notes?: string
  }
  venue_contact_name?: string
  venue_contact_phone?: string
  venue_contact_email?: string
  event_planner_name?: string
  event_planner_phone?: string
  event_planner_email?: string
  event_notes?: string
  packages?: Array<{
    id: string
    name: string
    type: string
  }>
  custom_items?: Array<{
    id: string
    item_name: string
    item_type: string
  }>
  equipment?: Array<{
    id: string
    name: string
    type: string
    serial_number?: string
    status: string
    checked_out_at?: string
    checked_in_at?: string
    condition_notes?: string
  }>
  staff?: Array<{
    id: string
    name: string
    email?: string
    role?: string
    role_type?: string
    notes?: string
    is_event_day: boolean
  }>
}

export function EventLogistics({ eventId, tenant }: EventLogisticsProps) {
  // React Query client for cache invalidation
  const queryClient = useQueryClient()

  // Helper to invalidate logistics data (triggers refetch)
  const invalidateLogistics = () => {
    queryClient.invalidateQueries({ queryKey: ['event-logistics', eventId] })
  }

  // Use custom hook for data fetching (SOLID: Dependency Inversion)
  const { logistics, loading } = useEventLogistics(eventId)

  // Use field editor hooks for inline editing (SOLID: Single Responsibility)
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

  const venueContactEditor = useFieldEditor({
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

  const eventPlannerEditor = useFieldEditor({
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

  // Location editing (kept separate as it's more complex)
  const [isEditingLocation, setIsEditingLocation] = useState(false)
  const [editedLocationId, setEditedLocationId] = useState<string | null>(null)
  const [savingLocation, setSavingLocation] = useState(false)


  // Location handlers
  const handleEditLocation = () => {
    setIsEditingLocation(true)
  }

  const handleSaveLocation = async (locationId: string | null, location?: any) => {
    setSavingLocation(true)
    setEditedLocationId(locationId)

    try {
      // Need to update both events.location (TEXT) and event_dates[0].location_id (UUID)
      // First, update the events table with location name
      const locationName = location?.name || ''

      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: locationName
        })
      })

      if (res.ok) {
        // Now update the event_dates table with location_id
        // We need to get the event date ID first
        const eventDatesRes = await fetch(`/api/event-dates?event_id=${eventId}`)
        if (eventDatesRes.ok) {
          const eventDates = await eventDatesRes.json()
          if (eventDates && eventDates.length > 0) {
            const primaryEventDate = eventDates[0]

            // Update the location_id in event_dates
            await fetch(`/api/event-dates/${primaryEventDate.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ location_id: locationId })
            })
          }
        }

        // Refresh logistics data
        invalidateLogistics()
        setIsEditingLocation(false)
      }
    } catch (error) {
      console.error('Error saving location:', error)
    } finally {
      setSavingLocation(false)
    }
  }

  const handleCancelEditLocation = () => {
    setIsEditingLocation(false)
    setEditedLocationId(null)
  }

  const handleExportPDF = async () => {
    if (!logistics) return

    // Dynamic import to avoid SSR issues
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF('p', 'pt', 'letter')

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 50
    const contentWidth = pageWidth - (margin * 2)
    let yPos = margin

    const addSection = (title: string) => {
      yPos += 12
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#000000')
      doc.text(title.toUpperCase(), margin, yPos)
      yPos += 4
      doc.setLineWidth(0.5)
      doc.setDrawColor('#cccccc')
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 10
    }

    const addField = (label: string, value: string, indent: number = 10) => {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#374151')
      doc.text(label, margin + indent, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor('#000000')
      const valueLines = doc.splitTextToSize(value, contentWidth - 140 - indent)
      doc.text(valueLines, margin + 120, yPos)
      yPos += Math.max(10, valueLines.length * 10)
    }

    const checkPageBreak = (requiredSpace: number = 100) => {
      if (yPos + requiredSpace > pageHeight - margin) {
        doc.addPage()
        yPos = margin
      }
    }

    // Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#000000')
    doc.text('Event Logistics', margin, yPos)
    yPos += 18

    if (logistics.client_name) {
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#347dc4')
      doc.text(`Client: ${logistics.client_name}`, margin, yPos)
      yPos += 12
    }

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#6b7280')
    doc.text('Operational Details & Schedule', margin, yPos)
    yPos += 15

    // Event Schedule
    addSection('Event Schedule')
    if (logistics.event_date) {
      const eventDate = new Date(logistics.event_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      addField('Date:', eventDate)
    }
    if (logistics.load_in_time) {
      addField('Setup Time:', formatTime(logistics.load_in_time) || logistics.load_in_time)
    }
    if (logistics.start_time) {
      addField('Start Time:', formatTime(logistics.start_time) || logistics.start_time)
    }
    if (logistics.end_time) {
      addField('End Time:', formatTime(logistics.end_time) || logistics.end_time)
    }

    // Venue Information
    addSection('Venue Information')
    if (logistics.location) {
      addField('Venue Name:', logistics.location.name)
      const address = formatAddress(logistics.location)
      if (address) {
        addField('Address:', address.replace(/\n/g, ', '))
      }
    } else {
      addField('Venue:', 'Not specified')
    }

    // Load-In Details
    addSection('Load-In Details')
    if (logistics.load_in_notes) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#374151')
      doc.text('Operations Notes:', margin + 10, yPos)
      yPos += 10
      doc.setFont('helvetica', 'normal')
      doc.setTextColor('#000000')
      const notesLines = doc.splitTextToSize(logistics.load_in_notes, contentWidth - 20)
      doc.text(notesLines, margin + 20, yPos)
      yPos += notesLines.length * 9 + 8
    }
    if (logistics.location?.notes) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#374151')
      doc.text('Venue Instructions:', margin + 10, yPos)
      yPos += 10
      doc.setFont('helvetica', 'normal')
      doc.setTextColor('#000000')
      const venueNotesLines = doc.splitTextToSize(logistics.location.notes, contentWidth - 20)
      doc.text(venueNotesLines, margin + 20, yPos)
      yPos += venueNotesLines.length * 9 + 8
    }

    // On-Site Contacts - 2 column layout
    addSection('On-Site Contacts')

    const columnWidth = contentWidth / 2
    const leftX = margin + 10
    const rightX = margin + columnWidth + 10
    const contactsStartY = yPos

    // Left column - Venue Contact
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('VENUE CONTACT', leftX, yPos)
    yPos += 10
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`Name: ${logistics.venue_contact_name || logistics.location?.contact_name || 'Not specified'}`, leftX, yPos)
    yPos += 9
    if (logistics.venue_contact_phone || logistics.location?.contact_phone) {
      doc.text(`Phone: ${logistics.venue_contact_phone || logistics.location?.contact_phone}`, leftX, yPos)
      yPos += 9
    }
    if (logistics.venue_contact_email || logistics.location?.contact_email) {
      doc.text(`Email: ${logistics.venue_contact_email || logistics.location?.contact_email}`, leftX, yPos)
      yPos += 9
    }

    const leftColumnHeight = yPos - contactsStartY

    // Right column - Event Planner
    yPos = contactsStartY
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('EVENT PLANNER', rightX, yPos)
    yPos += 10
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`Name: ${logistics.event_planner_name || 'Not specified'}`, rightX, yPos)
    yPos += 9
    if (logistics.event_planner_phone) {
      doc.text(`Phone: ${logistics.event_planner_phone}`, rightX, yPos)
      yPos += 9
    }
    if (logistics.event_planner_email) {
      doc.text(`Email: ${logistics.event_planner_email}`, rightX, yPos)
      yPos += 9
    }

    // Move yPos to the bottom of whichever column is taller
    yPos = Math.max(yPos, contactsStartY + leftColumnHeight) + 8

    // Client Package & Items - 2 column layout
    addSection('Client Package & Items')

    const packagesStartY = yPos

    // Left column - Packages
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('BOOTH TYPE & PACKAGES', leftX, yPos)
    yPos += 10
    if (logistics.packages && logistics.packages.length > 0) {
      logistics.packages.forEach(pkg => {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        const pkgText = doc.splitTextToSize(`• ${pkg.name} (${pkg.type})`, columnWidth - 20)
        doc.text(pkgText, leftX, yPos)
        yPos += pkgText.length * 9
      })
    } else {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor('#6b7280')
      doc.text('No packages', leftX, yPos)
      doc.setTextColor('#000000')
      yPos += 9
    }

    const packagesHeight = yPos - packagesStartY

    // Right column - Custom Items
    yPos = packagesStartY
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('ADD-ONS & CUSTOM ITEMS', rightX, yPos)
    yPos += 10
    if (logistics.custom_items && logistics.custom_items.length > 0) {
      logistics.custom_items.forEach(item => {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        const itemText = doc.splitTextToSize(`• ${item.item_name} (${item.item_type})`, columnWidth - 20)
        doc.text(itemText, rightX, yPos)
        yPos += itemText.length * 9
      })
    } else {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor('#6b7280')
      doc.text('No add-ons', rightX, yPos)
      doc.setTextColor('#000000')
      yPos += 9
    }

    yPos = Math.max(yPos, packagesStartY + packagesHeight) + 8

    // Event Staff - 2 column layout
    addSection('Event Staff')

    const operationsStaff = logistics.staff?.filter(s => s.role_type === 'operations') || []
    const eventStaff = logistics.staff?.filter(s => s.role_type === 'event_staff') || []

    const staffStartY = yPos

    // Left column - Operations Team
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('OPERATIONS TEAM', leftX, yPos)
    yPos += 10
    if (operationsStaff.length > 0) {
      operationsStaff.forEach(staff => {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#000000')
        doc.text(`• ${staff.name}`, leftX, yPos)
        yPos += 9
        if (staff.role) {
          doc.setFont('helvetica', 'normal')
          doc.setTextColor('#347dc4')
          doc.text(`  ${staff.role}`, leftX + 5, yPos)
          doc.setTextColor('#000000')
          yPos += 9
        }
        if (staff.email) {
          doc.setFont('helvetica', 'normal')
          const emailText = doc.splitTextToSize(staff.email, columnWidth - 20)
          doc.text(emailText, leftX + 5, yPos)
          yPos += emailText.length * 9
        }
        yPos += 3
      })
    } else {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor('#6b7280')
      doc.text('None assigned', leftX, yPos)
      doc.setTextColor('#000000')
      yPos += 9
    }

    const staffLeftHeight = yPos - staffStartY

    // Right column - Event Day Staff
    yPos = staffStartY
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('EVENT DAY STAFF', rightX, yPos)
    yPos += 10
    if (eventStaff.length > 0) {
      eventStaff.forEach(staff => {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#000000')
        doc.text(`• ${staff.name}`, rightX, yPos)
        yPos += 9
        if (staff.role) {
          doc.setFont('helvetica', 'normal')
          doc.setTextColor('#347dc4')
          doc.text(`  ${staff.role}`, rightX + 5, yPos)
          doc.setTextColor('#000000')
          yPos += 9
        }
        if (staff.email) {
          doc.setFont('helvetica', 'normal')
          const emailText = doc.splitTextToSize(staff.email, columnWidth - 20)
          doc.text(emailText, rightX + 5, yPos)
          yPos += emailText.length * 9
        }
        yPos += 3
      })
    } else {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor('#6b7280')
      doc.text('None assigned', rightX, yPos)
      doc.setTextColor('#000000')
      yPos += 9
    }

    yPos = Math.max(yPos, staffStartY + staffLeftHeight) + 8

    // Additional Notes
    if (logistics.event_notes) {
      addSection('Additional Notes')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor('#000000')
      const notesLines = doc.splitTextToSize(logistics.event_notes, contentWidth - 20)
      doc.text(notesLines, margin + 10, yPos)
    }

    // Save the PDF
    const fileName = `Event_Logistics_${logistics.client_name?.replace(/\s+/g, '_') || 'Document'}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }

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

  const formatTime = (time: string | undefined) => {
    if (!time) return null

    // Parse time string (HH:MM or HH:MM:SS format)
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12

    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const formatAddress = (location: LogisticsData['location']) => {
    if (!location) return null

    const parts = []

    if (location.address_line1) parts.push(location.address_line1)
    if (location.address_line2) parts.push(location.address_line2)

    const cityStateZip = [
      location.city,
      location.state,
      location.postal_code
    ].filter(Boolean).join(', ')

    if (cityStateZip) parts.push(cityStateZip)
    if (location.country && location.country !== 'US') parts.push(location.country)

    return parts.length > 0 ? parts.join('\n') : null
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8 max-w-5xl mx-auto">
      {/* Document Header */}
      <div className="mb-8 pb-4 border-b-2 border-gray-900">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Event Logistics</h2>
            {logistics?.client_name && (
              <p className="text-xl font-semibold text-[#347dc4] mt-2">Client: {logistics.client_name}</p>
            )}
            <p className="text-sm text-gray-600 mt-1">Operational Details & Schedule</p>
          </div>
          <Button
            onClick={handleExportPDF}
            variant="outline"
            size="sm"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Event Date & Time Section */}
        <section className="pb-6 border-b border-gray-300">
          <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Event Schedule</h3>

          <div className="space-y-3 pl-4">
            {/* Event Date */}
            {logistics?.event_date && (
              <div className="flex">
                <span className="text-sm font-semibold text-gray-700 w-40">Date:</span>
                <span className="text-sm text-gray-900">
                  {new Date(logistics.event_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )}

            {/* Event Setup Time (Load-In Time) */}
            <div className="flex">
              <span className="text-sm font-semibold text-gray-700 w-40">Setup Time:</span>
              {loadInTimeEditor.isEditing ? (
                <div className="flex-1 space-y-2 print:hidden">
                  <input
                    type="time"
                    value={loadInTimeEditor.editedValue}
                    onChange={(e) => loadInTimeEditor.setEditedValue(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={loadInTimeEditor.saveEdit}
                      disabled={loadInTimeEditor.isSaving}
                      className="px-3 py-1 bg-[#347dc4] text-white rounded text-xs hover:bg-[#2d6ba8]"
                    >
                      {loadInTimeEditor.isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={loadInTimeEditor.cancelEdit}
                      disabled={loadInTimeEditor.isSaving}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-900">
                    {logistics?.load_in_time ? formatTime(logistics.load_in_time) : 'Not specified'}
                  </span>
                  <button
                    onClick={loadInTimeEditor.startEdit}
                    className="text-[#347dc4] hover:text-[#2d6ba8] print:hidden"
                  >
                    <Edit className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Event Start Time */}
            {logistics?.start_time && (
              <div className="flex">
                <span className="text-sm font-semibold text-gray-700 w-40">Start Time:</span>
                <span className="text-sm text-gray-900">{formatTime(logistics.start_time)}</span>
              </div>
            )}

            {/* Event End Time */}
            {logistics?.end_time && (
              <div className="flex">
                <span className="text-sm font-semibold text-gray-700 w-40">End Time:</span>
                <span className="text-sm text-gray-900">{formatTime(logistics.end_time)}</span>
              </div>
            )}
          </div>
        </section>

        {/* Location & Venue Section */}
        <section className="pb-6 border-b border-gray-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Venue Information</h3>
            {!isEditingLocation && (
              <button
                onClick={handleEditLocation}
                className="flex items-center gap-1 px-2 py-1 text-xs text-[#347dc4] hover:underline print:hidden"
              >
                <Edit className="h-3 w-3" />
                Edit
              </button>
            )}
          </div>

          {isEditingLocation ? (
            <div className="pl-4 print:hidden">
              <LocationSelect
                value={editedLocationId}
                onChange={handleSaveLocation}
                label=""
                placeholder="Search or create location..."
                allowCreate={true}
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCancelEditLocation}
                  disabled={savingLocation}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
              {savingLocation && (
                <p className="text-sm text-gray-500 mt-2">Saving location...</p>
              )}
            </div>
          ) : logistics?.location ? (
            <div className="pl-4 space-y-3">
              <div className="flex">
                <span className="text-sm font-semibold text-gray-700 w-40">Venue Name:</span>
                <span className="text-sm text-gray-900 font-medium">{logistics.location.name}</span>
              </div>

              {formatAddress(logistics.location) && (
                <div className="flex">
                  <span className="text-sm font-semibold text-gray-700 w-40">Address:</span>
                  <span className="text-sm text-gray-900 whitespace-pre-line">
                    {formatAddress(logistics.location)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="pl-4">
              <p className="text-sm text-gray-500 italic">No venue information specified</p>
            </div>
          )}
        </section>

        {/* Load-In Details Section */}
        <section className="pb-6 border-b border-gray-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Load-In Details</h3>
            {!notesEditor.isEditing && (
              <button
                onClick={notesEditor.startEdit}
                className="flex items-center gap-1 px-2 py-1 text-xs text-[#347dc4] hover:underline print:hidden"
              >
                <Edit className="h-3 w-3" />
                Edit
              </button>
            )}
          </div>

          <div className="pl-4 space-y-4">
            {notesEditor.isEditing ? (
              <div className="space-y-3 print:hidden">
                <label className="block text-sm font-semibold text-gray-700">Operations Notes:</label>
                <textarea
                  value={notesEditor.editedValue}
                  onChange={(e) => notesEditor.setEditedValue(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="Examples: See security upon arrival, Call onsite POC, parking instructions, etc."
                />
                <div className="flex gap-2">
                  <button
                    onClick={notesEditor.saveEdit}
                    disabled={notesEditor.isSaving}
                    className="px-3 py-1 bg-[#347dc4] text-white rounded text-xs hover:bg-[#2d6ba8]"
                  >
                    {notesEditor.isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={notesEditor.cancelEdit}
                    disabled={notesEditor.isSaving}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-sm font-semibold text-gray-700 block mb-2">Operations Notes:</span>
                <p className="text-sm text-gray-900 whitespace-pre-wrap pl-4 border-l-2 border-gray-300">
                  {logistics?.load_in_notes || <span className="text-gray-500 italic">No load-in notes specified</span>}
                </p>
              </div>
            )}

            {/* Parking/Load-In Instructions from Location */}
            {logistics?.location?.notes && (
              <div className="pt-3 border-t border-gray-200">
                <span className="text-sm font-semibold text-gray-700 block mb-2">Venue Parking & Load-In Instructions:</span>
                <p className="text-sm text-gray-900 whitespace-pre-wrap pl-4 border-l-2 border-gray-300">
                  {logistics.location.notes}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* On-Site Contacts Section */}
        <section className="pb-6 border-b border-gray-300">
          <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">On-Site Contacts</h3>

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
                <div className="space-y-2 print:hidden">
                  <input
                    type="text"
                    placeholder="Name"
                    value={venueContactEditor.editedValue.name}
                    onChange={(e) => venueContactEditor.setEditedValue({ ...venueContactEditor.editedValue, name: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={venueContactEditor.editedValue.phone}
                    onChange={(e) => venueContactEditor.setEditedValue({ ...venueContactEditor.editedValue, phone: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={venueContactEditor.editedValue.email}
                    onChange={(e) => venueContactEditor.setEditedValue({ ...venueContactEditor.editedValue, email: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={venueContactEditor.saveEdit}
                      disabled={venueContactEditor.isSaving}
                      className="px-3 py-1 bg-[#347dc4] text-white rounded text-xs hover:bg-[#2d6ba8]"
                    >
                      {venueContactEditor.isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={venueContactEditor.cancelEdit}
                      disabled={venueContactEditor.isSaving}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pl-4">
                  <div className="flex">
                    <span className="text-sm font-semibold text-gray-700 w-24">Name:</span>
                    <span className="text-sm text-gray-900">
                      {logistics?.venue_contact_name || logistics?.location?.contact_name || 'Not specified'}
                    </span>
                  </div>
                  {(logistics?.venue_contact_phone || logistics?.location?.contact_phone) && (
                    <div className="flex">
                      <span className="text-sm font-semibold text-gray-700 w-24">Phone:</span>
                      <span className="text-sm text-gray-900">
                        {logistics?.venue_contact_phone || logistics?.location?.contact_phone}
                      </span>
                    </div>
                  )}
                  {(logistics?.venue_contact_email || logistics?.location?.contact_email) && (
                    <div className="flex">
                      <span className="text-sm font-semibold text-gray-700 w-24">Email:</span>
                      <span className="text-sm text-gray-900">
                        {logistics?.venue_contact_email || logistics?.location?.contact_email}
                      </span>
                    </div>
                  )}
                </div>
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
                <div className="space-y-2 print:hidden">
                  <input
                    type="text"
                    placeholder="Name"
                    value={eventPlannerEditor.editedValue.name}
                    onChange={(e) => eventPlannerEditor.setEditedValue({ ...eventPlannerEditor.editedValue, name: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={eventPlannerEditor.editedValue.phone}
                    onChange={(e) => eventPlannerEditor.setEditedValue({ ...eventPlannerEditor.editedValue, phone: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={eventPlannerEditor.editedValue.email}
                    onChange={(e) => eventPlannerEditor.setEditedValue({ ...eventPlannerEditor.editedValue, email: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={eventPlannerEditor.saveEdit}
                      disabled={eventPlannerEditor.isSaving}
                      className="px-3 py-1 bg-[#347dc4] text-white rounded text-xs hover:bg-[#2d6ba8]"
                    >
                      {eventPlannerEditor.isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={eventPlannerEditor.cancelEdit}
                      disabled={eventPlannerEditor.isSaving}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pl-4">
                  <div className="flex">
                    <span className="text-sm font-semibold text-gray-700 w-24">Name:</span>
                    <span className="text-sm text-gray-900">
                      {logistics?.event_planner_name || 'Not specified'}
                    </span>
                  </div>
                  {logistics?.event_planner_phone && (
                    <div className="flex">
                      <span className="text-sm font-semibold text-gray-700 w-24">Phone:</span>
                      <span className="text-sm text-gray-900">{logistics.event_planner_phone}</span>
                    </div>
                  )}
                  {logistics?.event_planner_email && (
                    <div className="flex">
                      <span className="text-sm font-semibold text-gray-700 w-24">Email:</span>
                      <span className="text-sm text-gray-900">{logistics.event_planner_email}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Client Package & Items Section */}
        <section className="pb-6 border-b border-gray-300">
          <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Client Package & Items</h3>

          <div className="pl-4">
            {/* Packages and Custom Items in 2-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {/* Packages Column */}
              <div>
                <span className="text-sm font-bold text-gray-900 uppercase block mb-2">Booth Type & Packages</span>
                {logistics?.packages && logistics.packages.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 pl-4">
                    {logistics.packages.map(pkg => (
                      <li key={pkg.id} className="text-sm text-gray-900">
                        {pkg.name} <span className="text-xs text-gray-600">({pkg.type})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic pl-4">No packages selected</p>
                )}
              </div>

              {/* Custom Items Column */}
              <div>
                <span className="text-sm font-bold text-gray-900 uppercase block mb-2">Add-Ons & Custom Items</span>
                {logistics?.custom_items && logistics.custom_items.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 pl-4">
                    {logistics.custom_items.map(item => (
                      <li key={item.id} className="text-sm text-gray-900">
                        {item.item_name} <span className="text-xs text-gray-600 capitalize">({item.item_type})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic pl-4">No add-ons or custom items</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Event Staff Section */}
        <section className="pb-6 border-b border-gray-300">
          <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Event Staff</h3>

          <div className="pl-4">
            {/* 2-column layout for staff */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* Operations Team Column */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase mb-3">Operations Team</h4>
                {logistics?.staff && logistics.staff.filter(s => s.role_type === 'operations').length > 0 ? (
                  <div className="space-y-3">
                    {logistics.staff
                      .filter(s => s.role_type === 'operations')
                      .map(staff => (
                        <div key={staff.id} className="border-l-2 border-gray-300 pl-4">
                          <div className="space-y-1">
                            <div className="flex">
                              <span className="text-sm font-semibold text-gray-700 w-24">Name:</span>
                              <span className="text-sm text-gray-900">{staff.name}</span>
                            </div>
                            {staff.role && (
                              <div className="flex">
                                <span className="text-sm font-semibold text-gray-700 w-24">Role:</span>
                                <span className="text-sm text-[#347dc4]">{staff.role}</span>
                              </div>
                            )}
                            {staff.email && (
                              <div className="flex">
                                <span className="text-sm font-semibold text-gray-700 w-24">Email:</span>
                                <span className="text-sm text-gray-900">{staff.email}</span>
                              </div>
                            )}
                            {staff.notes && (
                              <div className="flex">
                                <span className="text-sm font-semibold text-gray-700 w-24">Notes:</span>
                                <span className="text-sm text-gray-900">{staff.notes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No operations team assigned</p>
                )}
              </div>

              {/* Event Day Staff Column */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase mb-3">Event Day Staff</h4>
                {logistics?.staff && logistics.staff.filter(s => s.role_type === 'event_staff').length > 0 ? (
                  <div className="space-y-3">
                    {logistics.staff
                      .filter(s => s.role_type === 'event_staff')
                      .map(staff => (
                        <div key={staff.id} className="border-l-2 border-gray-300 pl-4">
                          <div className="space-y-1">
                            <div className="flex">
                              <span className="text-sm font-semibold text-gray-700 w-24">Name:</span>
                              <span className="text-sm text-gray-900">{staff.name}</span>
                            </div>
                            {staff.role && (
                              <div className="flex">
                                <span className="text-sm font-semibold text-gray-700 w-24">Role:</span>
                                <span className="text-sm text-[#347dc4]">{staff.role}</span>
                              </div>
                            )}
                            {staff.email && (
                              <div className="flex">
                                <span className="text-sm font-semibold text-gray-700 w-24">Email:</span>
                                <span className="text-sm text-gray-900">{staff.email}</span>
                              </div>
                            )}
                            {staff.notes && (
                              <div className="flex">
                                <span className="text-sm font-semibold text-gray-700 w-24">Notes:</span>
                                <span className="text-sm text-gray-900">{staff.notes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No event day staff assigned</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Additional Notes Section */}
        {logistics?.event_notes && (
          <section className="pb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Additional Notes</h3>
            <div className="pl-4">
              <p className="text-sm text-gray-900 whitespace-pre-wrap border-l-2 border-gray-300 pl-4">
                {logistics.event_notes}
              </p>
            </div>
          </section>
        )}

        {/* Empty State */}
        {!logistics?.event_date && !logistics?.location && (
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
