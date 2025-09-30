import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('opportunities')
      .select(`
        *,
        accounts!opportunities_account_id_fkey(name),
        contacts!opportunities_contact_id_fkey(first_name, last_name),
        event_dates(*)
      `)
      .eq('id', (await params).id)
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (error) {
      console.error('Error fetching opportunity:', error)
      return NextResponse.json({ error: 'Failed to fetch opportunity' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    }

    // Transform the data to include account_name and contact_name
    const transformedData = {
      ...data,
      account_name: data.accounts?.name || null,
      contact_name: data.contacts ? 
        `${data.contacts.first_name} ${data.contacts.last_name}`.trim() : null
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { event_dates, ...opportunityData } = body
    const supabase = createServerSupabaseClient()


    // Only allow fields that exist in the current database schema
    const allowedFields = [
      'name', 'description', 'amount', 'stage', 'probability',
      'expected_close_date', 'actual_close_date', 'account_id',
      'contact_id', 'lead_id', 'event_type', 'date_type',
      'event_date', 'initial_date', 'final_date',
      'is_converted', 'converted_at',
      'converted_event_id', 'converted_from_opportunity_id'
      // Not yet in schema: 'updated_by', 'created_by', 'mailing_address_*'
    ]

    const filteredData = Object.keys(opportunityData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = opportunityData[key]
        return obj
      }, {} as any)

    // Update the opportunity
    const updateData = {
      ...filteredData,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('opportunities')
      .update(updateData)
      .eq('id', (await params).id)
      .eq('tenant_id', session.user.tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating opportunity:', error)
      return NextResponse.json({ error: 'Failed to update opportunity', details: error.message }, { status: 500 })
    }

    // Handle event dates if provided
    if (event_dates && Array.isArray(event_dates)) {
      // Delete existing event dates for this opportunity
      const opportunityId = (await params).id
      await supabase
        .from('event_dates')
        .delete()
        .eq('opportunity_id', opportunityId)
        .eq('tenant_id', session.user.tenantId)

      // Insert new event dates
      if (event_dates.length > 0) {
        const eventDatesToInsert = event_dates.map((date: any) => ({
          tenant_id: session.user.tenantId,
          opportunity_id: opportunityId,
          location_id: date.location_id || null,
          event_date: date.event_date,
          start_time: date.start_time,
          end_time: date.end_time,
          notes: date.notes || null,
        }))

        const { error: eventDatesError } = await supabase
          .from('event_dates')
          .insert(eventDatesToInsert)

        if (eventDatesError) {
          console.error('Error updating event dates:', eventDatesError)
          // Don't fail the entire request, just log the error
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    const { error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', (await params).id)
      .eq('tenant_id', session.user.tenantId)

    if (error) {
      console.error('Error deleting opportunity:', error)
      return NextResponse.json({ error: 'Failed to delete opportunity' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}






