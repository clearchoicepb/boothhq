import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:public:design-proofs')

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
 * GET /api/public/design-proofs/[token]
 * Get design proof by public token (no auth required)
 */
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ token: string }> }
) {
  try {
    const params = await routeContext.params
    const { token } = params

    // Validate token format (64-character hex)
    if (!token || token.length !== 64) {
      return NextResponse.json(
        { error: 'Invalid proof token' },
        { status: 400 }
      )
    }

    const supabase = await getPublicSupabaseClient()

    // Fetch proof by public token
    const { data: proof, error } = await supabase
      .from('design_proofs')
      .select(`
        id,
        tenant_id,
        event_id,
        file_name,
        file_type,
        file_size,
        storage_path,
        status,
        uploaded_at,
        viewed_at,
        responded_at,
        client_name,
        client_notes
      `)
      .eq('public_token', token)
      .single()

    if (error || !proof) {
      log.error({ error, token: token.substring(0, 8) + '...' }, 'Proof not found')
      return NextResponse.json(
        { error: 'Design proof not found' },
        { status: 404 }
      )
    }

    // Generate signed URL for the file (1 hour expiry)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('attachments')
      .createSignedUrl(proof.storage_path, 3600)

    if (urlError) {
      log.error({ urlError }, 'Failed to generate signed URL')
      return NextResponse.json(
        { error: 'Failed to load proof image' },
        { status: 500 }
      )
    }

    // Fetch event title for context
    const { data: event } = await supabase
      .from('events')
      .select('title')
      .eq('id', proof.event_id)
      .single()

    // Fetch tenant branding (logo)
    const { data: logoSetting } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', proof.tenant_id)
      .eq('setting_key', 'appearance.logoUrl')
      .single()

    // Update viewed_at if this is the first view
    if (!proof.viewed_at) {
      const { error: updateError } = await supabase
        .from('design_proofs')
        .update({ viewed_at: new Date().toISOString() })
        .eq('public_token', token)

      if (updateError) {
        log.error({ updateError }, 'Failed to update viewed_at')
        // Non-critical error, continue
      } else {
        log.info({ proofId: proof.id }, 'Design proof marked as viewed')
      }
    }

    return NextResponse.json({
      proof: {
        id: proof.id,
        file_name: proof.file_name,
        file_type: proof.file_type,
        file_size: proof.file_size,
        status: proof.status,
        uploaded_at: proof.uploaded_at,
        viewed_at: proof.viewed_at,
        responded_at: proof.responded_at,
        client_name: proof.client_name,
        client_notes: proof.client_notes,
        signed_url: signedUrlData.signedUrl,
      },
      event: {
        title: event?.title || 'Event',
      },
      tenant: {
        logoUrl: logoSetting?.setting_value || null,
      },
    })
  } catch (error) {
    log.error({ error }, 'Error fetching public design proof')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
