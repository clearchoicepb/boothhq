'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2, DollarSign, Building2, User, Calendar, FileText, TrendingUp, MapPin, Clock, Activity, Paperclip } from 'lucide-react'
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
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const eventId = params.id as string
  const [event, setEvent] = useState<EventWithRelations | null>(null)
  const [eventDates, setEventDates] = useState<EventDate[]>([])
  const [localLoading, setLocalLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [invoices, setInvoices] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [loadingAttachments, setLoadingAttachments] = useState(false)

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

  const fetchInvoices = useCallback(async () => {
    try {
      setLoadingInvoices(true)
      const response = await fetch(`/api/invoices?event_id=${eventId}`)
      if (response.ok) {
        const data = await response.json()
        setInvoices(data)
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoadingInvoices(false)
    }
  }, [eventId])

  const fetchActivities = useCallback(async () => {
    try {
      setLoadingActivities(true)
      const response = await fetch(`/api/events/${eventId}/activity`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoadingActivities(false)
    }
  }, [eventId])

  const fetchAttachments = useCallback(async () => {
    try {
      setLoadingAttachments(true)
      const response = await fetch(`/api/attachments?event_id=${eventId}`)
      if (response.ok) {
        const data = await response.json()
        setAttachments(data)
      }
    } catch (error) {
      console.error('Error fetching attachments:', error)
    } finally {
      setLoadingAttachments(false)
    }
  }, [eventId])

  useEffect(() => {
    if (session && tenant && eventId) {
      fetchEvent()
      fetchEventDates()
    }
  }, [session, tenant, eventId, fetchEvent, fetchEventDates])

  useEffect(() => {
    if (session && tenant && eventId) {
      if (activeTab === 'invoices') {
        fetchInvoices()
      } else if (activeTab === 'activity') {
        fetchActivities()
      } else if (activeTab === 'files') {
        fetchAttachments()
      }
    }
  }, [activeTab, session, tenant, eventId, fetchInvoices, fetchActivities, fetchAttachments])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete event')
      }

      router.push(`/${tenantSubdomain}/events`)
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event')
    }
  }

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
                  <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <FileText className="h-4 w-4 mr-2" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`${
                  activeTab === 'invoices'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Invoices
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`${
                  activeTab === 'activity'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Activity className="h-4 w-4 mr-2" />
                Activity
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`${
                  activeTab === 'files'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Files
              </button>
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
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
                  <Link href={`/${tenantSubdomain}/invoices/new?event_id=${event.id}&returnTo=events/${event.id}`} className="block">
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
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
                  <Link href={`/${tenantSubdomain}/invoices/new?event_id=${event.id}&returnTo=events/${event.id}`}>
                    <Button size="sm">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Button>
                  </Link>
                </div>

                {loadingInvoices ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new invoice.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {invoice.invoice_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {invoice.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${invoice.total_amount?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <Link href={`/${tenantSubdomain}/invoices/${invoice.id}?returnTo=events/${event.id}`} className="text-blue-600 hover:text-blue-900">
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h2>

              {loadingActivities ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No activity yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Activity will appear here as you work on this event.</p>
                </div>
              ) : (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {activities.map((activity, activityIdx) => (
                      <li key={activity.id}>
                        <div className="relative pb-8">
                          {activityIdx !== activities.length - 1 && (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                                <Activity className="h-4 w-4 text-white" />
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                                {activity.description && (
                                  <p className="text-sm text-gray-500">{activity.description}</p>
                                )}
                              </div>
                              <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                {new Date(activity.date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Files & Attachments</h2>
                <Button size="sm">
                  <Paperclip className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </div>

              {loadingAttachments ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : attachments.length === 0 ? (
                <div className="text-center py-12">
                  <Paperclip className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No files</h3>
                  <p className="mt-1 text-sm text-gray-500">Upload documents, images, or other files related to this event.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <Paperclip className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{attachment.file_name}</p>
                          <p className="text-xs text-gray-500">
                            {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(2)} KB` : 'Unknown size'} •
                            Uploaded {new Date(attachment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </AppLayout>
    </AccessGuard>
  )
}