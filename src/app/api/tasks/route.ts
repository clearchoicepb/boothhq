import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
// GET - Fetch tasks
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const assignedTo = searchParams.get('assignedTo')
    const status = searchParams.get('status')

    let query = supabase
      .from('tasks')
      .select(`
        *,
        assigned_to_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name, email),
        event_date:event_dates!tasks_event_date_id_fkey(id, event_date)
      `)
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })

    if (entityType && entityId) {
      query = query.eq('entity_type', entityType).eq('entity_id', entityId)
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({
        error: 'Failed to fetch tasks',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json(tasks || [])
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new task
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const body = await request.json()
    const {
      title,
      description,
      assignedTo,
      entityType,
      entityId,
      eventDateId,
      status = 'pending',
      priority = 'medium',
      dueDate,
    } = body

    if (!title) {
      return NextResponse.json({
        error: 'Missing required field: title'
      }, { status: 400 })
    }

    const { data: task, error: createError } = await supabase
      .from('tasks')
      .insert({
        tenant_id: dataSourceTenantId,
        title,
        description,
        assigned_to: assignedTo || null,
        created_by: session.user.id,
        entity_type: entityType || null,
        entity_id: entityId || null,
        event_date_id: eventDateId || null,
        status,
        priority,
        due_date: dueDate || null,
      })
      .select(`
        *,
        assigned_to_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name, email),
        event_date:event_dates!tasks_event_date_id_fkey(id, event_date)
      `)
      .single()

    if (createError) {
      console.error('Error creating task:', createError)
      return NextResponse.json({
        error: 'Failed to create task',
        details: createError.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, task })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
