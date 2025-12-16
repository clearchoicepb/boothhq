import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:payments-forecast')

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    // Get month and year from params (default to current month)
    const now = new Date()
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1))
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()))

    // Calculate start and end of the selected month
    const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0)
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)

    // Check if we're viewing the current month (to include overdue invoices)
    const isCurrentMonth = month === (now.getMonth() + 1) && year === now.getFullYear()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let invoices: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let invoicesError: any = null

    if (isCurrentMonth) {
      // For current month: fetch invoices due in this month OR overdue (due before this month)
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          account_id,
          due_date,
          total_amount,
          status,
          created_at
        `)
        .eq('tenant_id', dataSourceTenantId)
        .lte('due_date', monthEnd.toISOString()) // Due on or before end of current month
        .order('due_date', { ascending: true })

      invoices = data || []
      invoicesError = error
    } else {
      // For future months: only fetch invoices due in that specific month
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          account_id,
          due_date,
          total_amount,
          status,
          created_at
        `)
        .eq('tenant_id', dataSourceTenantId)
        .gte('due_date', monthStart.toISOString())
        .lte('due_date', monthEnd.toISOString())
        .order('due_date', { ascending: true })

      invoices = data || []
      invoicesError = error
    }

    if (invoicesError) {
      log.error({ invoicesError }, 'Error fetching invoices')
      return NextResponse.json({ error: invoicesError.message }, { status: 500 })
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({
        invoices: [],
        totalExpected: 0,
        totalBalance: 0,
        monthLabel: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      })
    }

    // Get all payments for these invoices
    const invoiceIds = invoices.map(inv => inv.id)
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('invoice_id, amount')
      .in('invoice_id', invoiceIds)

    if (paymentsError) {
      log.error({ paymentsError }, 'Error fetching payments')
    }

    // Calculate payments received per invoice
    const paymentsByInvoice = new Map<string, number>()
    payments?.forEach(payment => {
      const current = paymentsByInvoice.get(payment.invoice_id) || 0
      paymentsByInvoice.set(payment.invoice_id, current + (payment.amount || 0))
    })

    // Get account names
    const accountIds = [...new Set(invoices.map(inv => inv.account_id).filter(Boolean))]
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name')
      .in('id', accountIds)

    const accountMap = new Map(accounts?.map(a => [a.id, a.name]) || [])

    // Build response with balance calculations
    const invoicesWithBalance = invoices.map(invoice => {
      const paymentsReceived = paymentsByInvoice.get(invoice.id) || 0
      const balance = (invoice.total_amount || 0) - paymentsReceived
      const dueDate = new Date(invoice.due_date)
      const isOverdue = dueDate < monthStart // Due before the start of selected month

      return {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        account_name: accountMap.get(invoice.account_id) || 'Unknown',
        due_date: invoice.due_date,
        total_amount: invoice.total_amount || 0,
        payments_received: paymentsReceived,
        balance: balance,
        status: invoice.status,
        is_overdue: isOverdue
      }
    }).filter(inv => inv.balance > 0) // Only show invoices with outstanding balance

    const totalExpected = invoicesWithBalance.reduce((sum, inv) => sum + inv.total_amount, 0)
    const totalBalance = invoicesWithBalance.reduce((sum, inv) => sum + inv.balance, 0)

    // Calculate overdue totals separately
    const overdueInvoices = invoicesWithBalance.filter(inv => inv.is_overdue)
    const overdueBalance = overdueInvoices.reduce((sum, inv) => sum + inv.balance, 0)

    return NextResponse.json({
      invoices: invoicesWithBalance,
      totalExpected: Math.round(totalExpected * 100) / 100,
      totalBalance: Math.round(totalBalance * 100) / 100,
      overdueCount: overdueInvoices.length,
      overdueBalance: Math.round(overdueBalance * 100) / 100,
      monthLabel: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      isCurrentMonth
    })
  } catch (error) {
    log.error({ error }, 'Error in payments forecast')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
