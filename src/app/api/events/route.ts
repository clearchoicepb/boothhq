import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createAutoDesignItems } from '@/lib/design-helpers'
import { workflowEngine } from '@/lib/services/workflowEngine'
import { revalidatePath } from 'next/cache'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:events')

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'all'
    const typeFilter = searchParams.get('type') || 'all'


    let query = supabase
      .from('events')
      .select(`
        *,
        accounts!events_account_id_fkey(name),
        contacts!events_contact_id_fkey(first_name, last_name),
        event_categories(id, name, slug, color, icon),
        event_types(id, name, slug, event_category_id),
        event_dates(
          id,
          event_date,
          start_time,
          end_time,
          location_id,
          notes,
          status,
          locations(id, name, address_line1, city, state)
        )
      `)
      .eq('tenant_id', dataSourceTenantId)
      .order('start_date', { ascending: true })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (typeFilter !== 'all') {
      // Support both old event_type TEXT field and new event_type_id
      // Try filtering by event_type_id first (if it's a UUID)
      if (typeFilter.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        query = query.eq('event_type_id', typeFilter)
      } else {
        // Fall back to old event_type TEXT field for backward compatibility
        query = query.eq('event_type', typeFilter)
      }
    }

    const { data, error } = await query

    if (error) {
      log.error({ error, tenantId: dataSourceTenantId }, 'Failed to fetch events')
      return NextResponse.json({ 
        error: 'Failed to fetch events', 
        details: error.message,
        code: error.code 
      }, { status: 500 })
    }


    // Fetch core task completion data for all events
    const eventIds = data?.map(e => e.id) || []
    let coreTasksStatus: Record<string, boolean> = {}
    let eventTaskCompletions: Record<string, any[]> = {}

    if (eventIds.length > 0) {
      const { data: coreTasksData, error: tasksError } = await supabase
        .from('event_core_task_completion')
        .select('event_id, core_task_template_id, is_completed, completed_at, completed_by')
        .in('event_id', eventIds)

      log.debug({ 
        eventCount: eventIds.length, 
        taskCompletionsFound: coreTasksData?.length || 0,
        error: tasksError 
      }, 'Core tasks query result')

      // Group completion data by event_id
      if (coreTasksData) {
        coreTasksData.forEach(task => {
          if (!eventTaskCompletions[task.event_id]) {
            eventTaskCompletions[task.event_id] = []
          }
          eventTaskCompletions[task.event_id].push(task)
        })

        // Determine if event is ready (all core tasks completed)
        const grouped = coreTasksData.reduce((acc, task) => {
          if (!acc[task.event_id]) {
            acc[task.event_id] = { total: 0, completed: 0 }
          }
          acc[task.event_id].total++
          if (task.is_completed) {
            acc[task.event_id].completed++
          }
          return acc
        }, {} as Record<string, { total: number; completed: number }>)

        Object.keys(grouped).forEach(eventId => {
          const status = grouped[eventId]
          coreTasksStatus[eventId] = status.total > 0 && status.total === status.completed
        })
      }
    }

    // Fetch staff assignments separately to avoid breaking the main query
    let staffAssignmentsByEvent: Record<string, any[]> = {}
    if (eventIds.length > 0) {
      try {
        const { data: staffData, error: staffError } = await supabase
          .from('event_staff_assignments')
          .select(`
            id, user_id, event_id, event_date_id, staff_role_id, notes, start_time, end_time,
            users!event_staff_assignments_user_id_fkey (
              id,
              first_name,
              last_name
            ),
            staff_roles!event_staff_assignments_staff_role_id_fkey (
              id,
              name,
              type,
              sort_order
            )
          `)
          .eq('tenant_id', dataSourceTenantId)
          .in('event_id', eventIds)

        if (staffError) {
          log.error({ error: staffError }, 'Failed to fetch staff assignments')
        }

        if (!staffError && staffData) {
          const uniqueUserIds = [...new Set(staffData.map(a => a.user_id))]
          log.debug({ 
            totalAssignments: staffData.length, 
            uniqueUserCount: uniqueUserIds.length 
          }, 'Staff assignments fetched')
          
          staffData.forEach(assignment => {
            if (!staffAssignmentsByEvent[assignment.event_id]) {
              staffAssignmentsByEvent[assignment.event_id] = []
            }
            staffAssignmentsByEvent[assignment.event_id].push(assignment)
          })
        } else if (staffData?.length === 0) {
          log.debug({}, 'No staff assignments found in database')
        }
      } catch (staffErr) {
        log.warn({ error: staffErr }, 'Could not fetch staff assignments')
        // Continue without staff assignments rather than failing
      }
    }

    // Transform the data to include account_name, contact_name, core_tasks_ready, task_completions, and staff assignments
    const transformedData = data?.map(event => ({
      ...event,
      account_name: event.accounts?.name || null,
      contact_name: event.contacts ?
        `${event.contacts.first_name} ${event.contacts.last_name}`.trim() : null,
      core_tasks_ready: coreTasksStatus[event.id] || false,
      task_completions: eventTaskCompletions[event.id] || [],
      event_staff_assignments: staffAssignmentsByEvent[event.id] || []
    })) || []

    const response = NextResponse.json(transformedData)
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30')
    
    return response
  } catch (error) {
    log.error({ error }, 'Unexpected error in GET /api/events')
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context

  try {
    const body = await request.json()
    log.debug({ body }, 'Creating event')

    // Destructure and validate
    const {
      title,
      description,
      event_category_id,
      event_type_id,
      event_type,
      date_type,
      start_date,
      end_date,
      location,
      location_id,
      account_id,
      contact_id,
      opportunity_id,
      status,
      event_dates
    } = body

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!event_dates || event_dates.length === 0) {
      return NextResponse.json({ error: 'At least one event date is required' }, { status: 400 })
    }

    if (!event_category_id || !event_type_id) {
      return NextResponse.json({ error: 'Event category and type are required' }, { status: 400 })
    }

    // Build insert data with only fields that exist in the events table
    const insertData = {
      tenant_id: dataSourceTenantId,
      title,
      description: description || null,
      event_category_id,
      event_type_id,
      event_type: event_type || 'other',
      date_type: date_type || 'single_day',
      start_date: start_date || event_dates[0]?.event_date,
      end_date: end_date || null,
      location: location || null,
      location_id: location_id || null,
      account_id: account_id || null,
      contact_id: contact_id || null,
      opportunity_id: opportunity_id || null,
      status: status || 'scheduled'
    }

    log.debug({ insertData }, 'Inserting event')

    // Create the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert(insertData)
      .select(`
        *,
        event_categories(id, name, slug, color, icon),
        event_types(id, name, slug)
      `)
      .single()

    if (eventError) {
      log.error({ error: eventError }, 'Failed to create event')
      return NextResponse.json({
        error: 'Failed to create event',
        details: eventError.message
      }, { status: 500 })
    }

    // Insert event_dates
    if (event_dates && event_dates.length > 0) {
      const eventDatesInsert = event_dates.map((date: any) => ({
        tenant_id: dataSourceTenantId,
        event_id: event.id,
        event_date: date.event_date,
        start_time: date.start_time || null,
        end_time: date.end_time || null,
        location_id: date.location_id || null,
        notes: date.notes || null,
        status: 'scheduled'
      }))

      const { error: eventDatesError } = await supabase
        .from('event_dates')
        .insert(eventDatesInsert)

      if (eventDatesError) {
        log.error({ error: eventDatesError }, 'Failed to create event dates')
      }
    }

    // Auto-create design items for auto-added types
    if (event.start_date && dataSourceTenantId) {
      try {
        const designItems = await createAutoDesignItems(event.id, event.start_date, dataSourceTenantId, supabase)
        log.info({ eventId: event.id, designItemCount: designItems.length }, 'Auto-created design items')
      } catch (error) {
        log.error({ error, eventId: event.id }, 'Failed to auto-create design items')
      }
    }

    // Execute workflows for this event type (automated task creation)
    if (event.event_type_id && dataSourceTenantId) {
      try {
        log.debug({ eventTypeId: event.event_type_id }, 'Executing workflows for event type')
        const workflowResults = await workflowEngine.executeWorkflowsForEvent({
          eventId: event.id,
          eventTypeId: event.event_type_id,
          tenantId: context.tenantId,
          dataSourceTenantId,
          supabase,
          userId: session.user.id,
        })
        
        if (workflowResults.length > 0) {
          const totalTasks = workflowResults.reduce((sum, result) => sum + result.createdTaskIds.length, 0)
          log.info({ 
            workflowCount: workflowResults.length, 
            taskCount: totalTasks 
          }, 'Workflows executed successfully')
        } else {
          log.debug({ eventTypeId: event.event_type_id }, 'No active workflows found')
        }
      } catch (error) {
        log.error({ error }, 'Failed to execute workflows')
      }
    }

    // Revalidate the events list page to show new event immediately
    const tenantSubdomain = session.user.tenantSubdomain || 'default'
    revalidatePath(`/${tenantSubdomain}/events`)

    log.info({ eventId: event.id, title: event.title }, 'Event created successfully')
    return NextResponse.json({ event }, { status: 201 })
  } catch (error: any) {
    log.error({ error }, 'Unexpected error creating event')
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}
