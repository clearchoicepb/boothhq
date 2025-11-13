import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/payments/[id]
 * Get a specific payment by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = await params

    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Error fetching payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/payments/[id]
 * Update an existing payment
 * Recalculates invoice balance based on new payment amount
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = await params
    const body = await request.json()

    console.log('[Payment API] Updating payment:', id)

    // Get the existing payment to check the old amount
    const { data: existingPayment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (fetchError || !existingPayment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    const oldAmount = existingPayment.amount
    const newAmount = parseFloat(body.amount)

    // Update payment record
    const paymentUpdate = {
      amount: newAmount,
      payment_date: body.payment_date,
      payment_method: body.payment_method,
      status: body.status || 'completed',
      reference_number: body.reference_number || null,
      notes: body.notes || null,
    }

    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update(paymentUpdate)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (updateError) {
      console.error('[Payment API] Error updating payment:', updateError)
      return NextResponse.json(
        { error: 'Failed to update payment' },
        { status: 500 }
      )
    }

    // Recalculate invoice totals
    await recalculateInvoiceFromPayments(
      supabase,
      existingPayment.invoice_id,
      dataSourceTenantId
    )

    return NextResponse.json(updatedPayment)
  } catch (error) {
    console.error('Error updating payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/payments/[id]
 * Delete a payment and recalculate invoice balance
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = await params
    const body = await request.json()

    console.log('[Payment API] Deleting payment:', id)

    // Get the payment before deleting to know which invoice to update
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('invoice_id')
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (fetchError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Delete the payment
    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (deleteError) {
      console.error('[Payment API] Error deleting payment:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete payment' },
        { status: 500 }
      )
    }

    // Recalculate invoice totals
    await recalculateInvoiceFromPayments(
      supabase,
      payment.invoice_id,
      dataSourceTenantId
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Helper function to recalculate invoice paid_amount, balance_amount, and status
 * based on current payments
 */
async function recalculateInvoiceFromPayments(
  supabase: any,
  invoiceId: string,
  tenantId: string
) {
  // Get invoice details
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .single()

  if (invoiceError || !invoice) {
    console.error('Error fetching invoice for recalculation:', invoiceError)
    return
  }

  // Sum all completed payments for this invoice
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('amount, status')
    .eq('invoice_id', invoiceId)
    .eq('tenant_id', tenantId)

  if (paymentsError) {
    console.error('Error fetching payments for recalculation:', paymentsError)
    return
  }

  // Calculate total paid (only completed payments)
  const totalPaid = (payments || [])
    .filter((p: any) => p.status === 'completed')
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0)

  const balanceAmount = invoice.total_amount - totalPaid

  // Determine new status
  let newStatus = 'no_payments_received'
  if (balanceAmount <= 0) {
    newStatus = 'paid_in_full'
  } else if (totalPaid > 0) {
    newStatus = 'partially_paid'
  }

  // Update invoice
  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      paid_amount: totalPaid,
      balance_amount: balanceAmount,
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)

  if (updateError) {
    console.error('Error updating invoice after payment change:', updateError)
  } else {
    console.log(`[Payment API] Invoice ${invoiceId} recalculated: paid=${totalPaid}, balance=${balanceAmount}, status=${newStatus}`)
  }
}
