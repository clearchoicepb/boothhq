import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { addDays } from 'date-fns'

// GET /api/events/[id]/inventory - Get all inventory assigned to an event or available inventory
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const eventId = params.id
    const { searchParams } = new URL(request.url)
    const includeAvailable = searchParams.get('include_available') === 'true'
    const search = searchParams.get('search')

    // Verify event exists and belongs to tenant
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, start_date')
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({
        error: 'Event not found'
      }, { status: 404 })
    }

    let assignedInventory = []
    let availableInventory = []
    let availableProductGroups = []

    // Fetch inventory already assigned to this event
    const { data: assigned, error: assignedError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .eq('event_id', eventId)
      .order('item_name', { ascending: true })

    if (assignedError) {
      return NextResponse.json({
        error: 'Failed to fetch assigned inventory',
        details: assignedError.message
      }, { status: 500 })
    }

    assignedInventory = assigned || []

    // If include_available, fetch warehouse items, staff equipment, and product groups
    if (includeAvailable) {
      // Get all staff assigned to this event
      const { data: eventStaff } = await supabase
        .from('event_staff_assignments')
        .select('user_id')
        .eq('tenant_id', dataSourceTenantId)
        .eq('event_id', eventId)

      const eventStaffIds = eventStaff?.map((s: { user_id: string }) => s.user_id) || []

      // Build query for available items
      let availableQuery = supabase
        .from('inventory_items')
        .select('*, product_group_items!left(product_group_id)')
        .eq('tenant_id', dataSourceTenantId)
        .is('event_id', null) // Not already assigned to an event

      // Filter: warehouse items OR staff items (if staff is on this event)
      // We'll filter in code since Supabase doesn't support complex OR conditions easily

      const { data: allItems } = await availableQuery

      if (allItems) {
        availableInventory = allItems.filter((item: any) => {
          // Include warehouse items (any item assigned to physical_address)
          if (item.assigned_to_type === 'physical_address') {
            return true
          }
          // Include staff equipment if staff is on this event (including long_term_staff)
          if (item.assigned_to_type === 'user' && item.assigned_to_id && eventStaffIds.includes(item.assigned_to_id)) {
            return true
          }
          // Include unassigned items
          if (!item.assigned_to_id) {
            return true
          }
          return false
        })
      }

      // Apply search filter if provided
      if (search && availableInventory.length > 0) {
        const searchLower = search.toLowerCase()
        availableInventory = availableInventory.filter((item: any) =>
          item.item_name.toLowerCase().includes(searchLower) ||
          item.item_category.toLowerCase().includes(searchLower) ||
          (item.serial_number && item.serial_number.toLowerCase().includes(searchLower))
        )
      }

      // Fetch product groups for available items
      const groupIds = [...new Set(
        availableInventory
          .filter((item: any) => item.assigned_to_type === 'product_group' && item.assigned_to_id)
          .map((item: any) => item.assigned_to_id)
      )]

      if (groupIds.length > 0) {
        const { data: groups } = await supabase
          .from('product_groups')
          .select('id, group_name, assigned_to_type, assigned_to_id')
          .in('id', groupIds)

        const groupsMap = new Map(groups?.map((g: any) => [g.id, g]) || [])

        // Filter out items in product groups that don't meet availability criteria
        availableInventory = availableInventory.filter((item: any) => {
          if (item.assigned_to_type === 'product_group' && item.assigned_to_id) {
            const group = groupsMap.get(item.assigned_to_id)
            if (!group) return false

            // Check if group assignment makes it available
            if (group.assigned_to_type === 'physical_address') return true
            if (group.assigned_to_type === 'user' && eventStaffIds.includes(group.assigned_to_id)) return true
            return false
          }
          return true
        })
      }

      // Fetch available product groups
      const { data: allGroups } = await supabase
        .from('product_groups')
        .select(`
          *,
          product_group_items (
            id,
            inventory_item_id
          )
        `)
        .eq('tenant_id', dataSourceTenantId)
        .order('group_name', { ascending: true })

      if (allGroups) {
        availableProductGroups = allGroups.filter((group: any) => {
          // Include warehouse product groups
          if (group.assigned_to_type === 'physical_address') {
            return true
          }
          // Include staff product groups if staff is on this event
          if (group.assigned_to_type === 'user' && group.assigned_to_id && eventStaffIds.includes(group.assigned_to_id)) {
            return true
          }
          return false
        })
      }

      // Apply search filter to product groups if provided
      if (search && availableProductGroups.length > 0) {
        const searchLower = search.toLowerCase()
        availableProductGroups = availableProductGroups.filter((group: any) =>
          group.group_name.toLowerCase().includes(searchLower) ||
          (group.description && group.description.toLowerCase().includes(searchLower))
        )
      }
    }

    // Enrich both assigned and available inventory with names
    const allInventory = [...assignedInventory, ...availableInventory]

    if (allInventory.length > 0) {
      const userIds = [...new Set(
        allInventory.filter((item: any) => item.assigned_to_type === 'user' && item.assigned_to_id)
          .map((item: any) => item.assigned_to_id)
      )]
      const locationIds = [...new Set(
        allInventory.filter((item: any) => item.assigned_to_type === 'physical_address' && item.assigned_to_id)
          .map((item: any) => item.assigned_to_id)
      )]
      const groupIds = [...new Set(
        allInventory.filter((item: any) => item.assigned_to_type === 'product_group' && item.assigned_to_id)
          .map((item: any) => item.assigned_to_id)
      )]

      // Fetch users
      const usersMap = new Map()
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', userIds)

        users?.forEach((user: any) => {
          usersMap.set(user.id, `${user.first_name} ${user.last_name}`)
        })
      }

      // Fetch locations
      const locationsMap = new Map()
      if (locationIds.length > 0) {
        const { data: locations } = await supabase
          .from('physical_addresses')
          .select('id, location_name')
          .in('id', locationIds)

        locations?.forEach((location: any) => {
          locationsMap.set(location.id, location.location_name)
        })
      }

      // Fetch groups
      const groupsMap = new Map()
      if (groupIds.length > 0) {
        const { data: groups } = await supabase
          .from('product_groups')
          .select('id, group_name')
          .in('id', groupIds)

        groups?.forEach((group: any) => {
          groupsMap.set(group.id, group.group_name)
        })
      }

      // Add assignment names
      allInventory.forEach((item: any) => {
        if (item.assigned_to_type === 'user' && item.assigned_to_id) {
          item.assigned_to_name = usersMap.get(item.assigned_to_id) || 'Unknown User'
        } else if (item.assigned_to_type === 'physical_address' && item.assigned_to_id) {
          item.assigned_to_name = locationsMap.get(item.assigned_to_id) || 'Unknown Location'
        } else if (item.assigned_to_type === 'product_group' && item.assigned_to_id) {
          item.assigned_to_name = groupsMap.get(item.assigned_to_id) || 'Unknown Group'
        }
      })
    }

    // Enrich product groups with assignment names
    if (availableProductGroups.length > 0) {
      const groupUserIds = [...new Set(
        availableProductGroups.filter((group: any) => group.assigned_to_type === 'user' && group.assigned_to_id)
          .map((group: any) => group.assigned_to_id)
      )]
      const groupLocationIds = [...new Set(
        availableProductGroups.filter((group: any) => group.assigned_to_type === 'physical_address' && group.assigned_to_id)
          .map((group: any) => group.assigned_to_id)
      )]

      // Fetch users
      const groupUsersMap = new Map()
      if (groupUserIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', groupUserIds)

        users?.forEach((user: any) => {
          groupUsersMap.set(user.id, `${user.first_name} ${user.last_name}`)
        })
      }

      // Fetch locations
      const groupLocationsMap = new Map()
      if (groupLocationIds.length > 0) {
        const { data: locations } = await supabase
          .from('physical_addresses')
          .select('id, location_name')
          .in('id', groupLocationIds)

        locations?.forEach((location: any) => {
          groupLocationsMap.set(location.id, location.location_name)
        })
      }

      // Add assignment names to groups
      availableProductGroups.forEach((group: any) => {
        if (group.assigned_to_type === 'user' && group.assigned_to_id) {
          group.assigned_to_name = groupUsersMap.get(group.assigned_to_id) || 'Unknown User'
        } else if (group.assigned_to_type === 'physical_address' && group.assigned_to_id) {
          group.assigned_to_name = groupLocationsMap.get(group.assigned_to_id) || 'Unknown Location'
        }
      })
    }

    // Group assigned inventory by staff member
    const inventoryByStaff = new Map()
    assignedInventory.forEach((item: any) => {
      if (item.assigned_to_type === 'user' && item.assigned_to_id) {
        const staffId = item.assigned_to_id
        if (!inventoryByStaff.has(staffId)) {
          inventoryByStaff.set(staffId, {
            staff_id: staffId,
            staff_name: item.assigned_to_name,
            items: []
          })
        }
        inventoryByStaff.get(staffId).items.push(item)
      }
    })

    return NextResponse.json({
      event,
      assigned: assignedInventory,
      available: availableInventory,
      available_product_groups: availableProductGroups,
      total_assigned: assignedInventory.length,
      total_available: availableInventory.length,
      total_available_groups: availableProductGroups.length,
      by_staff: Array.from(inventoryByStaff.values())
    })
  } catch (error) {
    console.error('Event inventory error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/events/[id]/inventory - Assign inventory item to event
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const eventId = params.id
    const body = await request.json()
    const { inventory_item_ids, product_group_ids, expected_return_date, create_checkout_task } = body

    let allItemIds = [...(inventory_item_ids || [])]

    // If product groups are provided, fetch all items in those groups
    if (product_group_ids && Array.isArray(product_group_ids) && product_group_ids.length > 0) {
      const { data: groupItems } = await supabase
        .from('product_group_items')
        .select('inventory_item_id')
        .in('product_group_id', product_group_ids)
        .eq('tenant_id', dataSourceTenantId)

      if (groupItems && groupItems.length > 0) {
        const groupItemIds = groupItems.map((gi: any) => gi.inventory_item_id)
        allItemIds = [...allItemIds, ...groupItemIds]
      }
    }

    // Remove duplicates
    allItemIds = [...new Set(allItemIds)]

    if (allItemIds.length === 0) {
      return NextResponse.json({
        error: 'inventory_item_ids or product_group_ids array is required'
      }, { status: 400 })
    }

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, start_date')
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({
        error: 'Event not found'
      }, { status: 404 })
    }

    // Calculate default return date: 5 days after event start date
    const defaultReturnDate = addDays(new Date(event.start_date), 5).toISOString().split('T')[0]

    // Update inventory items
    const { data: updatedItems, error: updateError } = await supabase
      .from('inventory_items')
      .update({
        event_id: eventId,
        assignment_type: 'event_checkout',
        expected_return_date: expected_return_date || defaultReturnDate,
        updated_at: new Date().toISOString()
      })
      .in('id', allItemIds)
      .eq('tenant_id', dataSourceTenantId)
      .select()

    if (updateError) {
      return NextResponse.json({
        error: 'Failed to assign inventory',
        details: updateError.message
      }, { status: 500 })
    }

    // Create checkout task if requested
    if (create_checkout_task) {
      // TODO: Create task in tasks system
      // For now, we'll skip this and implement it when we have task API
    }

    return NextResponse.json({
      success: true,
      assigned_count: updatedItems?.length || 0,
      items: updatedItems
    })
  } catch (error) {
    console.error('Assign inventory error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE /api/events/[id]/inventory - Remove inventory assignment from event
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const eventId = params.id
    const { searchParams } = new URL(request.url)
    const itemIds = searchParams.get('item_ids')?.split(',') || []

    if (itemIds.length === 0) {
      return NextResponse.json({
        error: 'item_ids parameter is required'
      }, { status: 400 })
    }

    // Remove event assignment (keep other assignments intact)
    const { error: updateError } = await supabase
      .from('inventory_items')
      .update({
        event_id: null,
        assignment_type: null,
        expected_return_date: null,
        updated_at: new Date().toISOString()
      })
      .in('id', itemIds)
      .eq('event_id', eventId)
      .eq('tenant_id', dataSourceTenantId)

    if (updateError) {
      return NextResponse.json({
        error: 'Failed to remove inventory assignment',
        details: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      removed_count: itemIds.length
    })
  } catch (error) {
    console.error('Remove inventory error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
