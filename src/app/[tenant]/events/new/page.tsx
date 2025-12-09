'use client'

import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { EventFormEnhanced } from '@/components/event-form-enhanced'
import { AppLayout } from '@/components/layout/app-layout'
import { AccessGuard } from '@/components/access-guard'
import { usePermissions } from '@/lib/permissions'
import { eventsService } from '@/lib/api/services/eventsService'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'
import type { EventInsert } from '@/types/events'

const log = createLogger('new')

export default function NewEventPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const { hasPermission } = usePermissions()
  const router = useRouter()
  const params = useParams()
  const tenantSubdomain = params.tenant as string

  const handleSave = async (formData: EventInsert) => {
    try {
      const data = await eventsService.create(formData)
      const eventId = data.id

      toast.success('Event created successfully!')
      router.push(`/${tenantSubdomain}/events/${eventId}`)
    } catch (error) {
      log.error({ error }, 'Error creating event')
      toast.error(error instanceof Error ? error.message : 'Failed to create event')
      throw error
    }
  }

  const handleClose = () => {
    router.push(`/${tenantSubdomain}/events`)
  }

  const canManageEvents = hasPermission('events', 'create')

  if (status === 'loading' || loading) {
    return (
      <AccessGuard module="events" action="create">
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
      <AccessGuard module="events" action="create">
        <AppLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to create events.</p>
          </div>
        </AppLayout>
      </AccessGuard>
    )
  }

  return (
    <AccessGuard module="events" action="create">
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EventFormEnhanced
            isOpen={true}
            onClose={handleClose}
            onSave={handleSave}
            title="Create New Event"
          />
        </div>
      </AppLayout>
    </AccessGuard>
  )
}
