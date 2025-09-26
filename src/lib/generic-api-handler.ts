import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { getEntityConfig, validateEntityData, FilterOptions } from './api-entities'

export class GenericApiHandler {
  private entity: string
  private config: any

  constructor(entity: string) {
    this.entity = entity
    this.config = getEntityConfig(entity)
  }

  async handleGet(request: NextRequest) {
    try {
      // Try to get session with proper request context
      const session = await getServerSession({
        ...authOptions,
        req: {
          headers: request.headers,
          url: request.url,
          method: request.method,
        } as any
      })
      
      console.log(`[${this.entity}] GET request - Session:`, session ? 'authenticated' : 'not authenticated')
      
      if (!session?.user) {
        console.log(`[${this.entity}] GET request - No session found`)
        console.log(`[${this.entity}] Request headers:`, Object.fromEntries(request.headers.entries()))
        return NextResponse.json({ error: 'Unauthorized - No session found' }, { status: 401 })
      }

      console.log(`[${this.entity}] GET request - Tenant ID:`, session.user.tenantId)

      const { searchParams } = new URL(request.url)
      const filters = this.extractFilters(searchParams)
      
      const supabase = createServerSupabaseClient()

      // Build the query
      let query = supabase
        .from(this.config.table)
        .select(this.buildSelectQuery())
        .eq('tenant_id', session.user.tenantId)

      // Apply filters
      query = this.applyFilters(query, filters)

      // Apply ordering
      query = this.applyOrdering(query, filters)

      // Apply pagination
      query = this.applyPagination(query, filters)

      const { data, error } = await query

      if (error) {
        console.error(`Error fetching ${this.entity}:`, error)
        return NextResponse.json({ 
          error: `Failed to fetch ${this.entity}`,
          details: error.message 
        }, { status: 500 })
      }

      // Transform response if needed
      const transformedData = this.config.transformResponse ? 
        this.config.transformResponse(data) : data

      const response = NextResponse.json(transformedData || [])
      
      // Add caching headers
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
      
      return response
    } catch (error) {
      console.error(`Error in ${this.entity} GET:`, error)
      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  }

  async handlePost(request: NextRequest) {
    try {
      const session = await getServerSession({ ...authOptions, req: request })
      
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

      // Validate data
      const validation = validateEntityData(this.entity, body)
      if (!validation.isValid) {
        return NextResponse.json({ 
          error: 'Validation failed',
          details: validation.errors 
        }, { status: 400 })
      }

      // Transform request data if needed
      const transformedData = this.config.transformRequest ? 
        this.config.transformRequest(body) : body

      const supabase = createServerSupabaseClient()

      const { data, error } = await supabase
        .from(this.config.table)
        .insert({
          ...transformedData,
          tenant_id: session.user.tenantId
        })
        .select()
        .single()

      if (error) {
        console.error(`Error creating ${this.entity}:`, error)
        return NextResponse.json({ 
          error: `Failed to create ${this.entity}`,
          details: error.message 
        }, { status: 500 })
      }

      const response = NextResponse.json(data)
      
      // Add caching headers
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
      
      return response
    } catch (error) {
      console.error(`Error in ${this.entity} POST:`, error)
      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  }

  async handlePut(request: NextRequest, id: string) {
    try {
      const session = await getServerSession({ ...authOptions, req: request })
      
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

      // Validate data (isUpdate = true for PUT requests)
      const validation = validateEntityData(this.entity, body, true)
      if (!validation.isValid) {
        console.error(`[${this.entity}] Validation failed:`, validation.errors)
        return NextResponse.json({ 
          error: 'Validation failed',
          details: validation.errors 
        }, { status: 400 })
      }

      // Transform request data if needed
      const transformedData = this.config.transformRequest ? 
        this.config.transformRequest(body) : body


      const supabase = createServerSupabaseClient()

      const { data, error } = await supabase
        .from(this.config.table)
        .update(transformedData)
        .eq('id', id)
        .eq('tenant_id', session.user.tenantId)
        .select()
        .single()

      if (error) {
        console.error(`Error updating ${this.entity}:`, error)
        return NextResponse.json({ 
          error: `Failed to update ${this.entity}`,
          details: error.message 
        }, { status: 500 })
      }

      return NextResponse.json(data)
    } catch (error) {
      console.error(`Error in ${this.entity} PUT:`, error)
      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  }

  async handleDelete(request: NextRequest, id: string) {
    try {
      const session = await getServerSession({ ...authOptions, req: request })
      
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const supabase = createServerSupabaseClient()

      const { error } = await supabase
        .from(this.config.table)
        .delete()
        .eq('id', id)
        .eq('tenant_id', session.user.tenantId)

      if (error) {
        console.error(`Error deleting ${this.entity}:`, error)
        return NextResponse.json({ 
          error: `Failed to delete ${this.entity}`,
          details: error.message 
        }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error(`Error in ${this.entity} DELETE:`, error)
      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  }

  private extractFilters(searchParams: URLSearchParams): FilterOptions {
    return {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      sort_by: searchParams.get('sort_by') || undefined,
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'asc'
    }
  }

  private buildSelectQuery(): string {
    let select = '*'
    
    if (this.config.relations && this.config.relations.length > 0) {
      const relations = this.config.relations.map((relation: string) => {
        switch (relation) {
          case 'accounts':
            return 'accounts(id, name)'
          case 'contacts':
            return 'contacts(id, first_name, last_name)'
          case 'opportunities':
            return 'opportunities(id, name)'
          default:
            return `${relation}(id, name)`
        }
      })
      select = `*, ${relations.join(', ')}`
    }
    
    return select
  }

  private applyFilters(query: any, filters: FilterOptions) {
    // Search filter
    if (filters.search && this.config.searchFields.length > 0) {
      const searchConditions = this.config.searchFields.map(field => 
        `${field}.ilike.%${filters.search}%`
      ).join(',')
      query = query.or(searchConditions)
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    // Type filter
    if (filters.type && filters.type !== 'all') {
      query = query.eq('type', filters.type)
    }

    // Date filters
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to)
    }

    return query
  }

  private applyOrdering(query: any, filters: FilterOptions) {
    const orderBy = filters.sort_by || this.config.defaultOrder?.field || 'created_at'
    const orderDirection = filters.sort_order || this.config.defaultOrder?.direction || 'desc'
    
    return query.order(orderBy, { ascending: orderDirection === 'asc' })
  }

  private applyPagination(query: any, filters: FilterOptions) {
    const page = filters.page || 1
    const limit = filters.limit || 50
    const offset = (page - 1) * limit
    
    return query.range(offset, offset + limit - 1)
  }
}
