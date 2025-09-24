'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Search, Plus, Eye, Edit, Trash2, Calendar as CalendarIcon } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Event {
  id: string
  name: string
  event_type: string
  event_date: string
  start_time: string
  end_time: string
  status: string
  venue_name: string
  account_name: string
  contact_name: string
  total_cost: number
  created_at: string
}

export default function EventsPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  const [events, setEvents] = useState<Event[]>([])
  const [localLoading, setLocalLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all')
  const [filterType, setFilterType] = useState<'all' | 'wedding' | 'corporate' | 'birthday' | 'other'>('all')

  const fetchEvents = useCallback(async () => {
    try {
      setLocalLoading(true)
      const response = await fetch(`/api/events?status=${filterStatus}&type=${filterType}`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data)
      } else {
        console.error('Failed to fetch events:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error details:', errorData)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLocalLoading(false)
    }
  }, [filterStatus, filterType])

  useEffect(() => {
    if (session && tenant) {
      fetchEvents()
    }
  }, [session, tenant, fetchEvents])

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        const response = await fetch(`/api/events/${eventId}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          setEvents(events.filter(event => event.id !== eventId))
        }
      } catch (error) {
        console.error('Error deleting event:', error)
      }
    }
  }

  if (status === 'loading' || loading || localLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#347dc4] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please sign in to access this page.</p>
          <Link href="/auth/signin" className="mt-4 inline-block bg-[#347dc4] text-white px-4 py-2 rounded-md hover:bg-[#2c6ba8]">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = (event.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (event.venue_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (event.account_name && event.account_name.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch
  })

  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        {/* Error handling for empty or malformed data */}
        {events.length === 0 && !localLoading && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-600">Get started by creating your first event.</p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Events</h1>
                <p className="text-sm text-gray-600">Manage your photo booth events</p>
              </div>
              <div className="flex items-center space-x-4">
                <Link href={`/${tenantSubdomain}/events/calendar`}>
                  <Button variant="outline" className="border-[#347dc4] text-[#347dc4] hover:bg-[#347dc4] hover:text-white">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Calendar View
                  </Button>
                </Link>
                <Link href={`/${tenantSubdomain}/events/new`}>
                  <Button className="bg-[#347dc4] hover:bg-[#2c6ba8] text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    New Event
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters and Search */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 active:shadow-inner hover:shadow-md ${
                    filterStatus === 'all' 
                      ? 'bg-[#347dc4] text-white' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  All Status
                </button>
                <button
                  onClick={() => setFilterStatus('upcoming')}
                  className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 active:shadow-inner hover:shadow-md ${
                    filterStatus === 'upcoming' 
                      ? 'bg-[#347dc4] text-white' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setFilterStatus('completed')}
                  className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 active:shadow-inner hover:shadow-md ${
                    filterStatus === 'completed' 
                      ? 'bg-[#347dc4] text-white' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Completed
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 active:shadow-inner hover:shadow-md ${
                    filterType === 'all' 
                      ? 'bg-[#347dc4] text-white' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  All Types
                </button>
                <button
                  onClick={() => setFilterType('wedding')}
                  className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 active:shadow-inner hover:shadow-md ${
                    filterType === 'wedding' 
                      ? 'bg-[#347dc4] text-white' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Wedding
                </button>
                <button
                  onClick={() => setFilterType('corporate')}
                  className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 active:shadow-inner hover:shadow-md ${
                    filterType === 'corporate' 
                      ? 'bg-[#347dc4] text-white' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Corporate
                </button>
              </div>
            </div>
          </div>

          {/* Events Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">All Events</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate max-w-48" title={event.name || 'Untitled Event'}>
                            {event.name || 'Untitled Event'}
                          </div>
                          <div className="text-sm text-gray-500 capitalize">{event.event_type || 'Other'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date'}</div>
                        <div className="text-gray-500">
                          {event.start_time || '--'} - {event.end_time || '--'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-32" title={event.venue_name || 'No venue'}>
                        {event.venue_name || 'No venue'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-32" title={event.account_name || 'No account'}>
                        {event.account_name || 'No account'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          event.status === 'completed' ? 'bg-green-100 text-green-800' :
                          event.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                          event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {event.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${event.total_cost?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link href={`/${tenantSubdomain}/events/${event.id}`}>
                            <button 
                              className="text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150 active:scale-95"
                              aria-label="View event details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </Link>
                          <button 
                            className="text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150 active:scale-95"
                            aria-label="Edit event"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-red-600 hover:text-red-800 cursor-pointer transition-colors duration-150 active:scale-95"
                            aria-label="Delete event"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}