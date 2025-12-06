import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:contracts')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = await params

    // Get contract data
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Check if contract has expired
    if (contract.expires_at && new Date(contract.expires_at) < new Date()) {
      await supabase
        .from('contracts')
        .update({ status: 'expired' })
        .eq('id', id)
        .eq('tenant_id', dataSourceTenantId)
      
      return NextResponse.json({ error: 'Contract has expired' }, { status: 410 })
    }

    // Fetch tenant logo (if available) for display on public signing page
    let logoUrl = null
    try {
      const { data: settings } = await supabase
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', dataSourceTenantId)
        .eq('setting_key', 'appearance.logoUrl')
        .single()
      
      if (settings?.setting_value) {
        logoUrl = settings.setting_value
      }
    } catch (error) {
      // Logo is optional, don't fail if it doesn't exist
      log.debug('No logo configured for tenant')
    }

    // Return contract with logo URL for public display
    return NextResponse.json({
      ...contract,
      logoUrl
    })
  } catch (error) {
    log.error({ error }, 'Error fetching contract')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    const { data, error } = await supabase
      .from('contracts')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      log.error({ error }, 'Database error')
      return NextResponse.json(
        { error: 'Failed to update contract' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error updating contract')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // First, get the contract to check if it exists and if it's signed
    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('status, event_id')
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (fetchError || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Optional: Prevent deletion of signed contracts
    if (contract.status === 'signed') {
      return NextResponse.json(
        { error: 'Cannot delete signed contracts' },
        { status: 400 }
      )
    }

    // Delete the associated attachment record if it exists
    // (Look for attachments with this contract ID in the description)
    if (contract.event_id) {
      await supabase
        .from('attachments')
        .delete()
        .eq('entity_type', 'event')
        .eq('entity_id', contract.event_id)
        .like('description', `%[CONTRACT:${id}]%`)
    }

    // Delete the contract
    const { error: deleteError } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (deleteError) {
      log.error({ deleteError }, 'Database error')
      return NextResponse.json(
        { error: 'Failed to delete contract' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Contract deleted successfully' })
  } catch (error) {
    log.error({ error }, 'Error deleting contract')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

