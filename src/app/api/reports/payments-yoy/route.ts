import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:payments-yoy')

export async function GET(_request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    const now = new Date()
    const currentYear = now.getFullYear()
    const previousYear = currentYear - 1

    // Fetch all payments for current year
    const currentYearStart = new Date(currentYear, 0, 1, 0, 0, 0, 0)
    const currentYearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999)

    const { data: currentYearPayments, error: currentError } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .eq('tenant_id', dataSourceTenantId)
      .gte('payment_date', currentYearStart.toISOString())
      .lte('payment_date', currentYearEnd.toISOString())

    if (currentError) {
      log.error({ currentError }, 'Error fetching current year payments')
    }

    // Fetch all payments for previous year
    const previousYearStart = new Date(previousYear, 0, 1, 0, 0, 0, 0)
    const previousYearEnd = new Date(previousYear, 11, 31, 23, 59, 59, 999)

    const { data: previousYearPayments, error: previousError } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .eq('tenant_id', dataSourceTenantId)
      .gte('payment_date', previousYearStart.toISOString())
      .lte('payment_date', previousYearEnd.toISOString())

    if (previousError) {
      log.error({ previousError }, 'Error fetching previous year payments')
    }

    // Group payments by month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const currentByMonth = new Map<number, number>()
    const previousByMonth = new Map<number, number>()

    // Initialize all months to 0
    for (let i = 0; i < 12; i++) {
      currentByMonth.set(i, 0)
      previousByMonth.set(i, 0)
    }

    // Sum current year by month
    currentYearPayments?.forEach(payment => {
      const date = new Date(payment.payment_date)
      const month = date.getMonth()
      currentByMonth.set(month, (currentByMonth.get(month) || 0) + (payment.amount || 0))
    })

    // Sum previous year by month
    previousYearPayments?.forEach(payment => {
      const date = new Date(payment.payment_date)
      const month = date.getMonth()
      previousByMonth.set(month, (previousByMonth.get(month) || 0) + (payment.amount || 0))
    })

    // Build monthly comparison data
    let currentYTD = 0
    let previousYTD = 0

    const monthlyData = monthNames.map((name, index) => {
      const currentAmount = Math.round((currentByMonth.get(index) || 0) * 100) / 100
      const previousAmount = Math.round((previousByMonth.get(index) || 0) * 100) / 100

      currentYTD += currentAmount
      previousYTD += previousAmount

      const monthlyChange = previousAmount > 0
        ? Math.round(((currentAmount - previousAmount) / previousAmount) * 1000) / 10
        : currentAmount > 0 ? 100 : 0

      return {
        month: name,
        monthIndex: index,
        currentYear: currentAmount,
        previousYear: previousAmount,
        change: monthlyChange,
        currentYTD: Math.round(currentYTD * 100) / 100,
        previousYTD: Math.round(previousYTD * 100) / 100
      }
    })

    // Calculate overall YTD change
    const ytdChange = previousYTD > 0
      ? Math.round(((currentYTD - previousYTD) / previousYTD) * 1000) / 10
      : currentYTD > 0 ? 100 : 0

    return NextResponse.json({
      currentYear,
      previousYear,
      monthlyData,
      summary: {
        currentYearTotal: Math.round(currentYTD * 100) / 100,
        previousYearTotal: Math.round(previousYTD * 100) / 100,
        ytdChange
      }
    })
  } catch (error) {
    log.error({ error }, 'Error in payments YoY')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
