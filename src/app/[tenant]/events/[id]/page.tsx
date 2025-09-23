'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2, DollarSign, Building2, User, Calendar, FileText, TrendingUp, MapPin, Clock } from 'lucide-react'
import Link from 'next/link'
import { NotesSection } from '@/components/notes-section'
import { AppLayout } from '@/components/layout/app-layout'
import { AccessGuard } from '@/components/access-guard'
import { usePermissions } from '@/lib/permissions'
import { Event as EventType } from '@/lib/supabase-client'

interface EventWithRelations extends EventType {
  account_name: string | null
  contact_name: string | null
  opportunity_name: string | null
}

interface EventDate {
  id: string
  event_date: string
  start_time: string | null
  end_time: string | null
  location_id: string | null
  location_name: string | null
  notes: string | null
  status: string
}

export default function EventDetailPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const { hasPermission } = usePermissions()
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  const eventId = params.id as string
  const [event, setEvent] = useState<EventWithRelations | null>(null)
  const [eventDates, setEventDates] = useState<EventDate[]>([])
  const [localLoading, setLocalLoading] = useState(true)

  const fetchEvent = useCallback(async () => {
    try {
      setLocalLoading(true)
      
      const response = await fetch(`/api/events/${eventId}`)
      
      if (!response.ok) {
        console.error('Error fetching event')
        return
      }

      const data = await response.json()
      setEvent(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLocalLoading(false)
    }
  }, [eventId])

  const fetchEventDates = useCallback(async () => {
    try {
      const response = await fetch(`/api/event-dates?event_id=${eventId}`)
      if (response.ok) {
        const data = await response.json()
        setEventDates(data)
      }
    } catch (error) {
      console.error('Error fetching event dates:', error)
    }
  }, [eventId])

  useEffect(() => {
    if (session && tenant && eventId) {
      fetchEvent()
      fetchEventDates()
    }
  }, [session, tenant, eventId, fetchEvent, fetchEventDates])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'wedding':
        return 'bg-pink-100 text-pink-800'
      case 'corporate':
        return 'bg-blue-100 text-blue-800'
      case 'birthday':
        return 'bg-purple-100 text-purple-800'
      case 'anniversary':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const canManageEvents = hasPermission('events', 'edit')

  if (status === 'loading' || loading || localLoading) {
    return (
      <AccessGuard module="events">
        <AppLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </AppLayout>
      </AccessGuard>
    )
  }

  if (!event) {
    return (
      <AccessGuard module="events">
        <AppLayout>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
              <p className="text-gray-600 mb-4">The event you&apos;re looking for doesn&apos;t exist.</p>
              <Link href={`/${tenantSubdomain}/events`}>
                <Button>Back to Events</Button>
              </Link>
            </div>
          </div>
        </AppLayout>
      </AccessGuard>
    )
  }

  return (
    <AccessGuard module="events">
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href={`/${tenantSubdomain}/events`}>
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
                  <p className="text-gray-600">Event Details</p>
                </div>
              </div>
              {canManageEvents && (
                <div className="flex space-x-2">
                  <Link href={`/${tenantSubdomain}/events/${event.id}/edit`}>
                    <Button variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <Button variant="outline" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Event Type</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeColor(event.event_type)}`}>
                      {event.event_type}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Start Date</label>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {new Date(event.start_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {event.end_date && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">End Date</label>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {new Date(event.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                  {event.location && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-1">Location</label>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{event.location}</span>
                      </div>
                    </div>
                  )}
                  {event.date_type && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Date Type</label>
                      <span className="text-sm text-gray-900 capitalize">
                        {event.date_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                </div>
                {event.description && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                    <p className="text-sm text-gray-900">{event.description}</p>
                  </div>
                )}
              </div>

              {/* Event Dates */}
              {eventDates.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Schedule</h2>
                  <div className="space-y-4">
                    {eventDates.map((eventDate) => (
                      <div key={eventDate.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="font-medium text-gray-900">
                              {new Date(eventDate.event_date).toLocaleDateString()}
                            </span>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(eventDate.status)}`}>
                            {eventDate.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          {eventDate.start_time && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>Start: {eventDate.start_time}</span>
                            </div>
                          )}
                          {eventDate.end_time && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>End: {eventDate.end_time}</span>
                            </div>
                          )}
                          {eventDate.location_name && (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              <span>{eventDate.location_name}</span>
                            </div>
                          )}
                        </div>
                        {eventDate.notes && (
                          <div className="mt-2 text-sm text-gray-600">
                            <strong>Notes:</strong> {eventDate.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                    <p>{event.mailing_country}</p>
                  </div>
                </div>
              )}

              {/* Notes */}
              <NotesSection
                entityId={event.id}
                entityType="event"
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Account and Contact */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Account & Contact</h2>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Account</label>
                    {event.account_name ? (
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                        <Link 
                          href={`/${tenantSubdomain}/accounts/${event.account_id}`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {event.account_name}
                        </Link>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-900">-</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Contact</label>
                    {event.contact_name ? (
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <Link 
                          href={`/${tenantSubdomain}/contacts/${event.contact_id}`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {event.contact_name}
                        </Link>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-900">-</p>
                    )}
                  </div>
                  {event.opportunity_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Related Opportunity</label>
                      <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 text-gray-400 mr-2" />
                        <Link 
                          href={`/${tenantSubdomain}/opportunities/${event.opportunity_id}`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {event.opportunity_name}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <Link href={`/${tenantSubdomain}/invoices/new?event_id=${event.id}`} className="block">
                    <Button className="w-full" variant="outline">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Button>
                  </Link>
                  <Button className="w-full" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Contract
                  </Button>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Created</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.created_at).toLocaleDateString()} at {new Date(event.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Last Updated</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.updated_at).toLocaleDateString()} at {new Date(event.updated_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </AccessGuard>
  )
}