import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET - List equipment categories with filters
 * Query params: enabled, category_type, is_consumable, sort_by, sort_order
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    // Parse filters
    const enabled = searchParams.get('enabled')
    const categoryType = searchParams.get('category_type')
    const isConsumable = searchParams.get('is_consumable')
    const sortBy = searchParams.get('sort_by') || 'sort_order'
    const sortOrder = searchParams.get('sort_order') || 'asc'

    // Build query
    let query = supabase
      .from('equipment_categories')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)

    // Apply filters
    if (enabled !== null) {
      query = query.eq('enabled', enabled === 'true')
    }

    if (categoryType) {
      query = query.eq('category_type', categoryType)
    }

    if (isConsumable !== null) {
      query = query.eq('is_consumable', isConsumable === 'true')
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy as any, { ascending })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching equipment categories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch equipment categories', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST - Create new equipment category
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const body = await request.json()

    // Validation
    if (!body.name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    // Check for consumable fields
    if (body.is_consumable) {
      if (!body.estimated_consumption_per_event || !body.unit_of_measure) {
        return NextResponse.json(
          { error: 'Consumable categories require estimated_consumption_per_event and unit_of_measure' },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from('equipment_categories')
      .insert({
        ...body,
        tenant_id: dataSourceTenantId,
        created_by: session?.user?.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating equipment category:', error)

      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A category with this name already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create equipment category', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}






