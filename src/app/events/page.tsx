'use client'

import { useState, useEffect } from 'react'
import { eventsApi } from '@/lib/db/events'
import { Button } from '@/components/ui/button'
import { EventForm } from '@/components/event-form'
import { Search, Edit, Trash2, Plus, Calendar, Clock, MapPin, Users } from 'lucide-react'
import type { Event } from '@/lib/supabase-client'

interface EventWithRelations extends Event {
  accounts: {
    id: string
    name: string
  } | null
  contacts: {
    id: string
    first_name: string
    last_name: string
  } | null
  opportunities: {
    id: string
    name: string
  } | null
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [currentPage, searchTerm])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const data = await eventsApi.getAll()
      
      // Filter by search term
      let filteredData = data
      if (searchTerm) {
        filteredData = data.filter(event => 
          event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.accounts?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `${event.contacts?.first_name} ${event.contacts?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.opportunities?.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      // Sort by start date (most recent first)
      filteredData.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())

      // Calculate pagination
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const paginatedData = filteredData.slice(startIndex, endIndex)
      
      setEvents(paginatedData)
      setTotalPages(Math.ceil(filteredData.length / itemsPerPage))
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await eventsApi.delete(id)
        fetchEvents()
      } catch (error) {
        console.error('Error deleting event:', error)
      }
    }
  }

  const handleEdit = (event: Event) => {
    setEditingEvent(event)
    setIsFormOpen(true)
  }

  const handleAddNew = () => {
    setEditingEvent(null)
    setIsFormOpen(true)
  }

  const handleFormSubmit = (event: Event) => {
    fetchEvents()
    setIsFormOpen(false)
    setEditingEvent(null)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingEvent(null)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  const getEventTypeColor = (eventType: string) => {
    const colors = {
      'meeting': 'bg-blue-100 text-blue-800',
      'call': 'bg-green-100 text-green-800',
      'demo': 'bg-purple-100 text-purple-800',
      'presentation': 'bg-orange-100 text-orange-800',
      'lunch': 'bg-yellow-100 text-yellow-800',
      'conference': 'bg-indigo-100 text-indigo-800',
      'other': 'bg-gray-100 text-gray-800'
    }
    return colors[eventType as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'rescheduled': 'bg-yellow-100 text-yellow-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <Button onClick={handleAddNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white shadow rounded-lg p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search events by title, description, type, account, contact, or opportunity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </div>

      {/* Events Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="text-gray-500">Loading events...</div>
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500">
              {searchTerm ? 'No events found matching your search.' : 'No events found.'}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opportunity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event) => {
                    const { date, time } = formatDateTime(event.event_date)
                    const upcoming = isUpcoming(event.event_date)
                    
                    return (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-start">
                            <Calendar className={`w-5 h-5 mr-3 mt-0.5 ${upcoming ? 'text-blue-500' : 'text-gray-400'}`} />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {event.name}
                              </div>
                              {event.setup_notes && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {event.setup_notes}
                                </div>
                              )}
                              {event.venue_name && (
                                <div className="text-sm text-gray-500 flex items-center mt-1">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {event.venue_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                              {date}
                            </div>
                            <div className="flex items-center mt-1">
                              <Clock className="w-4 h-4 mr-1 text-gray-400" />
                              {time}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEventTypeColor(event.event_type)}`}>
                            {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {event.accounts?.name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {event.contacts ? (
                              <div className="flex items-center">
                                <Users className="w-3 h-3 mr-1 text-gray-400" />
                                {event.contacts.first_name} {event.contacts.last_name}
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {event.opportunities?.name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(event.status)}`}>
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(event)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(event.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {((currentPage - 1) * itemsPerPage) + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, events.length)}
                      </span>{' '}
                      of{' '}
                      <span className="font-medium">{events.length}</span>{' '}
                      results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="rounded-l-md"
                      >
                        Previous
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="rounded-none"
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-r-md"
                      >
                        Next
                      </Button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Event Form Modal */}
      <EventForm
        event={editingEvent}
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}

