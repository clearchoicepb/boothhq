import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/inventory-items - Fetch all inventory items for tenant
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    const category = searchParams.get('category')
    const trackingType = searchParams.get('tracking_type')
    const assignedToType = searchParams.get('assigned_to_type')
    const assignedToId = searchParams.get('assigned_to_id')

    let query = supabase
      .from('inventory_items')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('item_name', { ascending: true })

    if (category) {
      query = query.eq('item_category', category)
    }

    if (trackingType) {
      query = query.eq('tracking_type', trackingType)
    }

    if (assignedToType) {
      query = query.eq('assigned_to_type', assignedToType)
    }

    if (assignedToId) {
      query = query.eq('assigned_to_id', assignedToId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch inventory items',
        details: error.message,
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/inventory-items - Create new inventory item
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate tracking type requirements
    if (body.tracking_type === 'serial_number' && !body.serial_number) {
      return NextResponse.json({
        error: 'Serial number is required when tracking type is serial_number',
      }, { status: 400 })
    }

    if (body.tracking_type === 'total_quantity' && (!body.total_quantity || body.total_quantity <= 0)) {
      return NextResponse.json({
        error: 'Total quantity must be greater than 0 when tracking type is total_quantity',
      }, { status: 400 })
    }

    const itemData = {
      ...body,
      tenant_id: dataSourceTenantId,
      created_by: session.user.id
    }

    const { data, error } = await supabase
      .from('inventory_items')
      .insert(itemData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to create inventory item',
        details: error.message,
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
