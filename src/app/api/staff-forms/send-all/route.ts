import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'
import type { SendAllStaffFormsRequest } from '@/types/staff-forms'

const log = createLogger('api:staff-forms:send-all')

/**
 * POST /api/staff-forms/send-all
 * Send staff forms to all staff members assigned to an event
 * This is a convenience endpoint that fetches all assignments and calls the send endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const body: SendAllStaffFormsRequest = await request.json()

    // Validate required fields
    if (!body.event_id || !body.template_id) {
      return NextResponse.json(
        { error: 'Missing required fields: event_id, template_id' },
        { status: 400 }
      )
    }

    // Fetch all staff assignments for the event
    const { data: assignments, error: assignmentsError } = await supabase
      .from('event_staff_assignments')
      .select('id')
      .eq('tenant_id', dataSourceTenantId)
      .eq('event_id', body.event_id)

    if (assignmentsError) {
      log.error({ error: assignmentsError, eventId: body.event_id }, 'Failed to fetch staff assignments')
      return NextResponse.json({ error: 'Failed to fetch staff assignments' }, { status: 500 })
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json(
        { error: 'No staff members assigned to this event' },
        { status: 404 }
      )
    }

    // Get existing forms to filter out
    const { data: existingForms } = await supabase
      .from('staff_forms')
      .select('staff_assignment_id')
      .eq('tenant_id', dataSourceTenantId)
      .eq('event_id', body.event_id)

    const existingAssignmentIds = new Set(existingForms?.map(f => f.staff_assignment_id) || [])
    const pendingAssignmentIds = assignments
      .filter(a => !existingAssignmentIds.has(a.id))
      .map(a => a.id)

    if (pendingAssignmentIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All staff members already have forms for this event',
        created: 0,
        skipped: assignments.length,
      })
    }

    // Forward to the send endpoint with all pending assignment IDs
    const sendRequest = new Request(new URL('/api/staff-forms/send', request.url), {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        event_id: body.event_id,
        template_id: body.template_id,
        staff_assignment_ids: pendingAssignmentIds,
      }),
    })

    // Import and call the send handler directly to avoid network hop
    const { POST: sendHandler } = await import('../send/route')
    return sendHandler(sendRequest)
  } catch (error) {
    log.error({ error }, 'Staff forms send-all error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
