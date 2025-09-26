import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { getEntityConfig, validateEntityData } from '@/lib/api-entities'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params
  
  try {
    const session = await getServerSession(authOptions)
    
    console.log(`[${entity}] GET request - Session:`, session ? 'authenticated' : 'not authenticated')
    
    const config = getEntityConfig(entity)
    console.log(`[${entity}] Using search fields:`, config.searchFields)
    
    if (!session?.user) {
      console.log(`[${entity}] GET request - No session found`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[${entity}] GET request - Tenant ID:`, session.user.tenantId)

    const { searchParams } = new URL(request.url)
    
    // Extract filters
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    
    const supabase = createServerSupabaseClient()

    // Build the query
    let query = supabase
      .from(config.table)
      .select('*')
      .eq('tenant_id', session.user.tenantId)

    // Apply search filter
    if (search && config.searchFields.length > 0) {
      const searchConditions = config.searchFields.map(field => 
        `${field}.ilike.%${search}%`
      ).join(',')
      query = query.or(searchConditions)
    }

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Apply ordering
    const orderBy = config.defaultOrder?.field || 'created_at'
    const orderDirection = config.defaultOrder?.direction || 'desc'
    query = query.order(orderBy, { ascending: orderDirection === 'asc' })

    // Apply limit
    query = query.limit(limit)

    const { data, error } = await query

    if (error) {
      console.error(`Error fetching ${entity}:`, error)
      return NextResponse.json({ 
        error: `Failed to fetch ${entity}`,
        details: error.message 
      }, { status: 500 })
    }

    // Transform response if needed
    const transformedData = config.transformResponse ? 
      config.transformResponse(data) : data

    const response = NextResponse.json(transformedData || [])
    
    // Add caching headers
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    
    return response
  } catch (error) {
    console.error(`Error in ${entity} GET:`, error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error('Error parsing request body:', error)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const config = getEntityConfig(entity)
    const supabase = createServerSupabaseClient()

    // Transform request data if transformRequest function exists
    const transformedBody = config.transformRequest ? config.transformRequest(body) : body

    // Validate the transformed data
    const validation = validateEntityData(entity, transformedBody)
    if (!validation.isValid) {
      console.error(`Validation failed for ${entity}:`, validation.errors)
      return NextResponse.json({ 
        error: `Validation failed for ${entity}`,
        details: validation.errors 
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from(config.table)
      .insert({
        ...transformedBody,
        tenant_id: session.user.tenantId
      })
      .select()
      .single()

    if (error) {
      console.error(`Error creating ${entity}:`, error)
      return NextResponse.json({ 
        error: `Failed to create ${entity}`,
        details: error.message 
      }, { status: 500 })
    }

    const response = NextResponse.json(data)
    
    // Add caching headers
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    
    return response
  } catch (error) {
    console.error(`Error in ${entity} POST:`, error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
