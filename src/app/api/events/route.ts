import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

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
      query = query.eq('event_type', typeFilter)
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


    // Fetch core task completion status for all events
    const eventIds = data?.map(e => e.id) || []
    let coreTasksStatus: Record<string, boolean> = {}

    if (eventIds.length > 0) {
      const { data: coreTasksData } = await supabase
        .from('event_core_task_completion')
        .select('event_id, is_completed')
        .in('event_id', eventIds)

      // Group by event_id and check if all are completed
      if (coreTasksData) {
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

        // Determine if event is ready (all core tasks completed)
        Object.keys(grouped).forEach(eventId => {
          const status = grouped[eventId]
          coreTasksStatus[eventId] = status.total > 0 && status.total === status.completed
        })
      }
    }

    // Transform the data to include account_name, contact_name, and core_tasks_ready
    const transformedData = data?.map(event => ({
      ...event,
      account_name: event.accounts?.name || null,
      contact_name: event.contacts ?
        `${event.contacts.first_name} ${event.contacts.last_name}`.trim() : null,
      core_tasks_ready: coreTasksStatus[event.id] || false
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
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const supabase = createServerSupabaseClient()

    // Extract event_dates from the request body
    const { event_dates, ...eventData } = body

    // Create the event first
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        ...eventData,
        tenant_id: session.user.tenantId
      })
      .select()
      .single()

    if (eventError) {
      console.error('Error creating event:', eventError)
      return NextResponse.json({ error: 'Failed to create event', details: eventError.message }, { status: 500 })
    }

    // Create event dates if provided
    if (event_dates && event_dates.length > 0) {
      const eventDatesData = event_dates.map((date: any) => ({
        ...date,
        event_id: event.id,
        tenant_id: session.user.tenantId
      }))

      const { error: datesError } = await supabase
        .from('event_dates')
        .insert(eventDatesData)

      if (datesError) {
        console.error('Error creating event dates:', datesError)
        // Don't fail the entire request, just log the error
      }
    }

    const response = NextResponse.json(event)
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    
    return response
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




