'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, AlertCircle, Phone, MapPin, Calendar, Clock, Users, Package, FileText } from 'lucide-react'

interface LogisticsContact {
  name: string | null
  phone: string | null
}

interface LogisticsLocation {
  id?: string
  name: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
  notes?: string | null
}

interface LogisticsStaffMember {
  id: string
  name: string
  phone: string | null
  role: string | null
  arrival_time: string | null
  start_time: string | null
  end_time: string | null
}

interface LogisticsEquipment {
  id: string
  name: string
  type: string | null
  serial_number: string | null
}

interface LogisticsLineItem {
  id: string
  name: string
}

interface PublicLogisticsData {
  logistics: {
    event_title: string | null
    event_type: string | null
    client_name: string | null
    client_contact: LogisticsContact | null
    event_date: string | null
    setup_time: string | null
    start_time: string | null
    end_time: string | null
    location: LogisticsLocation | null
    onsite_contact: LogisticsContact
    event_planner: LogisticsContact
    load_in_notes: string | null
    parking_instructions: string | null
    packages: LogisticsLineItem[]
    add_ons: LogisticsLineItem[]
    equipment: LogisticsEquipment[]
    event_staff: LogisticsStaffMember[]
    event_managers: LogisticsStaffMember[]
    event_notes: string | null
  }
  tenant: {
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
 * Format date to full format
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
 * Build Google Maps URL from location data
 */
function buildMapsUrl(location: LogisticsLocation): string {
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
function formatAddress(location: LogisticsLocation): string {
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
 * Public Logistics Page
 *
 * Accessible at /logistics/[publicId] without authentication.
 * Allows event staff to view logistics information on mobile.
 */
export default function PublicLogisticsPage() {
  const params = useParams()
  const publicId = params.publicId as string

  const [data, setData] = useState<PublicLogisticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLogistics()
  }, [publicId])

  const fetchLogistics = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/public/logistics/${publicId}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('Logistics not found')
        } else {
          setError('Unable to load logistics')
        }
        return
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError('Unable to load logistics')
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Loading logistics...</p>
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
            {error || 'Logistics Not Found'}
          </h1>
          <p className="text-gray-600">
            This logistics sheet may have been removed or the link is invalid.
            Please contact your team for a new link.
          </p>
        </div>
      </div>
    )
  }

  const { logistics, tenant } = data
  const hasSchedule = logistics.event_date || logistics.setup_time || logistics.start_time || logistics.end_time
  const hasLocation = logistics.location?.name || logistics.location?.address_line1
  const hasScope = logistics.packages.length > 0 || logistics.add_ons.length > 0 || logistics.equipment.length > 0
  const hasStaff = logistics.event_staff.length > 0 || logistics.event_managers.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {/* Tenant branding */}
        {tenant.logoUrl && (
          <div className="mb-6 text-center">
            <img
              src={tenant.logoUrl}
              alt="Company Logo"
              className="h-12 mx-auto object-contain"
            />
          </div>
        )}

        {/* Main card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* ========== SECTION 1: HEADER ========== */}
          <div className="bg-gradient-to-r from-[#347dc4] to-[#2d6ba8] px-6 py-5 text-white">
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
                {/* Onsite Contact */}
                {(logistics.onsite_contact?.name || logistics.onsite_contact?.phone) && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Onsite Contact</label>
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className="text-gray-900">{logistics.onsite_contact.name || 'Unknown'}</span>
                      {logistics.onsite_contact.phone && (
                        <>
                          <span className="text-gray-400">•</span>
                          <PhoneLink phone={logistics.onsite_contact.phone} />
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Event Planner */}
                {(logistics.event_planner?.name || logistics.event_planner?.phone) && (
                  <div className="border-t border-gray-200 pt-4">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Event Planner</label>
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className="text-gray-900">{logistics.event_planner.name || 'Unknown'}</span>
                      {logistics.event_planner.phone && (
                        <>
                          <span className="text-gray-400">•</span>
                          <PhoneLink phone={logistics.event_planner.phone} />
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Client Contact */}
                {logistics.client_contact?.name && (
                  <div className="border-t border-gray-200 pt-4">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Client</label>
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

                {/* Show placeholder if no contacts */}
                {!logistics.onsite_contact?.name && !logistics.onsite_contact?.phone &&
                 !logistics.event_planner?.name && !logistics.event_planner?.phone &&
                 !logistics.client_contact?.name && (
                  <p className="text-gray-400 italic">No contacts available</p>
                )}
              </div>
            </section>

            {/* ========== SECTION 5: ARRIVAL INSTRUCTIONS ========== */}
            {(logistics.load_in_notes || logistics.parking_instructions) && (
              <section>
                <SectionHeader icon={FileText} title="Arrival Instructions" />

                {logistics.load_in_notes && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 block mb-2">Load-In Notes</label>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{logistics.load_in_notes}</p>
                    </div>
                  </div>
                )}

                {logistics.parking_instructions && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Parking Instructions</label>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{logistics.parking_instructions}</p>
                    </div>
                  </div>
                )}
              </section>
            )}

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
            {logistics.event_notes && (
              <section>
                <SectionHeader icon={FileText} title="Event Notes" />
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{logistics.event_notes}</p>
                </div>
              </section>
            )}

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
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-400">
          Powered by BoothHQ
        </div>
      </div>
    </div>
  )
}
