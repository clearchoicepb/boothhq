import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

// Category to value mapping
const CATEGORY_VALUES: Record<string, number> = {
  'Printers': 950.00,
  'Cameras': 450.00,
  'Lighting': 250.00,
  'iPads': 250.00,
  'Backdrops': 90.00,
  'Backdrop Stands': 220.00,
  'Hotspots': 150.00,
  'Computer': 200.00,
}

// POST /api/admin/update-inventory-values - Update all inventory item values by category
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    const results = []
    let totalUpdated = 0

    for (const [category, value] of Object.entries(CATEGORY_VALUES)) {
      const { data, error } = await supabase
        .from('inventory_items')
        .update({ item_value: value })
        .eq('item_category', category)
        .eq('tenant_id', dataSourceTenantId)
        .select()

      if (error) {
        results.push({ category, error: error.message, updated: 0 })
      } else {
        const count = data?.length || 0
        totalUpdated += count
        results.push({ category, updated: count, value })
      }
    }

    return NextResponse.json({
      success: true,
      totalUpdated,
      results
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
