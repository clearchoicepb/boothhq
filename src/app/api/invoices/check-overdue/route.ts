import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

// This endpoint checks for invoices that are past due and updates their status
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const today = new Date().toISOString().split('T')[0]

    // Find all invoices that are past due
    // (due_date < today AND status not in ('draft', 'paid_in_full', 'cancelled', 'past_due'))
    const { data: overdueInvoices, error: fetchError } = await supabase
      .from('invoices')
      .select('id, invoice_number, due_date, status')
      .eq('tenant_id', dataSourceTenantId)
      .lt('due_date', today)
      .in('status', ['no_payments_received', 'partially_paid'])

    if (fetchError) {
      console.error('Error fetching overdue invoices:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch overdue invoices' },
        { status: 500 }
      )
    }

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No overdue invoices found',
        updated: 0
      })
    }

    // Update all overdue invoices to 'past_due' status
    const invoiceIds = overdueInvoices.map(inv => inv.id)

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .in('id', invoiceIds)
      .eq('tenant_id', dataSourceTenantId)

    if (updateError) {
      console.error('Error updating overdue invoices:', updateError)
      return NextResponse.json(
        { error: 'Failed to update overdue invoices' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${overdueInvoices.length} overdue invoice(s) to past_due status`,
      updated: overdueInvoices.length,
      invoices: overdueInvoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        due_date: inv.due_date,
        old_status: inv.status,
        new_status: 'past_due'
      }))
    })

  } catch (error) {
    console.error('Error in check-overdue:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check which invoices are overdue without updating
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const today = new Date().toISOString().split('T')[0]

    const { data: overdueInvoices, error: fetchError } = await supabase
      .from('invoices')
      .select('id, invoice_number, due_date, status, total_amount, balance_amount')
      .eq('tenant_id', dataSourceTenantId)
      .lt('due_date', today)
      .in('status', ['no_payments_received', 'partially_paid'])

    if (fetchError) {
      console.error('Error fetching overdue invoices:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch overdue invoices' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      count: overdueInvoices?.length || 0,
      invoices: overdueInvoices || []
    })

  } catch (error) {
    console.error('Error in check-overdue GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
