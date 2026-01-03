import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { createNotification } from '@/lib/services/notificationService'

const log = createLogger('api:public:design-proofs:respond')

/**
 * Get public Supabase client (no auth required)
 */
async function getPublicSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js')

  const url = process.env.DEFAULT_TENANT_DATA_URL!
  const serviceKey = process.env.DEFAULT_TENANT_DATA_SERVICE_KEY!

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * POST /api/public/design-proofs/[token]/respond
 * Submit approval/rejection for a design proof (no auth required)
 */
export async function POST(
  request: NextRequest,
  routeContext: { params: Promise<{ token: string }> }
) {
  try {
    const params = await routeContext.params
    const { token } = params

    // Validate token format
    if (!token || token.length !== 64) {
      return NextResponse.json(
        { error: 'Invalid proof token' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { status, clientName, notes } = body

    // Validate status
    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "approved" or "rejected"' },
        { status: 400 }
      )
    }

    // Validate client name
    if (!clientName || typeof clientName !== 'string' || clientName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      )
    }

    // Notes required for rejection
    if (status === 'rejected' && (!notes || typeof notes !== 'string' || notes.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Notes are required when rejecting a design proof' },
        { status: 400 }
      )
    }

    const supabase = await getPublicSupabaseClient()

    // Fetch proof to verify it exists and is pending
    const { data: proof, error: fetchError } = await supabase
      .from('design_proofs')
      .select('id, status, uploaded_by, event_id, tenant_id')
      .eq('public_token', token)
      .single()

    if (fetchError || !proof) {
      return NextResponse.json(
        { error: 'Design proof not found' },
        { status: 404 }
      )
    }

    // Check if already responded
    if (proof.status !== 'pending') {
      return NextResponse.json(
        { error: 'This design proof has already been responded to' },
        { status: 400 }
      )
    }

    // Update the proof with response
    const { data: updatedProof, error: updateError } = await supabase
      .from('design_proofs')
      .update({
        status,
        client_name: clientName.trim(),
        client_notes: notes?.trim() || null,
        responded_at: new Date().toISOString(),
      })
      .eq('public_token', token)
      .select('id, status, client_name, client_notes, responded_at')
      .single()

    if (updateError) {
      log.error({ updateError }, 'Failed to update design proof')
      return NextResponse.json(
        { error: 'Failed to submit response' },
        { status: 500 }
      )
    }

    // Send notification to the designer who uploaded the proof (non-blocking)
    if (proof.uploaded_by) {
      try {
        // Get event title for notification message
        const { data: event } = await supabase
          .from('events')
          .select('title')
          .eq('id', proof.event_id)
          .single()

        await createNotification({
          supabase,
          tenantId: proof.tenant_id,
          userId: proof.uploaded_by,
          type: status === 'approved' ? 'proof_approved' : 'proof_rejected',
          title: `Design proof ${status}`,
          message: status === 'approved'
            ? `Your design for ${event?.title || 'event'} has been approved!`
            : `Your design for ${event?.title || 'event'} needs revision`,
          entityType: 'event',
          entityId: proof.event_id,
          linkUrl: `/events/${proof.event_id}?tab=files`,
          actorName: clientName.trim(),
        })
      } catch (notifyError) {
        // Log but don't fail - notification is not critical
        log.error({ error: notifyError }, 'Error sending design proof notification')
      }
    }

    log.info({
      proofId: proof.id,
      status,
      clientName: clientName.trim()
    }, 'Design proof response submitted')

    return NextResponse.json({
      success: true,
      proof: updatedProof
    })
  } catch (error) {
    log.error({ error }, 'Error responding to design proof')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
