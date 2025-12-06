import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:events')
// GET - Fetch core task completion status for an event
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const params = await routeContext.params
    const eventId = params.id

    // Fetch completion records with template details
    const { data: completions, error } = await supabase
      .from('event_core_task_completion')
      .select(`
        *,
        core_task_template:core_task_templates(
          id,
          task_name,
          display_order
        ),
        completed_by_user:users!event_core_task_completion_completed_by_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('event_id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .order('core_task_template(display_order)', { ascending: true })

    if (error) {
      log.error({ error }, 'Error fetching event core tasks')
      return NextResponse.json({ error: 'Failed to fetch core tasks' }, { status: 500 })
    }

    return NextResponse.json(completions || [])
  } catch (error) {
    log.error({ error }, 'Error in GET /api/events/[id]/core-tasks')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update completion status of a core task
export async function PATCH(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const params = await routeContext.params
    const eventId = params.id

    const body = await request.json()
    const { completion_id, is_completed } = body

    if (!completion_id) {
      return NextResponse.json({ error: 'Completion ID is required' }, { status: 400 })
    }

    const updateData: any = {
      is_completed,
      completed_at: is_completed ? new Date().toISOString() : null,
      completed_by: is_completed ? session.user.id : null
    }

    const { data: completion, error } = await supabase
      .from('event_core_task_completion')
      .update(updateData)
      .eq('id', completion_id)
      .eq('event_id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .select(`
        *,
        core_task_template:core_task_templates(
          id,
          task_name,
          display_order
        )
      `)
      .single()

    if (error) {
      log.error({ error }, 'Error updating core task completion')
      return NextResponse.json({ error: 'Failed to update completion status' }, { status: 500 })
    }

    return NextResponse.json(completion)
  } catch (error) {
    log.error({ error }, 'Error in PATCH /api/events/[id]/core-tasks')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
