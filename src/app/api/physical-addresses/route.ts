import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/physical-addresses - Fetch all physical addresses for tenant
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    const { data, error } = await supabase
      .from('physical_addresses')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('location_name', { ascending: true })

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch physical addresses',
        details: error.message,
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/physical-addresses - Create new physical address
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const addressData = {
      ...body,
      tenant_id: dataSourceTenantId
    }

    const { data, error } = await supabase
      .from('physical_addresses')
      .insert(addressData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to create physical address',
        details: error.message,
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
