'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Loader2,
  AlertCircle,
  Calendar,
  MapPin,
  Users,
  Package,
  Phone,
  Mail,
  Clock,
  User,
  Building2,
  Shirt,
  FileText,
  Navigation,
  Star
} from 'lucide-react'

interface EventDate {
  id: string
  date: string
  setup_time: string | null
  start_time: string | null
  end_time: string | null
  notes: string | null
}

interface StaffMember {
  name: string
  role: string | null
  phone: string | null
  isManager: boolean
}

interface StaffBriefData {
  event: {
    id: string
    title: string
    event_type: string
    status: string
  }
  customer: {
    name: string | null
    companyName: string | null
    contactName: string | null
  }
  dates: EventDate[]
  venue: {
    name: string | null
    address: string | null
    googleMapsUrl: string | null
  } | null
  // Contact Types:
  // 1. Venue Contact - employee of the venue (from location record)
  venueContact: {
    name: string | null
    phone: string | null
    email: string | null
  }
  // 2. Onsite Contact - client's designated person at the event
  onsiteContact: {
    name: string | null
    phone: string | null
    email: string | null
  }
  // 3. Event Planner - professional third-party planner
  eventPlanner: {
    name: string | null
    phone: string | null
    email: string | null
    company: string | null
  } | null
  arrivalInstructions: string | null
  dressCode: string | null
  package: {
    name: string
    description: string | null
  } | null
  addOns: Array<{ name: string }>
  eventNotes: string | null
  staff: StaffMember[]
  tenant: {
    id: string
    logoUrl: string | null
  }
}

/**
 * Format time string to 12-hour format
 */
function formatTime(time: string | null | undefined): string {
  if (!time) return ''
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
 * Format date to full format (e.g., "Saturday, January 15, 2025")
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Format phone number for tel: link
 */
function formatPhoneForLink(phone: string | null | undefined): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `+1${digits}` : `+${digits}`
}

/**
 * Section Card Component
 */
function SectionCard({
  icon: Icon,
  title,
  children
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
        <Icon className="h-5 w-5 text-[#347dc4]" />
        {title}
      </h3>
      {children}
    </div>
  )
}

/**
 * Contact Row Component
 */
function ContactRow({
  label,
  name,
  phone,
  email
}: {
  label: string
  name: string | null
  phone: string | null
  email?: string | null
}) {
  if (!name && !phone) return null

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      {name && <p className="font-medium text-gray-900">{name}</p>}
      <div className="flex flex-wrap gap-3 mt-1">
        {phone && (
          <a
            href={`tel:${formatPhoneForLink(phone)}`}
            className="inline-flex items-center gap-1.5 text-[#347dc4] hover:underline text-sm"
          >
            <Phone className="h-3.5 w-3.5" />
            {phone}
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center gap-1.5 text-[#347dc4] hover:underline text-sm"
          >
            <Mail className="h-3.5 w-3.5" />
            {email}
          </a>
        )}
      </div>
    </div>
  )
}

/**
 * Staff Member Card Component
 */
function StaffCard({ staff }: { staff: StaffMember }) {
  return (
    <div className={`p-4 rounded-lg ${staff.isManager ? 'bg-[#347dc4]/5 border border-[#347dc4]/20' : 'bg-gray-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 truncate">{staff.name}</p>
            {staff.isManager && (
              <Star className="h-4 w-4 text-[#347dc4] flex-shrink-0" fill="currentColor" />
            )}
          </div>
          {staff.role && (
            <p className="text-sm text-gray-600 mt-0.5">{staff.role}</p>
          )}
        </div>
        {staff.phone && (
          <a
            href={`tel:${formatPhoneForLink(staff.phone)}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[#347dc4] text-sm font-medium hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            <Phone className="h-3.5 w-3.5" />
            Call
          </a>
        )}
      </div>
    </div>
  )
}

/**
 * Staff Event Brief Page
 *
 * Accessible at /brief/[token] without authentication.
 * Provides event staff with essential information for the event.
 */
