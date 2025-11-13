import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET - Get single equipment category by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = params

    const { data, error } = await supabase
      .from('equipment_categories')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }
      console.error('Error fetching equipment category:', error)
      return NextResponse.json(
        { error: 'Failed to fetch equipment category', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH - Update equipment category
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = params
    const body = await request.json()

    // Validate consumable fields if being updated
    if (body.is_consumable === true) {
      if (body.estimated_consumption_per_event === undefined || body.unit_of_measure === undefined) {
        // Check if existing record has these fields
        const { data: existing } = await supabase
          .from('equipment_categories')
          .select('estimated_consumption_per_event, unit_of_measure')
          .eq('id', id)
          .eq('tenant_id', dataSourceTenantId)
          .single()

        if (!existing?.estimated_consumption_per_event || !existing?.unit_of_measure) {
          if (!body.estimated_consumption_per_event || !body.unit_of_measure) {
            return NextResponse.json(
              { error: 'Consumable categories require estimated_consumption_per_event and unit_of_measure' },
              { status: 400 }
            )
          }
        }
      }
    }

    const { data, error } = await supabase
      .from('equipment_categories')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }

      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A category with this name already exists' },
          { status: 409 }
        )
      }

      console.error('Error updating equipment category:', error)
      return NextResponse.json(
        { error: 'Failed to update equipment category', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE - Delete equipment category
 * Cannot delete if items are assigned to this category
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = params

    // Check if any items are using this category
    const { count: itemCount } = await supabase
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', dataSourceTenantId)
      .eq('item_category', id)

    if (itemCount && itemCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${itemCount} items assigned to it` },
        { status: 409 }
      )
    }

    // Check if any consumables are using this category
    const { count: consumableCount } = await supabase
      .from('consumable_inventory')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', dataSourceTenantId)
      .eq('category_id', id)

    if (consumableCount && consumableCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with associated consumable inventory' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('equipment_categories')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      console.error('Error deleting equipment category:', error)
      return NextResponse.json(
        { error: 'Failed to delete equipment category', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
