import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { getEntityConfig, validateEntityData } from '@/lib/api-entities'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:entities')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params

  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const config = getEntityConfig(entity)
    const { searchParams } = new URL(request.url)

    // Extract filters and pagination params
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || undefined
    const stage = searchParams.get('stage') || undefined
    const ownerId = searchParams.get('owner_id') || undefined
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 25
    const pipelineView = searchParams.get('pipelineView') === 'true'

    // Build the count query first
    let countQuery = supabase
      .from(config.table)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', dataSourceTenantId)

    // Build the data query
    let query
    
    // Special handling for opportunities - include relations
    if (entity === 'opportunities') {
      query = supabase
        .from(config.table)
        .select(`
          *,
          accounts!opportunities_account_id_fkey(name, account_type),
          contacts!opportunities_contact_id_fkey(first_name, last_name),
          leads!opportunities_lead_id_fkey(first_name, last_name),
          event_dates(event_date, start_time, end_time, location_id, notes)
        `)
        .eq('tenant_id', dataSourceTenantId)
    } else {
      query = supabase
        .from(config.table)
        .select('*')
        .eq('tenant_id', dataSourceTenantId)
    }

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

    // Apply ordering
    const orderBy = config.defaultOrder?.field || 'created_at'
    const orderDirection = config.defaultOrder?.direction || 'desc'
    query = query.order(orderBy, { ascending: orderDirection === 'asc' })

    // Apply pagination - SKIP if pipeline view (need all opportunities for drag-and-drop)
    if (!pipelineView) {
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)
    }

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
      config.transformResponse(data, searchParams) : data

    // Calculate pagination metadata
    const total = count || 0
    const actualLimit = pipelineView ? total : limit // In pipeline view, limit = total
    const totalPages = pipelineView ? 1 : Math.ceil(total / limit)
    const hasMore = !pipelineView && page < totalPages

    const response = NextResponse.json({
      data: transformedData || [],
      pagination: {
        page: pipelineView ? 1 : page,
        limit: actualLimit,
        total,
        totalPages,
        hasMore
      }
    })
    
    // Add caching headers - 3 seconds for faster updates
    response.headers.set('Cache-Control', 'public, s-maxage=3, stale-while-revalidate=10')
    
    return response
  } catch (error) {
    log.error({ error }, 'Error in ${entity} GET')
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
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    let body
    try {
      body = await request.json()
    } catch (error) {
      log.error({ error }, 'Error parsing request body')
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const config = getEntityConfig(entity)
    // Extract event_dates for opportunities before transformation
    const { event_dates, ...bodyWithoutEventDates } = body

    // Check for duplicate email for contacts (case-insensitive)
    if (entity === 'contacts' && body.email && body.email.trim()) {
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .eq('tenant_id', dataSourceTenantId)
        .ilike('email', body.email.trim())
        .maybeSingle()
      
      if (existingContact) {
        return NextResponse.json({
          error: 'A contact with this email already exists',
          existingContact: {
            id: existingContact.id,
            name: `${existingContact.first_name} ${existingContact.last_name}`,
            email: existingContact.email
          }
        }, { status: 409 }) // 409 Conflict
      }
    }

    // Transform request data if transformRequest function exists
    const transformedBody = config.transformRequest ? config.transformRequest(bodyWithoutEventDates) : bodyWithoutEventDates

    // Validate the transformed data (isUpdate = false for POST requests)
    const validation = validateEntityData(entity, transformedBody, false)
    if (!validation.isValid) {
      console.error(`Validation failed for ${entity}:`, validation.errors)
      return NextResponse.json({ 
        error: `Validation failed for ${entity}`,
        details: validation.errors 
      }, { status: 400 })
    }

    // Auto-assign owner for opportunities if not specified
    const insertData = {
      ...transformedBody,
      tenant_id: dataSourceTenantId
    }
    
    if (entity === 'opportunities' && !insertData.owner_id && session.user.id) {
      insertData.owner_id = session.user.id
    }
    
    const { data, error } = await supabase
      .from(config.table)
      .insert(insertData)
      .select()
      .single()

    if (error) {
      log.error({ error }, 'Error creating ${entity}')
      return NextResponse.json({ 
        error: `Failed to create ${entity}`,
        details: error.message 
      }, { status: 500 })
    }

    // Handle event_dates for opportunities
    if (entity === 'opportunities' && event_dates && Array.isArray(event_dates) && event_dates.length > 0) {
      const eventDatesData = event_dates
        .filter((date: any) => date.event_date) // Only include dates with event_date filled
        .map((date: any) => ({
          tenant_id: dataSourceTenantId,
          opportunity_id: data.id,
          location_id: date.location_id || null,
          event_date: date.event_date,
          start_time: date.start_time || null,
          end_time: date.end_time || null,
          notes: date.notes || null,
        }))

      if (eventDatesData.length > 0) {
        const { error: datesError } = await supabase
          .from('event_dates')
          .insert(eventDatesData)

        if (datesError) {
          log.error({ datesError }, 'Error creating event dates')
          // Don't fail the entire request, just log the error
        }
      }
    }

    const response = NextResponse.json(data)
    
    // Add caching headers - 3 seconds for faster updates
    response.headers.set('Cache-Control', 'public, s-maxage=3, stale-while-revalidate=10')
    
    return response
  } catch (error) {
    log.error({ error }, 'Error in ${entity} POST')
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
