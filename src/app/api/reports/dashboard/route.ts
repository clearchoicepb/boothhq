import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
// Helper function to count event days in a period
function countEventDays(events: any[], periodStart: Date, periodEnd: Date): number {
  if (!events) return 0

  let totalDays = 0

  events.forEach(event => {
    const eventStart = new Date(event.start_date)
    const eventEnd = new Date(event.end_date)

    // Find overlap between event and period
    const overlapStart = eventStart > periodStart ? eventStart : periodStart
    const overlapEnd = eventEnd < periodEnd ? eventEnd : periodEnd

    if (overlapStart <= overlapEnd) {
      // Count days (inclusive)
      const days = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      totalDays += days
    }
  })

  return totalDays
}

export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || 'this_month'
    const customStartParam = searchParams.get('startDate')
    const customEndParam = searchParams.get('endDate')

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    let endDate = new Date()
    let previousStartDate = new Date()
    let previousEndDate = new Date()

    // Handle custom date range
    if (range === 'custom' && customStartParam && customEndParam) {
      startDate = new Date(customStartParam)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(customEndParam)
      endDate.setHours(23, 59, 59, 999)

      // Calculate previous period (same duration)
      const durationMs = endDate.getTime() - startDate.getTime()
      previousEndDate = new Date(startDate)
      previousEndDate.setMilliseconds(-1)
      previousStartDate = new Date(previousEndDate.getTime() - durationMs)
      previousStartDate.setHours(0, 0, 0, 0)
    } else {
      // Handle preset ranges
      switch (range) {
      case 'this_week':
        // Start of this week (Sunday)
        startDate = new Date(now)
        startDate.setDate(now.getDate() - now.getDay())
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date()
        // Previous week
        previousEndDate = new Date(startDate)
        previousEndDate.setMilliseconds(-1)
        previousStartDate = new Date(previousEndDate)
        previousStartDate.setDate(previousEndDate.getDate() - 6)
        previousStartDate.setHours(0, 0, 0, 0)
        break
      case 'this_month':
        // Start of this month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        endDate = new Date()
        // Previous month
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
        previousEndDate = new Date(startDate)
        previousEndDate.setMilliseconds(-1)
        break
      case 'this_quarter':
        // Start of this quarter
        const currentQuarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0)
        endDate = new Date()
        // Previous quarter
        previousStartDate = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1, 0, 0, 0, 0)
        previousEndDate = new Date(startDate)
        previousEndDate.setMilliseconds(-1)
        break
      case 'this_year':
        // Start of this year
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
        endDate = new Date()
        // Previous year
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0)
        previousEndDate = new Date(startDate)
        previousEndDate.setMilliseconds(-1)
        break
      case 'yesterday':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(startDate)
        endDate.setHours(23, 59, 59, 999)
        // Day before yesterday
        previousStartDate = new Date(startDate)
        previousStartDate.setDate(startDate.getDate() - 1)
        previousEndDate = new Date(previousStartDate)
        previousEndDate.setHours(23, 59, 59, 999)
        break
      case 'last_week':
        // Start of last week (Sunday)
        const lastWeekStart = new Date(now)
        lastWeekStart.setDate(now.getDate() - now.getDay() - 7)
        lastWeekStart.setHours(0, 0, 0, 0)
        startDate = lastWeekStart
        endDate = new Date(lastWeekStart)
        endDate.setDate(lastWeekStart.getDate() + 6)
        endDate.setHours(23, 59, 59, 999)
        // Week before last
        previousStartDate = new Date(startDate)
        previousStartDate.setDate(startDate.getDate() - 7)
        previousEndDate = new Date(previousStartDate)
        previousEndDate.setDate(previousStartDate.getDate() + 6)
        previousEndDate.setHours(23, 59, 59, 999)
        break
      case 'last_quarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1
        const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear()
        const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3
        startDate = new Date(lastQuarterYear, lastQuarterMonth, 1, 0, 0, 0, 0)
        endDate = new Date(lastQuarterYear, lastQuarterMonth + 3, 0, 23, 59, 59, 999)
        // Quarter before last
        const prevQuarter = lastQuarter - 1
        const prevQuarterYear = prevQuarter < 0 ? lastQuarterYear - 1 : lastQuarterYear
        const prevQuarterMonth = prevQuarter < 0 ? 9 : prevQuarter * 3
        previousStartDate = new Date(prevQuarterYear, prevQuarterMonth, 1, 0, 0, 0, 0)
        previousEndDate = new Date(prevQuarterYear, prevQuarterMonth + 3, 0, 23, 59, 59, 999)
        break
      case 'last_year':
        startDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0)
        endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
        // Year before last
        previousStartDate = new Date(now.getFullYear() - 2, 0, 1, 0, 0, 0, 0)
        previousEndDate = new Date(now.getFullYear() - 2, 11, 31, 23, 59, 59, 999)
        break
      default:
        // Default to this month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        endDate = new Date()
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
        previousEndDate = new Date(startDate)
        previousEndDate.setMilliseconds(-1)
      }
    }

    const tenantId = session.user.tenantId

    // 1. Total Revenue Generated (invoices created in period)
    const { data: currentInvoices } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const { data: previousInvoices } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .gte('created_at', previousStartDate.toISOString())
      .lte('created_at', previousEndDate.toISOString())

    const totalRevenueGenerated = currentInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0
    const prevRevenueGenerated = previousInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0
    const revenueGeneratedChange = prevRevenueGenerated > 0 ? ((totalRevenueGenerated - prevRevenueGenerated) / prevRevenueGenerated) * 100 : 0

    // 2. Total Payments Received (payments received in period)
    // Note: After running add-tenant-to-payments.sql migration, we can query directly by tenant_id
    const { data: currentPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('tenant_id', tenantId)
      .gte('payment_date', startDate.toISOString())
      .lte('payment_date', endDate.toISOString())

    const { data: previousPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('tenant_id', tenantId)
      .gte('payment_date', previousStartDate.toISOString())
      .lte('payment_date', previousEndDate.toISOString())

    const totalPaymentsReceived = currentPayments?.reduce((sum, pmt) => sum + (pmt.amount || 0), 0) || 0
    const prevPaymentsReceived = previousPayments?.reduce((sum, pmt) => sum + (pmt.amount || 0), 0) || 0
    const paymentsReceivedChange = prevPaymentsReceived > 0 ? ((totalPaymentsReceived - prevPaymentsReceived) / prevPaymentsReceived) * 100 : 0

    // 3. Total Events Booked (opportunities won in period)
    const { data: currentWonOpps, error: wonOppsError } = await supabase
      .from('opportunities')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('stage', 'closed_won')
      .gte('updated_at', startDate.toISOString())
      .lte('updated_at', endDate.toISOString())

    if (wonOppsError) {
      console.error('Error fetching won opportunities:', wonOppsError)
    }
    console.log('Current won opps:', currentWonOpps?.length, 'from', startDate.toISOString(), 'to', endDate.toISOString())

    const { data: previousWonOpps } = await supabase
      .from('opportunities')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('stage', 'closed_won')
      .gte('updated_at', previousStartDate.toISOString())
      .lte('updated_at', previousEndDate.toISOString())

    const totalEventsBooked = currentWonOpps?.length || 0
    const prevEventsBooked = previousWonOpps?.length || 0
    const eventsBookedChange = prevEventsBooked > 0 ? ((totalEventsBooked - prevEventsBooked) / prevEventsBooked) * 100 : 0

    // 4. Total Scheduled Events (event days in period)
    // First, let's see ALL events for this tenant
    const { data: allEvents } = await supabase
      .from('events')
      .select('id, start_date, end_date, event_type')
      .eq('tenant_id', tenantId)

    console.log('ALL events in database for tenant:', JSON.stringify(allEvents, null, 2))

    // Get all events that overlap with the period (start_date <= period_end AND end_date >= period_start)
    const { data: currentEvents, error: eventsError } = await supabase
      .from('events')
      .select('start_date, end_date')
      .eq('tenant_id', tenantId)
      .lte('start_date', endDate.toISOString())
      .gte('end_date', startDate.toISOString())

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
    }
    console.log('Period:', startDate.toISOString(), 'to', endDate.toISOString())
    console.log('Current events found:', currentEvents?.length)
    console.log('Matching events:', JSON.stringify(currentEvents, null, 2))

    const { data: previousEvents } = await supabase
      .from('events')
      .select('start_date, end_date')
      .eq('tenant_id', tenantId)
      .lte('start_date', previousEndDate.toISOString())
      .gte('end_date', previousStartDate.toISOString())

    // Count event days
    const totalScheduledEvents = countEventDays(currentEvents, startDate, endDate)
    const prevScheduledEvents = countEventDays(previousEvents, previousStartDate, previousEndDate)
    const scheduledEventsChange = prevScheduledEvents > 0 ? ((totalScheduledEvents - prevScheduledEvents) / prevScheduledEvents) * 100 : 0

    console.log('Total scheduled events:', totalScheduledEvents)

    // Get revenue and payments by month (last 6 months for chart)
    const revenueByMonth = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)
      monthEnd.setDate(0)
      monthEnd.setHours(23, 59, 59, 999)

      const { data: monthRevenue } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('tenant_id', tenantId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())

      const { data: monthPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('tenant_id', tenantId)
        .gte('payment_date', monthStart.toISOString())
        .lte('payment_date', monthEnd.toISOString())

      const revenue = monthRevenue?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0
      const payments = monthPayments?.reduce((sum, pmt) => sum + (pmt.amount || 0), 0) || 0

      revenueByMonth.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        revenue: Math.round(revenue),
        payments: Math.round(payments)
      })
    }

    // Get events booked and scheduled by month
    const eventsByMonth = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)
      monthEnd.setDate(0)
      monthEnd.setHours(23, 59, 59, 999)

      // Events booked (opportunities won)
      const { data: monthWonOpps } = await supabase
        .from('opportunities')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('stage', 'closed_won')
        .gte('updated_at', monthStart.toISOString())
        .lte('updated_at', monthEnd.toISOString())

      // Scheduled event days
      const { data: monthEvents } = await supabase
        .from('events')
        .select('start_date, end_date')
        .eq('tenant_id', tenantId)
        .lte('start_date', monthEnd.toISOString())
        .gte('end_date', monthStart.toISOString())

      const booked = monthWonOpps?.length || 0
      const scheduled = countEventDays(monthEvents, monthStart, monthEnd)

      eventsByMonth.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        booked,
        scheduled
      })
    }

    // Get invoice status breakdown
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('status, total_amount')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const statusMap = new Map<string, { count: number; amount: number }>()
    invoicesData?.forEach(invoice => {
      const status = invoice.status || 'Unknown'
      const current = statusMap.get(status) || { count: 0, amount: 0 }
      statusMap.set(status, {
        count: current.count + 1,
        amount: current.amount + (invoice.total_amount || 0)
      })
    })

    const invoicesByStatus = Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      count: data.count,
      amount: Math.round(data.amount)
    }))

    return NextResponse.json({
      dashboard: {
        totalRevenueGenerated: Math.round(totalRevenueGenerated),
        totalPaymentsReceived: Math.round(totalPaymentsReceived),
        totalEventsBooked,
        totalScheduledEvents,
        revenueGeneratedChange: Math.round(revenueGeneratedChange * 10) / 10,
        paymentsReceivedChange: Math.round(paymentsReceivedChange * 10) / 10,
        eventsBookedChange: Math.round(eventsBookedChange * 10) / 10,
        scheduledEventsChange: Math.round(scheduledEventsChange * 10) / 10
      },
      revenueByMonth,
      eventsByMonth,
      paymentsByMonth: revenueByMonth.map(m => ({ month: m.month, amount: m.payments })),
      invoicesByStatus
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
