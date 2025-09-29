'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams } from 'next/navigation'
import { CalendarView, EventDetailModal } from '@/components/calendar-view'
import { AppLayout } from '@/components/layout/app-layout'
import { AccessGuard } from '@/components/access-guard'
import { usePermissions } from '@/lib/permissions'

interface CalendarEvent {
  id: string
  title: string
  date: string
  start_time?: string
  end_time?: string
  location?: string
  type: 'event' | 'opportunity'
  status: string
  account_name?: string
  contact_name?: string
  event_type?: string
  stage?: string
}

interface EventData {
  id: string
  title: string
  start_date: string
  start_time?: string
  end_time?: string
  location?: string
  status: string
  account_name?: string
  contact_name?: string
  event_type?: string
}

interface OpportunityData {
  id: string
  name: string
  event_date?: string
  expected_close_date?: string
  initial_date?: string
  stage?: string
  status: string
  account_name?: string
  contact_name?: string
  amount?: number
}

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const { hasPermission } = usePermissions()
  const params = useParams()
  const tenantSubdomain = params.tenant as string

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (session && tenant) {
      fetchCalendarData()
    }
  }, [session, tenant])

  const fetchCalendarData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch events and opportunities in parallel
      const [eventsResponse, opportunitiesResponse] = await Promise.all([
        fetch('/api/events?status=all&type=all'),
        fetch('/api/opportunities?stage=all')
      ])

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        const calendarEvents: CalendarEvent[] = eventsData.map((event: EventData) => ({
          id: event.id,
          title: event.title,
          date: event.start_date,
          start_time: event.start_time,
          end_time: event.end_time,
          location: event.location,
          type: 'event' as const,
          status: event.status,
          account_name: event.account_name,
          contact_name: event.contact_name,
          event_type: event.event_type
        }))
        setEvents(calendarEvents)
      }

      if (opportunitiesResponse.ok) {
        const opportunitiesData = await opportunitiesResponse.json()
        // Store raw opportunity data - will be converted to CalendarEvent format in render
        setOpportunities(opportunitiesData)
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateClick = (date: string) => {
    console.log('Date clicked:', date)
    // You can implement date-specific actions here
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedEvent(null)
  }

  const canViewCalendar = hasPermission('events', 'view') || hasPermission('opportunities', 'view')

  if (status === 'loading' || loading || isLoading) {
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

  if (!canViewCalendar) {
    return (
      <AccessGuard module="events">
        <AppLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You don&apos;t have permission to view the calendar.</p>
          </div>
        </AppLayout>
      </AccessGuard>
    )
  }

  const allCalendarEvents = [
    ...events, 
    ...opportunities.map((opp: OpportunityData): CalendarEvent => ({
      id: opp.id,
      title: opp.name,
      date: opp.event_date || opp.expected_close_date || opp.initial_date || '',
      type: 'opportunity' as const,
      status: opp.stage || opp.status,
      account_name: opp.account_name,
      contact_name: opp.contact_name,
      stage: opp.stage
    }))
  ]

  return (
    <AccessGuard module="events">
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-600">View all your events and opportunities in one place</p>
          </div>

          <CalendarView
            events={allCalendarEvents}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            className="mb-6"
          />

          {/* Legend */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Legend</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-2">Events</h4>
                <div className="space-y-1">
                  <div className="flex items-center text-xs">
                    <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded mr-2"></div>
                    <span>Scheduled</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded mr-2"></div>
                    <span>In Progress</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <div className="w-3 h-3 bg-green-100 border border-green-200 rounded mr-2"></div>
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <div className="w-3 h-3 bg-red-100 border border-red-200 rounded mr-2"></div>
                    <span>Cancelled</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-2">Opportunities</h4>
                <div className="space-y-1">
                  <div className="flex items-center text-xs">
                    <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded mr-2"></div>
                    <span>Prospecting</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded mr-2"></div>
                    <span>Qualification</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded mr-2"></div>
                    <span>Proposal</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <div className="w-3 h-3 bg-green-100 border border-green-200 rounded mr-2"></div>
                    <span>Closed Won</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <EventDetailModal
          event={selectedEvent}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          tenantSubdomain={tenantSubdomain}
        />
      </AppLayout>
    </AccessGuard>
  )
}





