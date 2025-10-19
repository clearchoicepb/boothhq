import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const eventId = params.id

    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        accounts!events_account_id_fkey(id, name, email, phone),
        contacts!events_contact_id_fkey(id, first_name, last_name, email, phone),
        opportunities!events_opportunity_id_fkey(name),
        event_categories(id, name, slug, color, icon),
        event_types(id, name, slug),
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
      .eq('id', eventId)
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (error) {
      console.error('Error fetching event:', error)
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Transform the data to include account_name, contact_name, opportunity_name, and category/type info
    const transformedData = {
      ...data,
      account_name: data.accounts?.name || null,
      contact_name: data.contacts ?
        `${data.contacts.first_name} ${data.contacts.last_name}`.trim() : null,
      opportunity_name: data.opportunities?.name || null,
      event_category: data.event_categories || null,
      event_type: data.event_types || null
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const eventId = params.id
    const body = await request.json()
    const supabase = createServerSupabaseClient()

    console.log('Update event request body:', JSON.stringify(body, null, 2))

    // Extract event_dates and other non-table fields for separate handling
    const {
      event_dates,
      account_name,
      contact_name,
      opportunity_name,
      event_category,
      event_type: eventTypeObj,
      accounts,
      contacts,
      opportunities,
      event_categories,
      event_types,
      ...eventData
    } = body

    // Convert empty strings to null for UUID fields
    const cleanedEventData = Object.entries(eventData).reduce((acc, [key, value]) => {
      // If the value is an empty string and the field name suggests it's an ID, convert to null
      if (value === '' && (key.includes('_id') || key === 'id')) {
        acc[key] = null
      } else {
        acc[key] = value
      }
      return acc
    }, {} as Record<string, any>)

    console.log('Event data after filtering:', JSON.stringify(cleanedEventData, null, 2))

    // Update the event
    const { data, error } = await supabase
      .from('events')
      .update(cleanedEventData)
      .eq('id', eventId)
      .eq('tenant_id', session.user.tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating event:', error)
      return NextResponse.json({ error: 'Failed to update event', details: error }, { status: 500 })
    }

    // Handle event_dates if provided
    if (event_dates && Array.isArray(event_dates)) {
      // Delete existing event dates
      await supabase
        .from('event_dates')
        .delete()
        .eq('event_id', eventId)
        .eq('tenant_id', session.user.tenantId)

      // Insert new event dates
      if (event_dates.length > 0) {
        const datesToInsert = event_dates
          .filter((date: any) => date.event_date) // Only insert dates that have an event_date
          .map((date: any) => ({
            tenant_id: session.user.tenantId,
            event_id: eventId,
            event_date: date.event_date,
            start_time: date.start_time || null,
            end_time: date.end_time || null,
            location_id: date.location_id || null,
            notes: date.notes || null,
            status: 'scheduled'
          }))

        if (datesToInsert.length > 0) {
          const { error: datesError } = await supabase
            .from('event_dates')
            .insert(datesToInsert)

          if (datesError) {
            console.error('Error updating event dates:', datesError)
          }
        }
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const eventId = params.id
    const supabase = createServerSupabaseClient()

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('tenant_id', session.user.tenantId)

    if (error) {
      console.error('Error deleting event:', error)
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}






