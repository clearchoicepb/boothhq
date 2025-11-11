import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/inventory-items/[id]/history - Fetch assignment history for an inventory item
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const params = await routeContext.params
    const itemId = params.id

    // Verify the item belongs to the user's tenant
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('id, item_name')
      .eq('id', itemId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Fetch assignment history
    const { data: history, error: historyError } = await supabase
      .from('inventory_assignment_history')
      .select(`
        id,
        assigned_from_type,
        assigned_from_id,
        assigned_from_name,
        assigned_to_type,
        assigned_to_id,
        assigned_to_name,
        assignment_type,
        event_id,
        expected_return_date,
        changed_by,
        changed_at,
        change_reason
      `)
      .eq('inventory_item_id', itemId)
      .eq('tenant_id', dataSourceTenantId)
      .order('changed_at', { ascending: false })

    if (historyError) {
      console.error('Error fetching assignment history:', historyError)
      return NextResponse.json(
        { error: 'Failed to fetch assignment history' },
        { status: 500 }
      )
    }

    // Fetch related event and user data separately
    const eventIds = [...new Set(history.filter(h => h.event_id).map(h => h.event_id))]
    const userIds = [...new Set(history.filter(h => h.changed_by).map(h => h.changed_by))]

    // Get events
    const eventsMap = new Map()
    if (eventIds.length > 0) {
      const { data: events } = await supabase
        .from('events')
        .select('id, event_name')
        .in('id', eventIds)

      events?.forEach(event => {
        eventsMap.set(event.id, event)
      })
    }

    // Get users
    const usersMap = new Map()
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds)

      users?.forEach(user => {
        usersMap.set(user.id, user)
      })
    }

    // Format the response
    const formattedHistory = history.map((entry: any) => {
      const event = entry.event_id ? eventsMap.get(entry.event_id) : null
      const user = entry.changed_by ? usersMap.get(entry.changed_by) : null

      return {
        id: entry.id,
        from: {
          type: entry.assigned_from_type,
          id: entry.assigned_from_id,
          name: entry.assigned_from_name || 'Unassigned',
        },
        to: {
          type: entry.assigned_to_type,
          id: entry.assigned_to_id,
          name: entry.assigned_to_name || 'Unassigned',
        },
        assignmentType: entry.assignment_type,
        event: event ? {
          id: event.id,
          name: event.event_name,
        } : null,
        expectedReturnDate: entry.expected_return_date,
        changedBy: user ? {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
        } : null,
        changedAt: entry.changed_at,
        reason: entry.change_reason,
      }
    })

    return NextResponse.json({
      item: {
        id: item.id,
        name: item.item_name,
      },
      history: formattedHistory,
    })
  } catch (error) {
    console.error('Error in assignment history API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
