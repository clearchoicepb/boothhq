import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const body = await request.json()

    console.log('[Payment API] Creating payment for tenant:', dataSourceTenantId)

    // Validate required fields
    if (!body.invoice_id || !body.amount || !body.payment_method) {
      return NextResponse.json(
        { error: 'Missing required fields: invoice_id, amount, payment_method' },
        { status: 400 }
      )
    }

    // Get invoice details to validate and update balance
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', body.invoice_id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Prepare payment data
    const paymentData = {
      tenant_id: dataSourceTenantId,
      invoice_id: body.invoice_id,
      amount: parseFloat(body.amount),
      payment_date: body.payment_date || new Date().toISOString().split('T')[0],
      payment_method: body.payment_method,
      status: body.status || 'completed',
      reference_number: body.reference_number || null,
      notes: body.notes || null,
      processed_at: new Date().toISOString(),
      payment_intent_id: body.payment_intent_id || null
    }

    // Create payment record
    console.log('[Payment API] About to insert payment:', JSON.stringify(paymentData, null, 2))
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single()

    if (paymentError) {
      console.error('[Payment API] Error creating payment:', paymentError)
      console.error('[Payment API] Payment data that failed:', paymentData)
      return NextResponse.json(
        { error: 'Failed to create payment' },
        { status: 500 }
      )
    }

    // Calculate new paid amount and balance
    const newPaidAmount = (invoice.paid_amount || 0) + paymentData.amount
    const newBalanceAmount = invoice.total_amount - newPaidAmount

    // Update invoice status and amounts
    let newStatus = invoice.status
    if (newBalanceAmount <= 0) {
      newStatus = 'paid_in_full'
    } else if (newPaidAmount > 0 && newBalanceAmount > 0) {
      newStatus = 'partially_paid'
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        paid_amount: newPaidAmount,
        balance_amount: newBalanceAmount,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.invoice_id)
      .eq('tenant_id', dataSourceTenantId)

    if (updateError) {
      console.error('Error updating invoice:', updateError)
      // Payment was created but invoice update failed - log but don't fail the request
      console.warn('Payment created successfully but invoice update failed')
    }

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    // Fetch all payments for the tenant
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        invoices (
          id,
          invoice_number,
          total_amount,
          accounts (
            id,
            name
          )
        )
      `)
      .eq('tenant_id', dataSourceTenantId)
      .order('payment_date', { ascending: false })

    if (error) {
      console.error('Error fetching payments:', error)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    return NextResponse.json(payments || [])
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
