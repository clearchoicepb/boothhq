import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { addDays } from 'date-fns'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:inventory-assignments')

/**
 * General Inventory Assignments API
 * Handles quantity-based assignments for:
 * - Events
 * - Users/Staff (long-term or temporary)
 * - Physical Addresses/Warehouses
 * - Product Groups (via items in the group)
 */

// GET /api/inventory-assignments - Fetch assignments with filters
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    // Filter params
    const assignedToType = searchParams.get('assigned_to_type')  // 'event', 'user', 'location'
    const assignedToId = searchParams.get('assigned_to_id')
    const inventoryItemId = searchParams.get('inventory_item_id')
    const status = searchParams.get('status')  // 'assigned', 'checked_out', 'in_use', 'returned', 'cancelled'

    let query = supabase
      .from('inventory_assignments')
      .select(`
        *,
        inventory_items (
          id,
          item_name,
          item_category,
          serial_number,
          tracking_type,
          total_quantity,
          model
        ),
        events (
          id,
          name,
          start_date
        ),
        users (
          id,
          first_name,
          last_name,
          email
        ),
        physical_addresses (
          id,
          location_name
        )
      `)
      .eq('tenant_id', dataSourceTenantId)
      .order('assigned_date', { ascending: false })

    if (assignedToType) query = query.eq('assigned_to_type', assignedToType)
    if (assignedToId) {
      if (assignedToType === 'event') query = query.eq('event_id', assignedToId)
      else if (assignedToType === 'user') query = query.eq('user_id', assignedToId)
      else if (assignedToType === 'location') query = query.eq('physical_address_id', assignedToId)
    }
    if (inventoryItemId) query = query.eq('inventory_item_id', inventoryItemId)
    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch assignments',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({ assignments: data || [] })
  } catch (error) {
    log.error({ error }, 'Error fetching assignments')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/inventory-assignments - Create new assignment(s)
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      inventory_item_ids,
      item_quantities,  // { item_id: quantity }
      assigned_to_type,  // 'event', 'user', 'location'
      assigned_to_id,    // ID of event/user/location
      assignment_type,   // 'event_checkout', 'long_term_staff', 'warehouse', 'temporary'
      expected_return_date,
      notes
    } = body

    if (!inventory_item_ids || inventory_item_ids.length === 0) {
      return NextResponse.json({
        error: 'inventory_item_ids array is required'
      }, { status: 400 })
    }

    if (!assigned_to_type || !assigned_to_id) {
      return NextResponse.json({
        error: 'assigned_to_type and assigned_to_id are required'
      }, { status: 400 })
    }

    // Fetch inventory items to check tracking types
    const { data: inventoryItems, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id, item_name, tracking_type, total_quantity')
      .in('id', inventory_item_ids)
      .eq('tenant_id', dataSourceTenantId)

    if (itemsError || !inventoryItems) {
      return NextResponse.json({
        error: 'Failed to fetch inventory items',
        details: itemsError?.message
      }, { status: 500 })
    }

    // Calculate default return date (5 days from now)
    const defaultReturnDate = addDays(new Date(), 5).toISOString().split('T')[0]

    // Create assignment records
    const assignments = inventoryItems.map((item: any) => {
      // Determine quantity to assign
      let quantityToAssign = 1

      if (item.tracking_type === 'total_quantity') {
        quantityToAssign = item_quantities?.[item.id] || 1
        
        // Validate quantity
        if (item.total_quantity && quantityToAssign > item.total_quantity) {
          log.warn('⚠️ Quantity ${quantityToAssign} exceeds total ${item.total_quantity} for item ${item.item_name}')
          quantityToAssign = item.total_quantity
        }
      }

      const assignmentData: any = {
        tenant_id: dataSourceTenantId,
        inventory_item_id: item.id,
        quantity_assigned: quantityToAssign,
        assigned_to_type,
        assignment_type: assignment_type || 'temporary',
        assigned_date: new Date().toISOString(),
        expected_return_date: expected_return_date || defaultReturnDate,
        status: 'assigned',
        prep_status: 'needs_prep',
        notes,
        created_by: session.user.id
      }

      // Set the appropriate foreign key based on type
      if (assigned_to_type === 'event') {
        assignmentData.event_id = assigned_to_id
      } else if (assigned_to_type === 'user') {
        assignmentData.user_id = assigned_to_id
      } else if (assigned_to_type === 'location') {
        assignmentData.physical_address_id = assigned_to_id
      }

      return assignmentData
    })

    // Insert assignments
    const { data: createdAssignments, error: assignmentError } = await supabase
      .from('inventory_assignments')
      .insert(assignments)
      .select(`
        *,
        inventory_items (
          id,
          item_name,
          item_category,
          serial_number,
          tracking_type,
          total_quantity,
          model
        )
      `)

    if (assignmentError) {
      log.error({ assignmentError }, '❌ Failed to create assignments')
      return NextResponse.json({
        error: 'Failed to create assignments',
        details: assignmentError.message
      }, { status: 500 })
    }

    log.debug('✅ Created ${createdAssignments?.length || 0} inventory assignments')

    return NextResponse.json({
      success: true,
      assignments: createdAssignments
    })
  } catch (error) {
    log.error({ error }, 'Error creating assignments')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/inventory-assignments - Remove assignment(s)
export async function DELETE(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)
    const assignmentIds = searchParams.get('assignment_ids')?.split(',') || []

    if (assignmentIds.length === 0) {
      return NextResponse.json({
        error: 'assignment_ids parameter is required'
      }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('inventory_assignments')
      .delete()
      .in('id', assignmentIds)
      .eq('tenant_id', dataSourceTenantId)

    if (deleteError) {
      return NextResponse.json({
        error: 'Failed to remove assignments',
        details: deleteError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      removed_count: assignmentIds.length
    })
  } catch (error) {
    log.error({ error }, 'Error removing assignments')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

