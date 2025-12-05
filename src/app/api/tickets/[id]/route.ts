import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET - Fetch single ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = await params

    // Fetch ticket data
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*, ticket_votes(id, user_id)')
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      console.error('Error fetching ticket:', error)
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Fetch related user data separately to avoid PostgREST schema cache issues
    const userIds = [
      ticket.reported_by,
      ticket.assigned_to,
      ticket.resolved_by
    ].filter(Boolean)

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', userIds)

      if (users) {
        const userMap = new Map(users.map(u => [u.id, u]))

        if (ticket.reported_by && userMap.has(ticket.reported_by)) {
          ticket.reported_by_user = userMap.get(ticket.reported_by)
        }
        if (ticket.assigned_to && userMap.has(ticket.assigned_to)) {
          ticket.assigned_to_user = userMap.get(ticket.assigned_to)
        }
        if (ticket.resolved_by && userMap.has(ticket.resolved_by)) {
          ticket.resolved_by_user = userMap.get(ticket.resolved_by)
        }
      }
    }

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update ticket
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // If status is being changed to 'resolved', capture resolution timestamp
    // Note: resolved_by is not set due to dual-database architecture
    // (session.user.id may not exist in tenant database users table)
    if (body.status === 'resolved' && !body.resolved_at) {
      body.resolved_at = new Date().toISOString()
    }

    // If status is being changed away from 'resolved', clear resolution info
    if (body.status && body.status !== 'resolved') {
      body.resolved_at = null
      body.resolved_by = null
    }

    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
    }

    // Perform the update and return basic ticket data
    // Note: Using simple select without joins to avoid PostgREST schema cache issues
    const { data: ticket, error: updateError } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return NextResponse.json({
        error: 'Failed to update ticket',
        details: updateError.message
      }, { status: 500 })
    }

    revalidatePath('/[tenant]/tickets', 'page')
    revalidatePath(`/[tenant]/tickets/${id}`, 'page')

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete ticket
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      console.error('Error deleting ticket:', error)
      return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 })
    }

    revalidatePath('/[tenant]/tickets', 'page')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

