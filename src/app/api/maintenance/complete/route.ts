import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST - Complete maintenance workflow
 * High-level endpoint that:
 * 1. Creates maintenance record
 * 2. Calculates and sets next maintenance date
 * 3. Updates linked task if exists
 * 4. Can trigger notifications (future)
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const body = await request.json()

    // Validation
    if (!body.inventory_item_id) {
      return NextResponse.json({ error: 'inventory_item_id is required' }, { status: 400 })
    }

    if (!body.notes) {
      return NextResponse.json({ error: 'notes are required' }, { status: 400 })
    }

    // Get inventory item and category for maintenance interval
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select(`
        id,
        item_name,
        item_category,
        maintenance_interval_days
      `)
      .eq('id', body.inventory_item_id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (itemError || !item) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    // Get category maintenance settings if item doesn't have custom interval
    let maintenanceIntervalDays = item.maintenance_interval_days

    if (!maintenanceIntervalDays) {
      const { data: category } = await supabase
        .from('equipment_categories')
        .select('maintenance_interval_days')
        .eq('tenant_id', dataSourceTenantId)
        .eq('name', item.item_category)
        .eq('requires_maintenance', true)
        .single()

      maintenanceIntervalDays = category?.maintenance_interval_days || 90
    }

    // Calculate next maintenance date
    const maintenanceDate = body.maintenance_date || new Date().toISOString().split('T')[0]
    const nextMaintenanceDate = new Date(maintenanceDate)
    nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + maintenanceIntervalDays)
    const nextMaintenanceDateStr = nextMaintenanceDate.toISOString().split('T')[0]

    // Create maintenance record (trigger will update inventory_items automatically)
    const { data: maintenance, error: maintenanceError } = await supabase
      .from('maintenance_history')
      .insert({
        tenant_id: dataSourceTenantId,
        inventory_item_id: body.inventory_item_id,
        maintenance_date: maintenanceDate,
        performed_by: body.performed_by || session?.user?.id,
        maintenance_type: body.maintenance_type || 'scheduled',
        notes: body.notes,
        cost: body.cost || null,
        next_maintenance_date: nextMaintenanceDateStr,
        task_id: body.task_id || null
      })
      .select(`
        *,
        performed_by_user:users!maintenance_history_performed_by_fkey(id, first_name, last_name, email),
        inventory_item:inventory_items!maintenance_history_inventory_item_id_fkey(id, item_name, item_category, serial_number)
      `)
      .single()

    if (maintenanceError) {
      console.error('Error creating maintenance record:', maintenanceError)
      return NextResponse.json(
        { error: 'Failed to create maintenance record', details: maintenanceError.message },
        { status: 500 }
      )
    }

    // Update linked task if provided
    let taskUpdated = false
    if (body.task_id) {
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', body.task_id)
        .eq('tenant_id', dataSourceTenantId)

      taskUpdated = !taskError
    }

    return NextResponse.json({
      success: true,
      maintenance,
      task_updated: taskUpdated,
      task_id: body.task_id || null
    }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
