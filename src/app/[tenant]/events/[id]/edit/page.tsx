'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import { EventFormEnhanced } from '@/components/event-form-enhanced'
import { AppLayout } from '@/components/layout/app-layout'
import { AccessGuard } from '@/components/access-guard'
import { usePermissions } from '@/lib/permissions'
import { Event as EventType } from '@/lib/supabase-client'
import { eventsService } from '@/lib/api/services/eventsService'
import { createLogger } from '@/lib/logger'

const log = createLogger('edit')


export default function EventEditPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const { hasPermission } = usePermissions()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const eventId = params.id as string
  const [event, setEvent] = useState<EventType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (session && tenant && eventId) {
      fetchEvent()
    }
  }, [session, tenant, eventId])

  const fetchEvent = async () => {
    try {
      setIsLoading(true)
      const data = await eventsService.getById(eventId)
      setEvent(data as EventType)
    } catch (error) {
      log.error({ error }, 'Error fetching event')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (eventData: any) => {
    try {
      console.log('Sending event data:', eventData)
      await eventsService.update(eventId, eventData)
      router.push(`/${tenantSubdomain}/events/${eventId}`)
    } catch (error) {
      log.error({ error }, 'Error updating event')
      throw error
    }
  }

  const handleClose = () => {
    router.push(`/${tenantSubdomain}/events/${eventId}`)
  }

  const canManageEvents = hasPermission('events', 'edit')

  if (status === 'loading' || loading || isLoading) {
    return (
      <AccessGuard module="events" action="edit">
        <AppLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </AppLayout>
      </AccessGuard>
    )
  }

  if (!canManageEvents) {
    return (
      <AccessGuard module="events" action="edit">
        <AppLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to edit events.</p>
          </div>
        </AppLayout>
      </AccessGuard>
    )
  }

  if (!event) {
    return (
      <AccessGuard module="events" action="edit">
        <AppLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
            <p className="text-gray-600">The event you're trying to edit doesn't exist.</p>
          </div>
        </AppLayout>
      </AccessGuard>
    )
  }

  return (
    <AccessGuard module="events" action="edit">
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EventFormEnhanced
            isOpen={true}
            onClose={handleClose}
            onSave={handleSave}
            event={event}
            title="Edit Event"
          />
        </div>
      </AppLayout>
    </AccessGuard>
  )
}
