import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const stageFilter = searchParams.get('stage') || 'all'

    let query = supabase
      .from('opportunities')
      .select(`
        *,
        accounts!opportunities_account_id_fkey(name, account_type),
        contacts!opportunities_contact_id_fkey(first_name, last_name)
      `)
      .eq('tenant_id', session.user.tenantId)
      .order('created_at', { ascending: false })

    if (stageFilter !== 'all') {
      query = query.eq('stage', stageFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching opportunities:', error)
      return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 })
    }

    // Transform the data to include account_name, contact_name, and account_type
    const transformedData = data?.map(opportunity => ({
      ...opportunity,
      account_name: opportunity.accounts?.name || null,
      account_type: opportunity.accounts?.account_type || null,
      contact_name: opportunity.contacts ? 
        `${opportunity.contacts.first_name} ${opportunity.contacts.last_name}`.trim() : null
    })) || []

    const response = NextResponse.json(transformedData)
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    
    return response
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Opportunity creation request:', body)
    const supabase = createServerSupabaseClient()

    // Extract event_dates from the request body
    const { event_dates, ...opportunityData } = body

    // Clean up empty date fields that would cause database errors
    const cleanedOpportunityData = { ...opportunityData }
    
    // Convert empty string dates to null
    if (cleanedOpportunityData.expected_close_date === '') {
      cleanedOpportunityData.expected_close_date = null
    }
    if (cleanedOpportunityData.actual_close_date === '') {
      cleanedOpportunityData.actual_close_date = null
    }
    if (cleanedOpportunityData.event_date === '') {
      cleanedOpportunityData.event_date = null
    }
    if (cleanedOpportunityData.initial_date === '') {
      cleanedOpportunityData.initial_date = null
    }
    if (cleanedOpportunityData.final_date === '') {
      cleanedOpportunityData.final_date = null
    }

    // Fix date_type values to match database constraints
    if (cleanedOpportunityData.date_type === 'single_day') {
      cleanedOpportunityData.date_type = 'single'
      // For single day, set event_date from first event_dates entry if available
      if (event_dates && event_dates.length > 0 && event_dates[0].event_date) {
        cleanedOpportunityData.event_date = event_dates[0].event_date
      }
      // Clear other date fields
      cleanedOpportunityData.initial_date = null
      cleanedOpportunityData.final_date = null
    } else if (cleanedOpportunityData.date_type === 'same_location_sequential' || 
               cleanedOpportunityData.date_type === 'same_location_non_sequential' || 
               cleanedOpportunityData.date_type === 'multiple_locations') {
      cleanedOpportunityData.date_type = 'multiple'
      // For multiple days, set initial_date and final_date from event_dates
      if (event_dates && event_dates.length > 0) {
        const sortedDates = event_dates
          .filter(d => d.event_date)
          .map(d => d.event_date)
          .sort()
        if (sortedDates.length > 0) {
          cleanedOpportunityData.initial_date = sortedDates[0]
          cleanedOpportunityData.final_date = sortedDates[sortedDates.length - 1]
        }
      }
      // Clear event_date for multiple day events
      cleanedOpportunityData.event_date = null
    }

    // Create the opportunity first
    console.log('Creating opportunity with cleaned data:', cleanedOpportunityData)
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .insert({
        ...cleanedOpportunityData,
        tenant_id: session.user.tenantId
      })
      .select()
      .single()

    if (oppError) {
      console.error('Error creating opportunity:', oppError)
      return NextResponse.json({ error: 'Failed to create opportunity', details: oppError.message }, { status: 500 })
    }

    // Create event dates if provided
    if (event_dates && event_dates.length > 0) {
      const eventDatesData = event_dates.map((date: any) => ({
        ...date,
        opportunity_id: opportunity.id,
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

    console.log('Opportunity created successfully:', opportunity)
    const response = NextResponse.json(opportunity)
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    
    return response
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




