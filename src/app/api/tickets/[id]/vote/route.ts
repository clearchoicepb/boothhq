import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

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
        console.error('Error removing vote:', error)
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
        console.error('Error adding vote:', error)
        return NextResponse.json({ error: 'Failed to add vote' }, { status: 500 })
      }

      revalidatePath('/[tenant]/tickets', 'page')
      revalidatePath(`/[tenant]/tickets/${ticketId}`, 'page')

      return NextResponse.json({ voted: true, message: 'Vote added' })
    }
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

