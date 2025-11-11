import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/product-groups - Fetch all product groups for tenant
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    const { data, error } = await supabase
      .from('product_groups')
      .select(`
        *,
        product_group_items (
          id,
          inventory_item_id,
          date_added
        )
      `)
      .eq('tenant_id', dataSourceTenantId)
      .order('group_name', { ascending: true })

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch product groups',
        details: error.message,
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/product-groups - Create new product group
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Convert empty strings to NULL for assignment fields (database constraint requires NULL, not '')
    if (body.assigned_to_type === '') {
      body.assigned_to_type = null
    }
    if (body.assigned_to_id === '') {
      body.assigned_to_id = null
    }

    // Validate that assigned_to_id is provided
    if (!body.assigned_to_id || !body.assigned_to_type) {
      return NextResponse.json({
        error: 'Product groups must be assigned to a user or physical address',
      }, { status: 400 })
    }

    const groupData = {
      ...body,
      tenant_id: dataSourceTenantId
    }

    const { data, error } = await supabase
      .from('product_groups')
      .insert(groupData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to create product group',
        details: error.message,
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
