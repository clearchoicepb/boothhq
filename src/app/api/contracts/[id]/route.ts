import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

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
      console.log('No logo configured for tenant')
    }

    // Return contract with logo URL for public display
    return NextResponse.json({
      ...contract,
      logoUrl
    })
  } catch (error) {
    console.error('Error fetching contract:', error)
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
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update contract' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating contract:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

