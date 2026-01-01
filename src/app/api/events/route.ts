import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { workflowEngine } from '@/lib/services/workflowEngine'
import { revalidatePath } from 'next/cache'
import { createLogger } from '@/lib/logger'
import { calculateBulkEventReadiness } from '@/lib/utils/event-readiness'
import type { TaskForReadiness, EventReadiness } from '@/lib/utils/event-readiness'

const log = createLogger('api:events')

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)
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
          setup_time,
          location_id,
          notes,
          status,
          locations(id, name, address_line1, city, state)
        )
      `)
      .eq('tenant_id', dataSourceTenantId)
      .order('start_date', { ascending: true })

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


    // Fetch tasks for all events (from the unified tasks table)
    // A task is completed if status = 'completed' OR 'approved'
    const eventIds = data?.map(e => e.id) || []
    let eventReadiness: Record<string, EventReadiness> = {}
    let eventTasks: Record<string, TaskForReadiness[]> = {}

    if (eventIds.length > 0) {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status, entity_id, title, description, priority, due_date, assigned_to, completed_at')
        .eq('tenant_id', dataSourceTenantId)
        .eq('entity_type', 'event')
        .in('entity_id', eventIds)

      log.debug({
        eventCount: eventIds.length,
        tasksFound: tasksData?.length || 0,
        error: tasksError
      }, 'Tasks query result')

      if (tasksData) {
        // Group tasks by event_id
        tasksData.forEach(task => {
          if (task.entity_id) {
            if (!eventTasks[task.entity_id]) {
              eventTasks[task.entity_id] = []
            }
            eventTasks[task.entity_id].push(task as TaskForReadiness)
          }
        })

        // Calculate readiness using the new utility function
        eventReadiness = calculateBulkEventReadiness(
          tasksData as TaskForReadiness[],
          eventIds
        )
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
          if (staffData.length > 0) {
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
          } else {
            log.debug({}, 'No staff assignments found in database')
          }
        }
      } catch (staffErr) {
        log.warn({ error: staffErr }, 'Could not fetch staff assignments')
        // Continue without staff assignments rather than failing
      }
    }

    // Transform the data to include account_name, contact_name, readiness, and staff assignments
    const transformedData = data?.map(event => {
      const readiness = eventReadiness[event.id] || {
        total: 0,
        completed: 0,
        percentage: 0,
        isReady: false,
        hasTasks: false
      }

      return {
        ...event,
        account_name: event.accounts?.name || null,
        contact_name: event.contacts ?
          `${event.contacts.first_name} ${event.contacts.last_name}`.trim() : null,
        // New Tasks-based readiness
        tasks_ready: readiness.isReady,
        task_readiness: readiness,
        event_tasks: eventTasks[event.id] || [],
        // Keep legacy field for backward compatibility during transition
        core_tasks_ready: readiness.isReady,
        task_completions: [], // Empty - no longer using Core Tasks
        event_staff_assignments: staffAssignmentsByEvent[event.id] || []
      }
    }) || []

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
      opportunity_id: opportunity_id || null
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
        setup_time: date.setup_time || null,
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

    // Design items are now created through the unified task system via workflows
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
