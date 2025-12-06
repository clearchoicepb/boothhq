import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:admin')

// POST /api/admin/sync-product-groups - Sync existing inventory items with product_group_items junction table
// This fixes items that were assigned to product groups before the junction table was properly maintained
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find all inventory items assigned to product groups
    const { data: itemsInGroups, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id, assigned_to_id, assigned_to_type, tenant_id, created_at')
      .eq('tenant_id', dataSourceTenantId)
      .eq('assigned_to_type', 'product_group')
      .not('assigned_to_id', 'is', null)

    if (fetchError) {
      return NextResponse.json({
        error: 'Failed to fetch items',
        details: fetchError.message
      }, { status: 500 })
    }

    if (!itemsInGroups || itemsInGroups.length === 0) {
      return NextResponse.json({
        message: 'No items found that need syncing',
        synced_count: 0
      })
    }

    let syncedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    // Process each item
    for (const item of itemsInGroups) {
      // Check if junction entry already exists
      const { data: existing } = await supabase
        .from('product_group_items')
        .select('id')
        .eq('product_group_id', item.assigned_to_id)
        .eq('inventory_item_id', item.id)
        .eq('tenant_id', item.tenant_id)
        .maybeSingle()

      if (existing) {
        skippedCount++
        continue
      }

      // Create junction entry
      const { error: insertError } = await supabase
        .from('product_group_items')
        .insert({
          product_group_id: item.assigned_to_id,
          inventory_item_id: item.id,
          tenant_id: item.tenant_id,
          date_added: item.created_at || new Date().toISOString()
        })

      if (insertError) {
        errors.push(`Failed to sync item ${item.id}: ${insertError.message}`)
      } else {
        syncedCount++
      }
    }

    return NextResponse.json({
      message: 'Sync completed',
      total_items: itemsInGroups.length,
      synced_count: syncedCount,
      skipped_count: skippedCount,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    log.error({ error }, 'Sync error')
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
