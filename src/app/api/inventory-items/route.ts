import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:inventory-items')

// GET /api/inventory-items - Fetch all inventory items for tenant
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    // Pagination params
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = (page - 1) * limit

    // Filter params
    const category = searchParams.get('category')
    const trackingType = searchParams.get('tracking_type')
    const assignedToType = searchParams.get('assigned_to_type')
    const assignedToId = searchParams.get('assigned_to_id')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // Sorting params
    const sortBy = searchParams.get('sort') || 'item_name'
    const sortOrder = searchParams.get('order') || 'asc'

    // Value range filters
    const minValue = searchParams.get('min_value')
    const maxValue = searchParams.get('max_value')

    // Date filters
    const purchaseDateFrom = searchParams.get('purchase_date_from')
    const purchaseDateTo = searchParams.get('purchase_date_to')

    // Get total count first (before pagination)
    let countQuery = supabase
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', dataSourceTenantId)

    // Apply same filters to count query
    if (category) countQuery = countQuery.eq('item_category', category)
    if (trackingType) countQuery = countQuery.eq('tracking_type', trackingType)
    if (assignedToType) countQuery = countQuery.eq('assigned_to_type', assignedToType)
    if (assignedToId) countQuery = countQuery.eq('assigned_to_id', assignedToId)
    if (status === 'available') {
      countQuery = countQuery.or('assigned_to_id.is.null,assignment_type.eq.warehouse')
    } else if (status === 'checked_out') {
      countQuery = countQuery.eq('assignment_type', 'event_checkout')
    } else if (status === 'long_term') {
      countQuery = countQuery.eq('assignment_type', 'long_term_staff')
    }
    if (minValue) countQuery = countQuery.gte('item_value', parseFloat(minValue))
    if (maxValue) countQuery = countQuery.lte('item_value', parseFloat(maxValue))
    if (purchaseDateFrom) countQuery = countQuery.gte('purchase_date', purchaseDateFrom)
    if (purchaseDateTo) countQuery = countQuery.lte('purchase_date', purchaseDateTo)
    if (search) {
      countQuery = countQuery.or(`item_name.ilike.%${search}%,serial_number.ilike.%${search}%,item_category.ilike.%${search}%,model.ilike.%${search}%`)
    }

    const { count } = await countQuery

    // Build main query with pagination
    let query = supabase
      .from('inventory_items')
      .select(`
        *,
        product_group_items!left(
          product_group_id,
          product_groups(
            id,
            group_name
          )
        )
      `)
      .eq('tenant_id', dataSourceTenantId)

    // Apply filters
    if (category) query = query.eq('item_category', category)
    if (trackingType) query = query.eq('tracking_type', trackingType)
    if (assignedToType) query = query.eq('assigned_to_type', assignedToType)
    if (assignedToId) query = query.eq('assigned_to_id', assignedToId)

    // Status filters
    if (status === 'available') {
      query = query.or('assigned_to_id.is.null,assignment_type.eq.warehouse')
    } else if (status === 'checked_out') {
      query = query.eq('assignment_type', 'event_checkout')
    } else if (status === 'long_term') {
      query = query.eq('assignment_type', 'long_term_staff')
    }

    // Value range filters
    if (minValue) query = query.gte('item_value', parseFloat(minValue))
    if (maxValue) query = query.lte('item_value', parseFloat(maxValue))

    // Date filters
    if (purchaseDateFrom) query = query.gte('purchase_date', purchaseDateFrom)
    if (purchaseDateTo) query = query.lte('purchase_date', purchaseDateTo)

    // Search filter (across multiple fields)
    if (search) {
      query = query.or(`item_name.ilike.%${search}%,serial_number.ilike.%${search}%,item_category.ilike.%${search}%,model.ilike.%${search}%`)
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy, { ascending })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch inventory items',
        details: error.message,
      }, { status: 500 })
    }

    // Fetch related names for assignments
    if (data && data.length > 0) {
      // Get unique IDs for each assignment type
      const userIds = [...new Set(
        data.filter(item => item.assigned_to_type === 'user' && item.assigned_to_id)
          .map(item => item.assigned_to_id)
      )]
      const locationIds = [...new Set(
        data.filter(item => item.assigned_to_type === 'physical_address' && item.assigned_to_id)
          .map(item => item.assigned_to_id)
      )]
      const groupIds = [...new Set(
        data.filter(item => item.assigned_to_type === 'product_group' && item.assigned_to_id)
          .map(item => item.assigned_to_id)
      )]

      // Fetch users
      const usersMap = new Map()
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', userIds)

        users?.forEach(user => {
          usersMap.set(user.id, `${user.first_name} ${user.last_name}`)
        })
      }

      // Fetch physical addresses (locations)
      const locationsMap = new Map()
      if (locationIds.length > 0) {
        const { data: locations } = await supabase
          .from('physical_addresses')
          .select('id, location_name')
          .in('id', locationIds)

        locations?.forEach(location => {
          locationsMap.set(location.id, location.location_name)
        })
      }

      // Fetch product groups
      const groupsMap = new Map()
      if (groupIds.length > 0) {
        const { data: groups } = await supabase
          .from('product_groups')
          .select('id, group_name')
          .in('id', groupIds)

        groups?.forEach(group => {
          groupsMap.set(group.id, group.group_name)
        })
      }

      // Add assignment names to items and product group membership
      data.forEach(item => {
        if (item.assigned_to_type && item.assigned_to_id) {
          if (item.assigned_to_type === 'user') {
            item.assigned_to_name = usersMap.get(item.assigned_to_id) || 'Unknown User'
          } else if (item.assigned_to_type === 'physical_address') {
            item.assigned_to_name = locationsMap.get(item.assigned_to_id) || 'Unknown Location'
          } else if (item.assigned_to_type === 'product_group') {
            item.assigned_to_name = groupsMap.get(item.assigned_to_id) || 'Unknown Group'
          }
        }

        // Add product group membership from junction table
        if (item.product_group_items && item.product_group_items.length > 0) {
          const groupItem = item.product_group_items[0] // An item should only be in one group
          if (groupItem.product_groups) {
            item.product_group_id = groupItem.product_groups.id
            item.product_group_name = groupItem.product_groups.group_name
          }
        }
      })

      // Fetch last assignment history for each item (who had it before current assignment)
      const itemIds = data.map(item => item.id)
      const { data: historyData } = await supabase
        .from('inventory_assignment_history')
        .select('inventory_item_id, assigned_from_name, assigned_to_name, changed_at')
        .in('inventory_item_id', itemIds)
        .eq('tenant_id', dataSourceTenantId)
        .order('changed_at', { ascending: false })

      // Create a map of item ID to their most recent history entry
      const historyMap = new Map()
      historyData?.forEach(entry => {
        if (!historyMap.has(entry.inventory_item_id)) {
          historyMap.set(entry.inventory_item_id, entry)
        }
      })

      // Add last assignment info to items
      data.forEach(item => {
        const history = historyMap.get(item.id)
        if (history) {
          item.last_assigned_to = history.assigned_from_name
          item.last_changed_at = history.changed_at
        }
      })
    }

    // Return data with pagination metadata
    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore: page < totalPages
      }
    })
  } catch (error) {
    log.error({ error }, 'Error fetching inventory items')
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

    // Extract product_group_id if provided (for managing group membership separately)
    const { product_group_id, ...itemFields } = body

    // If assigning to a product group, remove direct assignment fields
    // The database trigger will automatically set them based on the group's assignment
    if (product_group_id !== undefined && product_group_id !== null && product_group_id !== '') {
      delete itemFields.assigned_to_type
      delete itemFields.assigned_to_id
    } else {
      // Convert empty strings to NULL for assignment fields (database constraint requires NULL, not '')
      if (itemFields.assigned_to_type === '') {
        itemFields.assigned_to_type = null
      }
      if (itemFields.assigned_to_id === '') {
        itemFields.assigned_to_id = null
      }
    }

    // Validate tracking type requirements
    if (itemFields.tracking_type === 'serial_number' && !itemFields.serial_number) {
      return NextResponse.json({
        error: 'Serial number is required when tracking type is serial_number',
      }, { status: 400 })
    }

    if (itemFields.tracking_type === 'total_quantity' && (!itemFields.total_quantity || itemFields.total_quantity <= 0)) {
      return NextResponse.json({
        error: 'Total quantity must be greater than 0 when tracking type is total_quantity',
      }, { status: 400 })
    }

    const itemData = {
      ...itemFields,
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

    // If assigned to a product group, create junction table entry
    // Note: The trigger will automatically update the item's assigned_to_* fields to match the group
    if (data && product_group_id) {
      const { error: junctionError } = await supabase
        .from('product_group_items')
        .insert({
          product_group_id: product_group_id,
          inventory_item_id: data.id,
          tenant_id: dataSourceTenantId
        })

      if (junctionError) {
        log.error({ junctionError }, 'Failed to create product group junction')
        return NextResponse.json({
          error: 'Failed to add item to product group',
          details: junctionError.message,
          code: junctionError.code
        }, { status: 500 })
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error creating inventory item')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
