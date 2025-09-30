import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: opportunityId } = await params
    const body = await request.json()
    const { eventData, eventDates } = body

    const supabase = createServerSupabaseClient()

    // Start a transaction-like process
    try {
      // 1. Get the opportunity data
      const { data: opportunity, error: oppError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', opportunityId)
        .eq('tenant_id', session.user.tenantId)
        .single()

      if (oppError || !opportunity) {
        return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
      }

      // 2. Create the event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          tenant_id: session.user.tenantId,
          account_id: opportunity.account_id,
          contact_id: opportunity.contact_id,
          opportunity_id: opportunity.id,
          title: eventData.title || opportunity.name,
          description: eventData.description || opportunity.description,
          event_type: eventData.event_type || opportunity.event_type || 'corporate',
          start_date: eventData.start_date || opportunity.event_date || opportunity.initial_date || new Date().toISOString(),
          end_date: eventData.end_date || opportunity.final_date,
          location: eventData.location || null,
          status: eventData.status || 'scheduled',
          date_type: eventData.date_type || opportunity.date_type || 'single_day',
          mailing_address_line1: eventData.mailing_address_line1 || opportunity.mailing_address_line1,
          mailing_address_line2: eventData.mailing_address_line2 || opportunity.mailing_address_line2,
          mailing_city: eventData.mailing_city || opportunity.mailing_city,
          mailing_state: eventData.mailing_state || opportunity.mailing_state,
          mailing_postal_code: eventData.mailing_postal_code || opportunity.mailing_postal_code,
          mailing_country: eventData.mailing_country || opportunity.mailing_country || 'US',
          converted_from_opportunity_id: opportunity.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (eventError) {
        console.error('Error creating event:', eventError)
        return NextResponse.json({ 
          error: 'Failed to create event', 
          details: eventError.message 
        }, { status: 500 })
      }

      // 3. Create event dates if provided
      let createdEventDates = []
      if (eventDates && eventDates.length > 0) {
        const eventDatesData = eventDates.map((date: any) => ({
          ...date,
          event_id: event.id,
          tenant_id: session.user.tenantId
        }))

        const { data: datesData, error: datesError } = await supabase
          .from('event_dates')
          .insert(eventDatesData)
          .select()

        if (datesError) {
          console.error('Error creating event dates:', datesError)
          // Don't fail the entire request, just log the error
        } else {
          createdEventDates = datesData || []
        }
      }

      // 4. Update the opportunity to mark it as converted
      const { error: oppUpdateError } = await supabase
        .from('opportunities')
        .update({
          is_converted: true,
          converted_at: new Date().toISOString(),
          converted_event_id: event.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', opportunityId)
        .eq('tenant_id', session.user.tenantId)

      if (oppUpdateError) {
        console.error('Error updating opportunity:', oppUpdateError)
        return NextResponse.json({
          error: 'Failed to update opportunity',
          details: oppUpdateError.message
        }, { status: 500 })
      }

      const response = NextResponse.json({
        success: true,
        event,
        eventDates: createdEventDates,
        opportunity: {
          ...opportunity,
          is_converted: true,
          converted_at: new Date().toISOString(),
          converted_event_id: event.id
        }
      })

      // Add caching headers
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')

      return response

    } catch (error) {
      console.error('Error in conversion process:', error)
      return NextResponse.json({ 
        error: 'Conversion failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
