import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:booths')
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const params = await routeContext.params
    const boothId = params.id

    const { data, error } = await supabase
      .from('booths')
      .select(`
        *,
        assigned_event:events!booths_assigned_to_event_id_fkey(title, start_date, end_date),
        assigned_user:users!booths_assigned_to_user_id_fkey(first_name, last_name)
      `)
      .eq('id', boothId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      log.error({ error }, 'Error fetching booth')
      return NextResponse.json({ error: 'Failed to fetch booth' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Booth not found' }, { status: 404 })
    }

    // Transform the data to include assigned_event_name and assigned_user_name
    const transformedData = {
      ...data,
      assigned_event_name: data.assigned_event?.title || null,
      assigned_event_start: data.assigned_event?.start_date || null,
      assigned_event_end: data.assigned_event?.end_date || null,
      assigned_user_name: data.assigned_user ?
        `${data.assigned_user.first_name} ${data.assigned_user.last_name}`.trim() : null
    }

    return NextResponse.json(transformedData)
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
    const boothId = params.id
    const body = await request.json()
    const { data, error } = await supabase
      .from('booths')
      .update(body)
      .eq('id', boothId)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      log.error({ error }, 'Error updating booth')
      return NextResponse.json({ error: 'Failed to update booth' }, { status: 500 })
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
    const boothId = params.id
    const { error } = await supabase
      .from('booths')
      .delete()
      .eq('id', boothId)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      log.error({ error }, 'Error deleting booth')
      return NextResponse.json({ error: 'Failed to delete booth' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
