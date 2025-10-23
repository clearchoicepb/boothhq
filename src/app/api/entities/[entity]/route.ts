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
        .eq('tenant_id', session.user.tenantId)
    } else {
      query = supabase
        .from(config.table)
        .select('*')
        .eq('tenant_id', session.user.tenantId)
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
      config.transformResponse(data, searchParams) : data

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

    // Extract event_dates for opportunities before transformation
    const { event_dates, ...bodyWithoutEventDates } = body

    // Check for duplicate email for contacts (case-insensitive)
    if (entity === 'contacts' && body.email && body.email.trim()) {
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .eq('tenant_id', session.user.tenantId)
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
      tenant_id: session.user.tenantId
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
      console.error(`Error creating ${entity}:`, error)
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
          tenant_id: session.user.tenantId,
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
          console.error('Error creating event dates:', datesError)
          // Don't fail the entire request, just log the error
        }
      }
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