export default function StaffBriefPage() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<StaffBriefData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBrief()
  }, [token])

  const fetchBrief = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/public/brief/${token}`)
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          setError('Event brief not found')
        } else if (response.status === 403) {
          setError('Staff brief access is disabled for this event')
        } else {
          setError('Unable to load event brief')
        }
        return
      }

      setData(result)
    } catch {
      setError('Unable to load event brief')
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#347dc4] mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Loading event brief...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            {error || 'Event Brief Not Found'}
          </h1>
          <p className="text-gray-600">
            This event brief may have been removed or the link is invalid.
            Please contact your manager for assistance.
          </p>
        </div>
      </div>
    )
  }

  const { event, customer, dates, venue, venueContact, onsiteContact, eventPlanner, arrivalInstructions, dressCode, package: eventPackage, addOns, eventNotes, staff, tenant } = data
  const primaryDate = dates.length > 0 ? dates[0] : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        {/* Logo Header */}
        {tenant.logoUrl && (
          <div className="mb-6 text-center">
            <img
              src={tenant.logoUrl}
              alt="Company Logo"
              className="h-12 sm:h-16 mx-auto object-contain"
            />
          </div>
        )}

        {/* Page Title */}
        <div className="text-center mb-6">
          <p className="text-sm font-medium text-[#347dc4] uppercase tracking-wide mb-1">
            Event Brief
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{event.title}</h1>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Section 1: Core Details */}
          <SectionCard icon={Calendar} title="Event Details">
            <div className="space-y-4">
              {/* Event Date */}
              {primaryDate && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(primaryDate.date)}
                  </p>
                </div>
              )}

              {/* Customer */}
              <div className="flex gap-4">
                {customer.companyName && (
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Customer</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <p className="font-medium text-gray-900">{customer.companyName}</p>
                    </div>
                  </div>
                )}
                {customer.contactName && customer.contactName !== customer.companyName && (
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Contact</p>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-gray-400" />
                      <p className="font-medium text-gray-900">{customer.contactName}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Times */}
              {primaryDate && (primaryDate.setup_time || primaryDate.start_time || primaryDate.end_time) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-[#347dc4]" />
                    <p className="text-sm font-medium text-gray-700">Schedule</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {primaryDate.setup_time && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Arrival</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatTime(primaryDate.setup_time)}
                        </p>
                      </div>
                    )}
                    {primaryDate.start_time && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Start</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatTime(primaryDate.start_time)}
                        </p>
                      </div>
                    )}
                    {primaryDate.end_time && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase">End</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatTime(primaryDate.end_time)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Location */}
              {venue && (venue.name || venue.address) && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Location</p>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      {venue.name && (
                        <p className="font-medium text-gray-900">{venue.name}</p>
                      )}
                      {venue.address && (
                        <p className="text-gray-600 text-sm mt-0.5">{venue.address}</p>
                      )}
                    </div>
                    {venue.googleMapsUrl && (
                      <a
                        href={venue.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#347dc4] text-white rounded-lg text-sm font-medium hover:bg-[#2c6ba8] transition-colors flex-shrink-0"
                      >
                        <Navigation className="h-4 w-4" />
                        Navigate
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Section 2: Onsite Contacts */}
          {(venueContact.name || venueContact.phone || onsiteContact.name || onsiteContact.phone || eventPlanner) && (
            <SectionCard icon={Phone} title="Onsite Contacts">
              {/* Onsite Contact - Primary person to find on arrival */}
              <ContactRow
                label="Onsite Point of Contact"
                name={onsiteContact.name}
                phone={onsiteContact.phone}
                email={onsiteContact.email}
              />
              {/* Venue Contact - Venue's employee/coordinator */}
              <ContactRow
                label="Venue Contact"
                name={venueContact.name}
                phone={venueContact.phone}
                email={venueContact.email}
              />
              {/* Event Planner - Third-party professional planner */}
              {eventPlanner && (
                <div className="py-3 border-b border-gray-100 last:border-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Event Planner</p>
                  {eventPlanner.name && <p className="font-medium text-gray-900">{eventPlanner.name}</p>}
                  {eventPlanner.company && (
                    <p className="text-sm text-gray-600">{eventPlanner.company}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-1">
                    {eventPlanner.phone && (
                      <a
                        href={`tel:${formatPhoneForLink(eventPlanner.phone)}`}
                        className="inline-flex items-center gap-1.5 text-[#347dc4] hover:underline text-sm"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {eventPlanner.phone}
                      </a>
                    )}
                    {eventPlanner.email && (
                      <a
                        href={`mailto:${eventPlanner.email}`}
                        className="inline-flex items-center gap-1.5 text-[#347dc4] hover:underline text-sm"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {eventPlanner.email}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* Section 3: Arrival & Setup */}
          {(arrivalInstructions || dressCode) && (
            <SectionCard icon={MapPin} title="Arrival & Setup">
              {arrivalInstructions && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500 mb-2">Arrival / Parking Instructions</p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-gray-800 whitespace-pre-wrap">{arrivalInstructions}</p>
                  </div>
                </div>
              )}
              {dressCode && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Shirt className="h-4 w-4 text-gray-500" />
                    <p className="text-sm font-medium text-gray-500">Dress Code</p>
                  </div>
                  <div className="bg-[#347dc4]/5 border border-[#347dc4]/20 rounded-lg p-4">
                    <p className="text-gray-900 font-medium">{dressCode}</p>
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* Section 4: Package Details */}
          {(eventPackage || addOns.length > 0 || eventNotes) && (
            <SectionCard icon={Package} title="Event Scope">
              {eventPackage && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500 mb-2">Package</p>
                  <div className="bg-[#347dc4]/5 border border-[#347dc4]/20 rounded-lg p-4">
                    <p className="font-semibold text-gray-900">{eventPackage.name}</p>
                    {eventPackage.description && (
                      <p className="text-sm text-gray-600 mt-1">{eventPackage.description}</p>
                    )}
                  </div>
                </div>
              )}

              {addOns.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500 mb-2">Add-Ons</p>
                  <ul className="space-y-1.5">
                    {addOns.map((addon, index) => (
                      <li key={index} className="flex items-center gap-2 text-gray-700">
                        <span className="w-1.5 h-1.5 bg-[#347dc4] rounded-full flex-shrink-0" />
                        {addon.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {eventNotes && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <p className="text-sm font-medium text-gray-500">Event Notes</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{eventNotes}</p>
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* Section 5: Your Team */}
          <SectionCard icon={Users} title="Your Team">
            {staff.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No staff assigned yet</p>
            ) : (
              <div className="space-y-3">
                {staff.map((member, index) => (
                  <StaffCard key={index} staff={member} />
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          Powered by BoothHQ
        </div>
      </div>
    </div>
  )
}
