'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Loader2,
  AlertCircle,
  User,
  Calendar,
  MapPin,
  Users,
  Package,
  CheckCircle,
  Circle,
  FileText,
  CreditCard,
  ClipboardList,
  Phone,
  Mail
} from 'lucide-react'

interface EventDate {
  id: string
  date: string
  setup_time: string | null
  start_time: string | null
  end_time: string | null
}

interface StaffMember {
  name: string
  role: string | null
}

interface PackageInfo {
  name: string
  description: string | null
}

interface AddOn {
  name: string
}

interface Agreement {
  id: string
  title: string
  status: string
  is_signed: boolean
  signed_at: string | null
  sign_url: string
  pdf_url: string | null
}

interface InvoiceInfo {
  public_token: string
  status: string
  total_amount: number
  paid_amount: number
  balance_amount: number
  is_paid: boolean
}

interface EventForm {
  id: string
  name: string
  public_id: string
  status: string
  is_completed: boolean
  completed_at: string | null
}

interface PublicEventData {
  event: {
    id: string
    title: string
    event_type: string
    status: string
    guest_count: number | null
  }
  client: {
    name: string | null
    contact_name: string | null
    email: string | null
    phone: string | null
  }
  dates: EventDate[]
  venue: {
    name: string | null
    address: string | null
  } | null
  staff: StaffMember[]
  package: PackageInfo | null
  add_ons: AddOn[]
  todo: {
    agreement: Agreement | null
    invoice: InvoiceInfo | null
    forms: EventForm[]
  }
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
 * Section Header Component
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
 * Todo Item Component
 */
function TodoItem({
  label,
  isComplete,
  href,
  isPaid
}: {
  label: string
  isComplete: boolean
  href: string | null
  isPaid?: boolean
}) {
  const content = (
    <div className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-colors ${
      href ? 'hover:bg-gray-100 cursor-pointer' : ''
    } ${isPaid ? 'bg-green-50' : 'bg-white'}`}>
      {isComplete ? (
        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
      )}
      <span className={`flex-1 ${isPaid ? 'line-through text-gray-500' : 'text-gray-900'}`}>
        {label}
      </span>
      {href && (
        <span className="text-[#347dc4] text-sm font-medium">View</span>
      )}
    </div>
  )

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    )
  }

  return content
}

/**
 * Public Event Page
 *
 * Accessible at /event/[token] without authentication.
 * Allows clients to view their event details and access action items.
 */
export default function PublicEventPage() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<PublicEventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  useEffect(() => {
    fetchEvent()
  }, [token])

  const fetchEvent = async () => {
    try {
      setLoading(true)
      setError(null)
      setDebugInfo(null)

      const response = await fetch(`/api/public/events/${token}`)
      const result = await response.json()

      if (!response.ok) {
        // Capture debug info if available
        if (result.debug) {
          setDebugInfo(JSON.stringify(result.debug, null, 2))
        }
        if (response.status === 404) {
          setError('Event not found')
        } else if (response.status === 403) {
          setError('Public access is disabled for this event')
        } else {
          setError('Unable to load event')
        }
        return
      }

      setData(result)
    } catch (err) {
      setError('Unable to load event')
      setDebugInfo(err instanceof Error ? err.message : 'Unknown error')
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
          <p className="mt-2 text-sm text-gray-500">Loading event details...</p>
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
            {error || 'Event Not Found'}
          </h1>
          <p className="text-gray-600">
            This event page may have been removed or the link is invalid.
            Please contact the event organizer for assistance.
          </p>
          {debugInfo && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-left">
              <p className="text-xs font-mono text-gray-500">Debug info:</p>
              <pre className="text-xs font-mono text-gray-700 mt-1 overflow-auto">{debugInfo}</pre>
            </div>
          )}
        </div>
      </div>
    )
  }

  const { event, client, dates, venue, staff, package: eventPackage, add_ons, todo, tenant } = data
  const primaryDate = dates.length > 0 ? dates[0] : null

  // Count completed items
  const completedCount = [
    todo.agreement?.is_signed,
    todo.invoice?.is_paid,
    ...todo.forms.map(f => f.is_completed)
  ].filter(Boolean).length

  const totalCount = (todo.agreement ? 1 : 0) + (todo.invoice ? 1 : 0) + todo.forms.length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {/* Logo Header */}
        {tenant.logoUrl && (
          <div className="mb-8 text-center">
            <img
              src={tenant.logoUrl}
              alt="Company Logo"
              className="h-16 mx-auto object-contain"
            />
          </div>
        )}

        {/* Event Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
          <p className="text-gray-600">
            {event.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Details Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <SectionHeader icon={User} title="Client Details" />
              <div className="space-y-3">
                {client.name && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Client Name</label>
                    <p className="text-gray-900 font-medium">{client.name}</p>
                  </div>
                )}
                {client.contact_name && client.contact_name !== client.name && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Contact Name</label>
                    <p className="text-gray-900">{client.contact_name}</p>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a
                      href={`tel:${formatPhoneForLink(client.phone)}`}
                      className="text-[#347dc4] hover:underline"
                    >
                      {client.phone}
                    </a>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a
                      href={`mailto:${client.email}`}
                      className="text-[#347dc4] hover:underline"
                    >
                      {client.email}
                    </a>
                  </div>
                )}
                {!client.name && !client.contact_name && !client.phone && !client.email && (
                  <p className="text-gray-400 italic">No client details available</p>
                )}
              </div>
            </div>

            {/* Event Details Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <SectionHeader icon={Calendar} title="Event Details" />
              <div className="space-y-4">
                {/* Event Dates */}
                {dates.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-2">
                      Event Date{dates.length > 1 ? 's' : ''}
                    </label>
                    <div className="space-y-2">
                      {dates.map((d) => (
                        <div key={d.id} className="bg-gray-50 rounded-lg p-3">
                          <p className="font-semibold text-gray-900">{formatDate(d.date)}</p>
                          {(d.start_time || d.end_time) && (
                            <p className="text-sm text-gray-600 mt-1">
                              {formatTime(d.start_time)} {d.start_time && d.end_time && '-'} {formatTime(d.end_time)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Event Type */}
                <div>
                  <label className="text-sm font-medium text-gray-500">Event Type</label>
                  <p className="text-gray-900">
                    {event.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                </div>

                {/* Venue */}
                {venue && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">Venue</label>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                      <div>
                        {venue.name && (
                          <p className="font-medium text-gray-900">{venue.name}</p>
                        )}
                        {venue.address && (
                          <p className="text-gray-600 text-sm">{venue.address}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Staff Assigned */}
                {staff.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-2">Staff Assigned</label>
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                      <div className="flex flex-wrap gap-2">
                        {staff.map((s, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800"
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Package Details Card */}
            {(eventPackage || add_ons.length > 0) && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <SectionHeader icon={Package} title="Package Details" />
                <div className="space-y-4">
                  {eventPackage && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">Package</label>
                      <div className="bg-[#347dc4]/5 border border-[#347dc4]/20 rounded-lg p-4">
                        <p className="font-semibold text-gray-900">{eventPackage.name}</p>
                        {eventPackage.description && (
                          <p className="text-sm text-gray-600 mt-1">{eventPackage.description}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {add_ons.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-2">Add-Ons</label>
                      <ul className="space-y-2">
                        {add_ons.map((addon, index) => (
                          <li key={index} className="flex items-center gap-2 text-gray-700">
                            <span className="w-1.5 h-1.5 bg-[#347dc4] rounded-full" />
                            {addon.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Right Column (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <SectionHeader icon={ClipboardList} title="Action Items" />
                {totalCount > 0 && (
                  <span className="text-sm text-gray-500">
                    {completedCount}/{totalCount}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {/* Agreement */}
                {todo.agreement && (
                  <TodoItem
                    label={todo.agreement.title || 'Agreement'}
                    isComplete={todo.agreement.is_signed}
                    href={todo.agreement.sign_url}
                  />
                )}

                {/* Invoice */}
                {todo.invoice && (
                  <TodoItem
                    label="Invoice"
                    isComplete={todo.invoice.is_paid}
                    isPaid={todo.invoice.is_paid}
                    href={`/invoices/public/${tenant.id}/${todo.invoice.public_token}`}
                  />
                )}

                {/* Event Forms */}
                {todo.forms.map((form) => (
                  <TodoItem
                    key={form.id}
                    label={form.name}
                    isComplete={form.is_completed}
                    href={`/forms/${form.public_id}`}
                  />
                ))}

                {/* No items message */}
                {totalCount === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No action items</p>
                  </div>
                )}
              </div>

              {/* Progress indicator */}
              {totalCount > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium text-gray-900">
                      {Math.round((completedCount / totalCount) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#347dc4] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(completedCount / totalCount) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          Powered by BoothHQ
        </div>
      </div>
    </div>
  )
}
