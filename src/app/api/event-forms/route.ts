import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:event-forms')

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/event-forms
 * List all event forms across all events for the tenant
 *
 * Query params:
 * - status: filter by form status ('completed', 'pending', 'all')
 *   - 'pending' includes: draft, sent, viewed
 *   - 'completed' includes only: completed
 *   - 'all' includes all statuses
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'all'

    // Build query - fetch forms with event data
    let query = supabase
      .from('event_forms')
      .select(`
        id,
        name,
        status,
        public_id,
        sent_at,
        viewed_at,
        completed_at,
        created_at,
        updated_at,
        event_id,
        events!inner (
          id,
          title,
          event_dates (
            event_date
          )
        )
      `)
      .eq('tenant_id', dataSourceTenantId)

    // Apply status filter
    if (statusFilter === 'completed') {
      query = query.eq('status', 'completed')
    } else if (statusFilter === 'pending') {
      query = query.in('status', ['draft', 'sent', 'viewed'])
    }
    // 'all' - no filter needed

    const { data, error } = await query

    if (error) {
      log.error({ error }, 'Error fetching event forms')
      return NextResponse.json(
        { error: 'Failed to fetch event forms', details: error.message },
        { status: 500 }
      )
    }

    // Transform and sort the data
    const transformedData = (data || []).map((form: any) => {
      // Get the earliest event date from event_dates
      let eventDate: string | null = null
      if (form.events?.event_dates && form.events.event_dates.length > 0) {
        const sortedDates = [...form.events.event_dates].sort(
          (a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        )
        eventDate = sortedDates[0].event_date
      }

      return {
        id: form.id,
        name: form.name,
        status: form.status,
        public_id: form.public_id,
        sent_at: form.sent_at,
        viewed_at: form.viewed_at,
        completed_at: form.completed_at,
        created_at: form.created_at,
        event_id: form.event_id,
        event_name: form.events?.title || 'Unknown Event',
        event_date: eventDate,
      }
    })

    // Sort based on status filter
    if (statusFilter === 'completed') {
      // Sort by completion date, newest first
      transformedData.sort((a, b) => {
        const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0
        const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0
        return dateB - dateA
      })
    } else if (statusFilter === 'pending') {
      // Sort by event date, soonest first
      transformedData.sort((a, b) => {
        const dateA = a.event_date ? new Date(a.event_date).getTime() : Infinity
        const dateB = b.event_date ? new Date(b.event_date).getTime() : Infinity
        return dateA - dateB
      })
    } else {
      // All: sort by created_at, newest first
      transformedData.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return dateB - dateA
      })
    }

    log.debug({ count: transformedData.length, statusFilter }, 'Event forms fetched')

    return NextResponse.json(transformedData)
  } catch (error) {
    log.error({ error }, 'Error in GET /api/event-forms')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
