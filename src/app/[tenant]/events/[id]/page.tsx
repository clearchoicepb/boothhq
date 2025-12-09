'use client'

import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { AccessGuard } from '@/components/access-guard'
import { useEventData } from '@/hooks/useEventData'
import { LoadingState } from '@/components/events/loading-state'
import { EventDetailProvider } from '@/contexts/EventDetailContext'
import { EventDetailContent } from './components/EventDetailContent'

/**
 * Event Detail Page
 *
 * This is the main entry point for the event detail view.
 * It handles:
 * - Authentication and session management
 * - Data fetching for the event
 * - Providing the EventDetailContext to child components
 *
 * The actual content is rendered by EventDetailContent component.
 */
export default function EventDetailPage() {
  const params = useParams()
  const eventId = params.id as string
  const tenantSubdomain = params.tenant as string
  const { data: session, status } = useSession()

  // Fetch core event data for context provider
  const eventData = useEventData(eventId, session, tenantSubdomain)
  const { event, eventDates = [], loading } = eventData || {}

  // Show loading state while session or data is loading
  if (status === 'loading' || !eventData) {
    return (
      <AccessGuard module="events">
        <AppLayout>
          <LoadingState />
        </AppLayout>
      </AccessGuard>
    )
  }

  return (
    <EventDetailProvider
      event={event}
      eventDates={eventDates}
      loading={loading}
      onEventUpdate={eventData.fetchEvent}
    >
      <EventDetailContent eventData={eventData} />
    </EventDetailProvider>
  )
}
