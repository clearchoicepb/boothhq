import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

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
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

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

    // Disable caching to ensure fresh data after updates
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')

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
    console.log('=== EVENT DATE UPDATE API START ===')
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const eventDateId = params.id
    const body = await request.json()
    console.log('[Event Date API] Received body:', JSON.stringify(body, null, 2))
    
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    // Sanitize UUID fields: convert empty strings to null
    const sanitizedBody = {
      ...body,
      location_id: body.location_id === '' ? null : body.location_id,
    }
    console.log('[Event Date API] Sanitized body:', JSON.stringify(sanitizedBody, null, 2))

    const { data, error } = await supabase
      .from('event_dates')
      .update(sanitizedBody)
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
      console.error('[Event Date API] Supabase error:', JSON.stringify(error, null, 2))
      return NextResponse.json({ 
        error: 'Failed to update event date', 
        details: error.message,
        code: error.code,
        hint: error.hint 
      }, { status: 500 })
    }

    console.log('[Event Date API] Update successful')
    console.log('=== EVENT DATE UPDATE API END ===')
    
    const response = NextResponse.json(data)
    // Disable caching to ensure fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return response
  } catch (error: any) {
    console.error('[Event Date API] Caught exception:', error)
    console.error('[Event Date API] Error stack:', error.stack)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 })
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
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

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















