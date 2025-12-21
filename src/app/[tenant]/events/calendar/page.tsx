'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { AppLayout } from '@/components/layout/app-layout'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { eventsService } from '@/lib/api/services/eventsService'
import { createLogger } from '@/lib/logger'

const log = createLogger('calendar')

interface Event {
  id: string
  title: string
  start_date: string
  end_date: string | null
  status: string
  location: string | null
  account_name: string | null
  event_dates?: Array<{
    id: string
    event_date: string
    start_time: string | null
    end_time: string | null
    status: string
  }>
}

interface CalendarEvent {
  id: string
  name: string
  event_date: string
  start_time?: string | null
  end_time?: string | null
  status: string
  event_id?: string
}

export default function EventsCalendarPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const [events, setEvents] = useState<Event[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)

  useEffect(() => {
    if (session && tenant) {
      fetchEvents()
    }
  }, [session, tenant])

  // Transform events into calendar events (flatten event_dates)
  useEffect(() => {
    const transformedEvents: CalendarEvent[] = []
    
    events.forEach(event => {
      // If event has event_dates, use those
      if (event.event_dates && event.event_dates.length > 0) {
        event.event_dates.forEach(eventDate => {
          transformedEvents.push({
            id: eventDate.id,
            name: event.title,
            event_date: eventDate.event_date,
            start_time: eventDate.start_time || undefined,
            end_time: eventDate.end_time || undefined,
            status: eventDate.status || event.status,
            event_id: event.id
          })
        })
      } else {
        // Fallback: use start_date if no event_dates
        transformedEvents.push({
          id: event.id,
          name: event.title,
          event_date: event.start_date,
          status: event.status,
          event_id: event.id
        })
      }
    })
    
    setCalendarEvents(transformedEvents)
  }, [events])

  const fetchEvents = async () => {
    try {
      setEventsLoading(true)
      const data = await eventsService.list({
        status: 'all',
        type: 'all'
      })
      setEvents(data as Event[])
    } catch (error) {
      log.error({ error }, 'Error fetching events')
    } finally {
      setEventsLoading(false)
    }
  }

  const handleEventClick = (calendarEvent: CalendarEvent) => {
    // Navigate to the event detail page (use event_id if available, otherwise use id)
    const eventId = calendarEvent.event_id || calendarEvent.id
    router.push(`/${tenantSubdomain}/events/${eventId}`)
  }

  if (status === 'loading' || loading) {
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

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link 
                href={`/${tenantSubdomain}/events`}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors duration-150"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Events Calendar</h1>
                <p className="text-sm text-gray-600">View all events in calendar format</p>
              </div>
            </div>
            <div className="flex items-center text-[#347dc4]">
              <CalendarIcon className="h-6 w-6 text-[#347dc4]" />
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white p-6 rounded-lg shadow">
          {eventsLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#347dc4] mx-auto mb-4"></div>
                <p className="text-gray-600">Loading events...</p>
              </div>
            </div>
          ) : (
            <CalendarComponent 
              events={calendarEvents} 
              onEventClick={handleEventClick}
            />
          )}
        </div>
      </div>
    </AppLayout>
  )
}