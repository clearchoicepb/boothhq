import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:payment-status-options')
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { data, error } = await supabase
      .from('payment_status_options')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      log.error({ error }, 'Error fetching payment status options')
      return NextResponse.json({ error: 'Failed to fetch payment status options' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
