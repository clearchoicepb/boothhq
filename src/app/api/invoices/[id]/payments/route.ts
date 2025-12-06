import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:invoices')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = await params

    // Fetch payments for this invoice
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', id)
      .eq('tenant_id', dataSourceTenantId)
      .order('processed_at', { ascending: false })

    if (error) {
      log.error({ error }, 'Error fetching payments')
      // If the table doesn't exist yet, return empty array instead of error
      if (error.code === '42P01') {
        log.warn('Payments table does not exist yet. Run migration 20251112000002_add_stripe_fields_to_payments.sql')
        return NextResponse.json([])
      }
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    return NextResponse.json(payments || [])
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
