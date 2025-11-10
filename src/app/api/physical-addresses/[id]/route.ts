import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/physical-addresses/[id] - Update physical address
export async function PUT(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await routeContext.params
    const addressId = params.id
    const body = await request.json()

    const { data, error } = await supabase
      .from('physical_addresses')
      .update(body)
      .eq('id', addressId)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to update physical address',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/physical-addresses/[id] - Delete physical address
export async function DELETE(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await routeContext.params
    const addressId = params.id

    const { error } = await supabase
      .from('physical_addresses')
      .delete()
      .eq('id', addressId)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      return NextResponse.json({
        error: 'Failed to delete physical address',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
