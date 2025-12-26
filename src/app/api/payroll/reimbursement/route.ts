/**
 * Payroll Reimbursement API Route
 *
 * PATCH /api/payroll/reimbursement - Create or update reimbursement
 * Body:
 *   - userId: string
 *   - periodStart: string (ISO date)
 *   - periodEnd: string (ISO date)
 *   - amount: number
 *   - notes: string (optional)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:payroll:reimbursement')

export async function PATCH(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, periodStart, periodEnd, amount, notes } = body

    if (!userId || !periodStart || !periodEnd) {
      return NextResponse.json({
        error: 'Missing required fields: userId, periodStart, periodEnd'
      }, { status: 400 })
    }

    if (typeof amount !== 'number') {
      return NextResponse.json({
        error: 'Amount must be a number'
      }, { status: 400 })
    }

    // Upsert the adjustment (unique constraint on tenant_id, user_id, period_start, period_end)
    const { data, error } = await supabase
      .from('payroll_adjustments')
      .upsert({
        tenant_id: dataSourceTenantId,
        user_id: userId,
        period_start: periodStart,
        period_end: periodEnd,
        amount,
        notes: notes || null,
        updated_at: new Date().toISOString(),
        created_by: session.user.id
      }, {
        onConflict: 'tenant_id,user_id,period_start,period_end'
      })
      .select()
      .single()

    if (error) {
      log.error({ error }, 'Failed to save reimbursement')
      return NextResponse.json({
        error: 'Failed to save reimbursement',
        details: error.message
      }, { status: 500 })
    }

    log.debug({ userId, amount }, 'Reimbursement saved')

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error saving reimbursement')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const periodStart = searchParams.get('periodStart')
    const periodEnd = searchParams.get('periodEnd')

    if (!periodStart || !periodEnd) {
      return NextResponse.json({
        error: 'Missing required params: periodStart, periodEnd'
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('payroll_adjustments')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)

    if (error) {
      log.error({ error }, 'Failed to fetch reimbursements')
      return NextResponse.json({
        error: 'Failed to fetch reimbursements'
      }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    log.error({ error }, 'Error fetching reimbursements')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
