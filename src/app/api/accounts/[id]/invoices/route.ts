import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:accounts')
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // 'upcoming', 'all'

    let query = supabase
      .from('invoices')
      .select(`
        *,
        events!invoices_event_id_fkey(id, title, start_date, status)
      `)
      .eq('account_id', id)
      .eq('tenant_id', dataSourceTenantId)
      .order('due_date', { ascending: true })

    if (type === 'upcoming') {
      query = query.gte('due_date', new Date().toISOString().split('T')[0])
    }

    const { data, error } = await query

    if (error) {
      log.error({ error }, 'Error fetching account invoices')
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    const response = NextResponse.json(data || [])
    // Use short-lived cache to ensure fresh data after mutations
    response.headers.set('Cache-Control', 'private, no-cache, must-revalidate, max-age=0')
    return response
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
