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
    
    
    const config = getEntityConfig(entity)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }


    const { searchParams } = new URL(request.url)
    
    // Extract filters and pagination params
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || undefined
    const stage = searchParams.get('stage') || undefined
    const ownerId = searchParams.get('owner_id') || undefined
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 25
    const pipelineView = searchParams.get('pipelineView') === 'true'

    const supabase = createServerSupabaseClient()

    // Build the count query first
    let countQuery = supabase
      .from(config.table)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', session.user.tenantId)

    // Build the data query
    let query = supabase
      .from(config.table)
      .select('*')
      .eq('tenant_id', session.user.tenantId)

    // Apply search filter to both queries
    if (search && config.searchFields.length > 0) {
      const searchConditions = config.searchFields.map(field =>
        `${field}.ilike.%${search}%`
      ).join(',')
      query = query.or(searchConditions)
      countQuery = countQuery.or(searchConditions)
    }

    // Apply status filter to both queries
    if (status && status !== 'all') {
      query = query.eq('status', status)
      countQuery = countQuery.eq('status', status)
    }

    // Apply stage filter for opportunities (to both queries)
    if (stage && stage !== 'all' && entity === 'opportunities') {
      query = query.eq('stage', stage)
      countQuery = countQuery.eq('stage', stage)
    }

    // Apply owner filter for opportunities (to both queries)
    if (ownerId && ownerId !== 'all' && entity === 'opportunities') {
      if (ownerId === 'unassigned') {
        query = query.is('owner_id', null)
        countQuery = countQuery.is('owner_id', null)
      } else {
        query = query.eq('owner_id', ownerId)
        countQuery = countQuery.eq('owner_id', ownerId)
      }
    }

    // For pipeline view, exclude closed opportunities UNLESS specifically filtering for them
    if (pipelineView && entity === 'opportunities' && stage !== 'closed_won' && stage !== 'closed_lost') {
      query = query.not('stage', 'in', '(closed_won,closed_lost)')
      countQuery = countQuery.not('stage', 'in', '(closed_won,closed_lost)')
    }

    // Apply ordering
    const orderBy = config.defaultOrder?.field || 'created_at'
    const orderDirection = config.defaultOrder?.direction || 'desc'
    query = query.order(orderBy, { ascending: orderDirection === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    // Execute both queries in parallel
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery
    ])

    if (error || countError) {
      console.error(`Error fetching ${entity}:`, error || countError)
      return NextResponse.json({
        error: `Failed to fetch ${entity}`,
        details: (error || countError)?.message
      }, { status: 500 })
    }

    // Transform response if needed
    const transformedData = config.transformResponse ?
      config.transformResponse(data) : data

    // Calculate pagination metadata
    const total = count || 0
    const totalPages = Math.ceil(total / limit)
    const hasMore = page < totalPages

    const response = NextResponse.json({
      data: transformedData || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore
      }
    })
    
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

    // Validate the transformed data (isUpdate = false for POST requests)
    const validation = validateEntityData(entity, transformedBody, false)
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
