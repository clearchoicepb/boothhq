import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:public:contracts')

/**
 * Public API for fetching contract data for signing
 * This route does not require authentication - it uses service role
 * to allow clients to view and sign contracts.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Contract ID required' }, { status: 400 })
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabaseUrl = process.env.DEFAULT_TENANT_DATA_URL
    const supabaseServiceKey = process.env.DEFAULT_TENANT_DATA_SERVICE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      log.error({}, 'Missing database configuration')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch contract by ID (exclude deleted)
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        id,
        tenant_id,
        template_name,
        content,
        status,
        signer_name,
        signer_email,
        recipient_name,
        recipient_email,
        signed_at,
        signed_by,
        signature_data,
        expires_at,
        created_at,
        deleted_at
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (contractError || !contract) {
      log.error({ error: contractError, id }, 'Contract not found')
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Check if contract has expired
    if (contract.expires_at && new Date(contract.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from('contracts')
        .update({ status: 'expired' })
        .eq('id', id)

      return NextResponse.json({ error: 'Contract has expired' }, { status: 410 })
    }

    // Fetch tenant logo
    let logoUrl = null
    try {
      const { data: settings } = await supabase
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', contract.tenant_id)
        .eq('setting_key', 'appearance.logoUrl')
        .single()

      if (settings?.setting_value) {
        logoUrl = settings.setting_value
      }
    } catch {
      log.debug({}, 'No logo configured for tenant')
    }

    // Return contract with logo and title alias
    return NextResponse.json({
      ...contract,
      title: contract.template_name,  // Alias for compatibility
      logoUrl
    })
  } catch (error) {
    log.error({ error }, 'Error fetching public contract')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
