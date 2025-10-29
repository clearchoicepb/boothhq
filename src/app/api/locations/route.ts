import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const isOneTime = searchParams.get('isOneTime')
    
    const supabase = await getTenantDatabaseClient(session.user.tenantId)
    
    let query = supabase
      .from('locations')
      .select('*')
      .eq('tenant_id', session.user.tenantId)
      .order('name', { ascending: true })

    // Filter by search term if provided
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    // Filter by one-time status if provided
    if (isOneTime !== null) {
      query = query.eq('is_one_time', isOneTime === 'true')
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching locations:', error)
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }

    const response = NextResponse.json(data)
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    
    return response
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== LOCATION CREATE API START ===')

    const session = await getServerSession(authOptions)
    console.log('[Locations API] Session user:', session?.user ? {
      id: session.user.id,
      email: session.user.email,
      tenantId: session.user.tenantId
    } : 'No session')

    if (!session?.user) {
      console.error('[Locations API] Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[Locations API] Request body:', JSON.stringify(body, null, 2))

    console.log('[Locations API] Getting tenant database client for tenant:', session.user.tenantId)
    const supabase = await getTenantDatabaseClient(session.user.tenantId)
    console.log('[Locations API] Tenant database client created successfully')

    const locationData = {
      ...body,
      tenant_id: session.user.tenantId
    }
    console.log('[Locations API] Inserting location data:', JSON.stringify(locationData, null, 2))

    const { data, error } = await supabase
      .from('locations')
      .insert(locationData)
      .select()
      .single()

    if (error) {
      console.error('[Locations API] Database error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json({
        error: 'Failed to create location',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    console.log('[Locations API] Location created successfully:', {
      id: data.id,
      name: data.name,
      tenant_id: data.tenant_id
    })
    console.log('=== LOCATION CREATE API END (SUCCESS) ===')

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[Locations API] Unexpected error:', {
      message: error.message,
      stack: error.stack
    })
    console.log('=== LOCATION CREATE API END (ERROR) ===')
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}















