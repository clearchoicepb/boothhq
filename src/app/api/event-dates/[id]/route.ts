import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'

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
    const eventDateId = params.id
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
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
      .eq('id', eventDateId)
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (error) {
      console.error('Error fetching event date:', error)
      return NextResponse.json({ error: 'Failed to fetch event date' }, { status: 500 })
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
    const eventDateId = params.id
    const body = await request.json()
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('event_dates')
      .update(body)
      .eq('id', eventDateId)
      .eq('tenant_id', session.user.tenantId)
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
      console.error('Error updating event date:', error)
      return NextResponse.json({ error: 'Failed to update event date', details: error.message }, { status: 500 })
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
    const eventDateId = params.id
    const supabase = createServerSupabaseClient()

    const { error } = await supabase
      .from('event_dates')
      .delete()
      .eq('id', eventDateId)
      .eq('tenant_id', session.user.tenantId)

    if (error) {
      console.error('Error deleting event date:', error)
      return NextResponse.json({ error: 'Failed to delete event date', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}










