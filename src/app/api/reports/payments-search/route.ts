import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import {
  getTodayRange,
  getWeekRange,
  getMonthRange,
  getQuarterRange,
  getYearRange,
  parseLocalDate
} from '@/lib/utils/date-utils'

const log = createLogger('api:payments-search')

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const preset = searchParams.get('preset') || 'this_month'

    // Calculate date range based on preset or custom dates (all in EST)
    let dateStartISO: string
    let dateEndISO: string

    if (startDate && endDate) {
      // Custom date range - parse as local dates (no timezone conversion)
      dateStartISO = startDate
      dateEndISO = endDate
    } else {
      // Use preset with EST-aware date utilities
      let range
      switch (preset) {
        case 'today':
          range = getTodayRange()
          break
        case 'this_week':
          range = getWeekRange()
          break
        case 'this_month':
          range = getMonthRange()
          break
        case 'this_quarter':
          range = getQuarterRange()
          break
        case 'this_year':
          range = getYearRange()
          break
        default:
          range = getMonthRange()
      }
      dateStartISO = range.startISO
      dateEndISO = range.endISO
    }

    // Fetch payments in date range
    // Use date strings for comparison (YYYY-MM-DD format)
    // This avoids timezone issues - compares dates as stored in DB
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        invoice_id,
        amount,
        payment_date,
        payment_method,
        reference_number,
        notes
      `)
      .eq('tenant_id', dataSourceTenantId)
      .gte('payment_date', dateStartISO)
      .lte('payment_date', dateEndISO + 'T23:59:59.999Z')
      .order('payment_date', { ascending: false })

    if (paymentsError) {
      log.error({ paymentsError }, 'Error fetching payments')
      return NextResponse.json({ error: paymentsError.message }, { status: 500 })
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json({
        payments: [],
        totalAmount: 0,
        dateRange: {
          start: dateStartISO,
          end: dateEndISO
        }
      })
    }

    // Get invoice details for each payment
    const invoiceIds = [...new Set(payments.map(p => p.invoice_id))]
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, account_id')
      .in('id', invoiceIds)

    const invoiceMap = new Map(invoices?.map(inv => [inv.id, inv]) || [])

    // Get account names
    const accountIds = [...new Set(invoices?.map(inv => inv.account_id).filter(Boolean) || [])]
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name')
      .in('id', accountIds)

    const accountMap = new Map(accounts?.map(a => [a.id, a.name]) || [])

    // Build response with invoice and account info
    const paymentsWithDetails = payments.map(payment => {
      const invoice = invoiceMap.get(payment.invoice_id)
      return {
        id: payment.id,
        invoice_id: payment.invoice_id,
        payment_date: payment.payment_date,
        invoice_number: invoice?.invoice_number || 'Unknown',
        account_name: invoice?.account_id ? (accountMap.get(invoice.account_id) || 'Unknown') : 'Unknown',
        amount: payment.amount || 0,
        payment_method: payment.payment_method || 'Not specified',
        reference_number: payment.reference_number,
        notes: payment.notes
      }
    })

    const totalAmount = paymentsWithDetails.reduce((sum, p) => sum + p.amount, 0)

    return NextResponse.json({
      payments: paymentsWithDetails,
      totalAmount: Math.round(totalAmount * 100) / 100,
      count: paymentsWithDetails.length,
      dateRange: {
        start: dateStartISO,
        end: dateEndISO
      }
    })
  } catch (error) {
    log.error({ error }, 'Error in payments search')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
