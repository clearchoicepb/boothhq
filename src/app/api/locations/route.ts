import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:locations')
export async function GET(request: NextRequest) {
  try {
    log.debug('=== LOCATION GET API START ===')
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const isOneTime = searchParams.get('isOneTime')

    // Get tenant connection info for debugging
    const { dataSourceManager } = await import('@/lib/data-sources')
    const connectionInfo = await dataSourceManager.getTenantConnectionInfo(dataSourceTenantId)
    log.debug('Database connection info:', {
      url: connectionInfo.url,
      region: connectionInfo.region,
      isCached: connectionInfo.isCached
    })

    let query = supabase
      .from('locations')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
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
      console.error('[Locations API GET] Database error:', {
        message: error.message,
        code: error.code,
        details: error.details
      })
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }

    log.debug('Successfully fetched', data?.length || 0, 'locations')
    log.debug('=== LOCATION GET API END (SUCCESS) ===')

    const response = NextResponse.json(data)

    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')

    return response
  } catch (error: any) {
    console.error('[Locations API GET] Unexpected error:', {
      message: error.message,
      stack: error.stack
    })
    log.debug('=== LOCATION GET API END (ERROR) ===')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    log.debug('=== LOCATION CREATE API START ===')

    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    log.debug('Session user:', session?.user ? {
      id: session.user.id,
      email: session.user.email,
      tenantId: dataSourceTenantId
    } : 'No session')

    if (!session?.user) {
      log.error('[Locations API] Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    log.debug('Request body:', JSON.stringify(body, null, 2))

    log.debug('Getting tenant database client for tenant:', dataSourceTenantId)

    // Get tenant connection info for debugging
    const { dataSourceManager } = await import('@/lib/data-sources')
    const connectionInfo = await dataSourceManager.getTenantConnectionInfo(dataSourceTenantId)
    log.debug('Database connection info:', {
      url: connectionInfo.url,
      region: connectionInfo.region,
      isCached: connectionInfo.isCached
    })

    log.debug('Tenant database client created successfully')

    const locationData = {
      ...body,
      tenant_id: dataSourceTenantId
    }
    log.debug('Inserting location data:', JSON.stringify(locationData, null, 2))
    log.debug('About to execute INSERT query on locations table...')

    const insertResult = await supabase
      .from('locations')
      .insert(locationData)
      .select()
      .single()

    log.debug('INSERT query completed')
    log.debug('Insert result:', {
      hasData: !!insertResult.data,
      hasError: !!insertResult.error,
      dataId: insertResult.data?.id,
      errorCode: insertResult.error?.code
    })

    if (insertResult.error) {
      console.error('[Locations API] Database INSERT failed:', {
        message: insertResult.error.message,
        code: insertResult.error.code,
        details: insertResult.error.details,
        hint: insertResult.error.hint
      })
      return NextResponse.json({
        error: 'Failed to create location',
        details: insertResult.error.message,
        code: insertResult.error.code
      }, { status: 500 })
    }

    if (!insertResult.data) {
      log.error('[Locations API] INSERT succeeded but returned no data!')
      return NextResponse.json({
        error: 'Location created but no data returned',
        details: 'The database insert succeeded but did not return the created record'
      }, { status: 500 })
    }

    log.debug('Location created successfully:', {
      id: insertResult.data.id,
      name: insertResult.data.name,
      tenant_id: insertResult.data.tenant_id,
      address_line1: insertResult.data.address_line1,
      city: insertResult.data.city,
      state: insertResult.data.state
    })
    log.debug('Returning success response with data')
    log.debug('=== LOCATION CREATE API END (SUCCESS) ===')

    return NextResponse.json(insertResult.data)
  } catch (error: any) {
    console.error('[Locations API] Unexpected error:', {
      message: error.message,
      stack: error.stack
    })
    log.debug('=== LOCATION CREATE API END (ERROR) ===')
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
