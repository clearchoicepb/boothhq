/**
 * Payroll Periods API Route
 *
 * GET /api/payroll/periods - Get list of available payroll periods
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { getPayrollPeriodOptions } from '@/lib/payroll-calculator'

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const periods = getPayrollPeriodOptions()

    // Convert dates to ISO strings for JSON serialization
    const serializedPeriods = periods.map(p => ({
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
      payoutDate: p.payoutDate.toISOString(),
      label: p.label
    }))

    return NextResponse.json(serializedPeriods)
  } catch (error) {
    console.error('Error fetching payroll periods:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
