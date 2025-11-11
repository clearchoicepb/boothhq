import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/inventory-items/[id]/history - Fetch assignment history for an inventory item
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await context.params

    // Get the current user's session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', session.user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const tenantId = membership.tenant_id
    const itemId = params.id

    // Verify the item belongs to the user's tenant
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('id, item_name')
      .eq('id', itemId)
      .eq('tenant_id', tenantId)
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
        change_reason,
        events:event_id (
          id,
          event_name
        ),
        users:changed_by (
          id,
          first_name,
          last_name
        )
      `)
      .eq('inventory_item_id', itemId)
      .eq('tenant_id', tenantId)
      .order('changed_at', { ascending: false })

    if (historyError) {
      console.error('Error fetching assignment history:', historyError)
      return NextResponse.json(
        { error: 'Failed to fetch assignment history' },
        { status: 500 }
      )
    }

    // Format the response
    const formattedHistory = history.map((entry: any) => ({
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
      event: entry.events ? {
        id: entry.events.id,
        name: entry.events.event_name,
      } : null,
      expectedReturnDate: entry.expected_return_date,
      changedBy: entry.users ? {
        id: entry.users.id,
        name: `${entry.users.first_name} ${entry.users.last_name}`,
      } : null,
      changedAt: entry.changed_at,
      reason: entry.change_reason,
    }))

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
