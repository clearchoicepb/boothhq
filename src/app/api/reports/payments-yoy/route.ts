import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { getESTDateParts } from '@/lib/utils/date-utils'

const log = createLogger('api:payments-yoy')

export async function GET(_request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    // Get current year in EST for consistent date handling
    const estNow = getESTDateParts()
    const currentYear = estNow.year
    const previousYear = currentYear - 1

    // Use date strings for year boundaries to avoid timezone issues
    const currentYearStartISO = `${currentYear}-01-01`
    const currentYearEndISO = `${currentYear}-12-31T23:59:59.999Z`

    const { data: currentYearPayments, error: currentError } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .eq('tenant_id', dataSourceTenantId)
      .gte('payment_date', currentYearStartISO)
      .lte('payment_date', currentYearEndISO)

    if (currentError) {
      log.error({ currentError }, 'Error fetching current year payments')
    }

    // Previous year boundaries
    const previousYearStartISO = `${previousYear}-01-01`
    const previousYearEndISO = `${previousYear}-12-31T23:59:59.999Z`

    const { data: previousYearPayments, error: previousError } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .eq('tenant_id', dataSourceTenantId)
      .gte('payment_date', previousYearStartISO)
      .lte('payment_date', previousYearEndISO)

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
    // Extract month from date string to avoid timezone conversion issues
    currentYearPayments?.forEach(payment => {
      const dateStr = payment.payment_date?.split('T')[0] || ''
      const month = parseInt(dateStr.split('-')[1], 10) - 1 // Convert to 0-indexed month
      if (!isNaN(month) && month >= 0 && month < 12) {
        currentByMonth.set(month, (currentByMonth.get(month) || 0) + (payment.amount || 0))
      }
    })

    // Sum previous year by month
    previousYearPayments?.forEach(payment => {
      const dateStr = payment.payment_date?.split('T')[0] || ''
      const month = parseInt(dateStr.split('-')[1], 10) - 1 // Convert to 0-indexed month
      if (!isNaN(month) && month >= 0 && month < 12) {
        previousByMonth.set(month, (previousByMonth.get(month) || 0) + (payment.amount || 0))
      }
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
