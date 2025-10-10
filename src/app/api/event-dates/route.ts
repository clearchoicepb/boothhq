import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const opportunityId = searchParams.get('opportunity_id') || searchParams.get('opportunityId')
    const eventId = searchParams.get('event_id') || searchParams.get('eventId')
    const status = searchParams.get('status')
    
    const supabase = createServerSupabaseClient()
    
    let query = supabase
      .from('event_dates')
      .select(`
        *,
        locations (
          id,
          name,
          address_line1,
          city,
          state
        )
      `)
      .eq('tenant_id', session.user.tenantId)
      .order('event_date', { ascending: true })

    // Filter by opportunity or event
    if (opportunityId) {
      query = query.eq('opportunity_id', opportunityId)
    }
    
    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching event dates:', error)
      return NextResponse.json({ error: 'Failed to fetch event dates' }, { status: 500 })
    }

    const response = NextResponse.json(data)
    
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
    const supabase = createServerSupabaseClient()

    // Validate that either opportunity_id or event_id is provided, but not both
    if (!body.opportunity_id && !body.event_id) {
      return NextResponse.json({ error: 'Either opportunity_id or event_id must be provided' }, { status: 400 })
    }

    if (body.opportunity_id && body.event_id) {
      return NextResponse.json({ error: 'Cannot provide both opportunity_id and event_id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('event_dates')
      .insert({
        ...body,
        tenant_id: session.user.tenantId
      })
      .select(`
        *,
        locations (
          id,
          name,
          address_line1,
          city,
          state
        )
      `)
      .single()

    if (error) {
      console.error('Error creating event date:', error)
      return NextResponse.json({ error: 'Failed to create event date', details: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}















