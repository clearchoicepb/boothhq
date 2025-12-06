import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:locations')
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const params = await routeContext.params
    const locationId = params.id
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', locationId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      log.error({ error }, 'Error fetching location')
      return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const params = await routeContext.params
    const locationId = params.id
    const body = await request.json()
    const { data, error } = await supabase
      .from('locations')
      .update(body)
      .eq('id', locationId)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      log.error({ error }, 'Error updating location')
      return NextResponse.json({ error: 'Failed to update location', details: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const params = await routeContext.params
    const locationId = params.id
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', locationId)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      log.error({ error }, 'Error deleting location')
      return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
