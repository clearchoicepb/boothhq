import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { createAutoDesignItems } from '@/lib/design-helpers'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      console.error('No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.tenantId) {
      console.error('No tenantId in session:', session.user)
      return NextResponse.json({ error: 'No tenant ID found' }, { status: 400 })
    }
    
    const supabase = createServerSupabaseClient()
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
      .eq('tenant_id', session.user.tenantId)
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
      console.error('Error fetching events:', error)
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

      console.log('=== EVENTS API DEBUG ===')
      console.log('Event IDs queried:', eventIds.length)
      console.log('Task completions found:', coreTasksData?.length || 0)
      console.log('Tasks error:', tasksError)
      if (coreTasksData && coreTasksData.length > 0) {
        console.log('Sample task completion:', JSON.stringify(coreTasksData[0], null, 2))
      }
      console.log('=======================')

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

    // Transform the data to include account_name, contact_name, core_tasks_ready, and task_completions
    const transformedData = data?.map(event => ({
      ...event,
      account_name: event.accounts?.name || null,
      contact_name: event.contacts ?
        `${event.contacts.first_name} ${event.contacts.last_name}`.trim() : null,
      core_tasks_ready: coreTasksStatus[event.id] || false,
      task_completions: eventTaskCompletions[event.id] || []
    })) || []

    const response = NextResponse.json(transformedData)
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    
    return response
  } catch (error) {
    console.error('Error in events API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    console.log('Creating event with body:', body)

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

    const supabase = createServerSupabaseClient()

    // Build insert data with only fields that exist in the events table
    const insertData = {
      tenant_id: session.user.tenantId,
      title,
      description: description || null,
      event_category_id,
      event_type_id,
      event_type: event_type || 'other',
      date_type: date_type || 'single_day',
      start_date: start_date || event_dates[0]?.event_date,
      end_date: end_date || null,
      location: location || null,
      account_id: account_id || null,
      contact_id: contact_id || null,
      opportunity_id: opportunity_id || null,
      status: status || 'scheduled'
    }

    console.log('Inserting event with data:', insertData)

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
      console.error('Error creating event:', eventError)
      return NextResponse.json({
        error: 'Failed to create event',
        details: eventError.message
      }, { status: 500 })
    }

    // Insert event_dates
    if (event_dates && event_dates.length > 0) {
      const eventDatesInsert = event_dates.map((date: any) => ({
        tenant_id: session.user.tenantId,
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
        console.error('Error creating event dates:', eventDatesError)
        // Don't fail the entire request, but log the error
        // The event was created successfully, so we can still return it
      }
    }

    // Auto-create design items for auto-added types
    if (event.start_date && session.user.tenantId) {
      try {
        const designItems = await createAutoDesignItems(event.id, event.start_date, session.user.tenantId)
        console.log(`Created ${designItems.length} auto-added design items for event ${event.id}`)
      } catch (error) {
        console.error('Error auto-creating design items:', error)
        // Don't fail the entire request, just log the error
      }
    }

    return NextResponse.json({ event }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating event:', error)
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}




