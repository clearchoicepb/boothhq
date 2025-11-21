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

    let query = supabase
      .from('tickets')
      .select(`
        *,
        assigned_to_user:users!assigned_to(id, first_name, last_name, email),
        reported_by_user:users!reported_by(id, first_name, last_name, email),
        resolved_by_user:users!resolved_by(id, first_name, last_name, email),
        ticket_votes(id, user_id)
      `)
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
      .select(`
        *,
        assigned_to_user:users!assigned_to(id, first_name, last_name, email),
        reported_by_user:users!reported_by(id, first_name, last_name, email)
      `)
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

