import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:tickets')

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST - Vote for a ticket (toggle vote)
export async function POST(
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

    const { id: ticketId } = await params

    // Get ticket details to check if user is the creator
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('reported_by')
      .eq('id', ticketId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Prevent creator from voting on their own ticket
    if (ticket.reported_by === session.user.id) {
      return NextResponse.json({ 
        error: 'You cannot vote on your own ticket' 
      }, { status: 403 })
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('ticket_votes')
      .select('id')
      .eq('ticket_id', ticketId)
      .eq('user_id', session.user.id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (existingVote) {
      // Remove vote (unlike)
      const { error } = await supabase
        .from('ticket_votes')
        .delete()
        .eq('id', existingVote.id)

      if (error) {
        log.error({ error }, 'Error removing vote')
        return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 })
      }

      revalidatePath('/[tenant]/tickets', 'page')
      revalidatePath(`/[tenant]/tickets/${ticketId}`, 'page')

      return NextResponse.json({ voted: false, message: 'Vote removed' })
    } else {
      // Add vote (like)
      const { error } = await supabase
        .from('ticket_votes')
        .insert({
          ticket_id: ticketId,
          user_id: session.user.id,
          tenant_id: dataSourceTenantId,
        })

      if (error) {
        log.error({ error }, 'Error adding vote')
        return NextResponse.json({ error: 'Failed to add vote' }, { status: 500 })
      }

      revalidatePath('/[tenant]/tickets', 'page')
      revalidatePath(`/[tenant]/tickets/${ticketId}`, 'page')

      return NextResponse.json({ voted: true, message: 'Vote added' })
    }
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

