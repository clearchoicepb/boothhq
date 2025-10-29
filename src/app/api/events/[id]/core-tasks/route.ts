import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

// GET - Fetch core task completion status for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id: eventId } = await params

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

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
      .eq('tenant_id', session.user.tenantId)
      .order('core_task_template(display_order)', { ascending: true })

    if (error) {
      console.error('Error fetching event core tasks:', error)
      return NextResponse.json({ error: 'Failed to fetch core tasks' }, { status: 500 })
    }

    return NextResponse.json(completions || [])
  } catch (error) {
    console.error('Error in GET /api/events/[id]/core-tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update completion status of a core task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id: eventId } = await params

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { completion_id, is_completed } = body

    if (!completion_id) {
      return NextResponse.json({ error: 'Completion ID is required' }, { status: 400 })
    }

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

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
      .eq('tenant_id', session.user.tenantId)
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
      console.error('Error updating core task completion:', error)
      return NextResponse.json({ error: 'Failed to update completion status' }, { status: 500 })
    }

    return NextResponse.json(completion)
  } catch (error) {
    console.error('Error in PATCH /api/events/[id]/core-tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
