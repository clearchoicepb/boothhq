import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET - List all tickets with filters
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    // Filters
    const status = searchParams.get('status')
    const ticket_type = searchParams.get('ticket_type')
    const priority = searchParams.get('priority')
    const assigned_to = searchParams.get('assigned_to')
    const reported_by = searchParams.get('reported_by')

    // Note: Using simple select to avoid PostgREST schema cache issues with FK joins
    let query = supabase
      .from('tickets')
      .select('*, ticket_votes(id, user_id)')
      .eq('tenant_id', dataSourceTenantId)

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (ticket_type && ticket_type !== 'all') {
      query = query.eq('ticket_type', ticket_type)
    }
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }
    if (assigned_to && assigned_to !== 'all') {
      query = query.eq('assigned_to', assigned_to)
    }
    if (reported_by && reported_by !== 'all') {
      query = query.eq('reported_by', reported_by)
    }

    query = query.order('created_at', { ascending: false })

    const { data: tickets, error } = await query

    if (error) {
      console.error('Error fetching tickets:', error)
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
    }

    // Fetch related user data separately to avoid PostgREST schema cache issues
    if (tickets && tickets.length > 0) {
      const userIds = new Set<string>()
      tickets.forEach(ticket => {
        if (ticket.reported_by) userIds.add(ticket.reported_by)
        if (ticket.assigned_to) userIds.add(ticket.assigned_to)
        if (ticket.resolved_by) userIds.add(ticket.resolved_by)
      })

      if (userIds.size > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .in('id', Array.from(userIds))

        if (users) {
          const userMap = new Map(users.map(u => [u.id, u]))

          tickets.forEach(ticket => {
            if (ticket.reported_by && userMap.has(ticket.reported_by)) {
              ticket.reported_by_user = userMap.get(ticket.reported_by)
            }
            if (ticket.assigned_to && userMap.has(ticket.assigned_to)) {
              ticket.assigned_to_user = userMap.get(ticket.assigned_to)
            }
            if (ticket.resolved_by && userMap.has(ticket.resolved_by)) {
              ticket.resolved_by_user = userMap.get(ticket.resolved_by)
            }
          })
        }
      }
    }

    return NextResponse.json(tickets || [])
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new ticket
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Auto-capture browser info if not provided
    if (!body.browser_info) {
      const userAgent = request.headers.get('user-agent') || 'Unknown'
      body.browser_info = userAgent
    }

    const ticketData = {
      ...body,
      tenant_id: dataSourceTenantId,
      reported_by: session.user.id,
      status: body.status || 'new',
      priority: body.priority || 'medium',
      ticket_type: body.ticket_type || 'bug',
    }

    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert(ticketData)
      .select('*')
      .single()

    if (error) {
      console.error('Error creating ticket:', error)
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
    }

    revalidatePath('/[tenant]/tickets', 'page')

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

