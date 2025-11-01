import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const body = await request.json()
    const { payment_intent_id, invoice_id } = body

    if (!payment_intent_id || !invoice_id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Get invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)

    if (paymentIntent.status === 'succeeded') {
      // Check if we've already processed this payment
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('payment_intent_id', payment_intent_id)
        .eq('tenant_id', dataSourceTenantId)
        .single()

      if (!existingPayment) {
        // Process the successful payment
        const paymentAmount = paymentIntent.amount / 100 // Convert from cents
        const newPaidAmount = (invoice.paid_amount || 0) + paymentAmount
        const newBalanceAmount = invoice.total_amount - newPaidAmount
        const newStatus = newBalanceAmount <= 0 ? 'paid' : invoice.status

        // Update invoice
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            paid_amount: newPaidAmount,
            balance_amount: newBalanceAmount,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoice.id)
          .eq('tenant_id', dataSourceTenantId)

        if (updateError) {
          console.error('Error updating invoice after payment:', updateError)
          return NextResponse.json({ error: 'Payment succeeded but failed to update invoice' }, { status: 500 })
        }

        // Create payment record
        await supabase
          .from('payments')
          .insert({
            tenant_id: dataSourceTenantId,
            invoice_id: invoice.id,
            amount: paymentAmount,
            payment_method: 'stripe',
            payment_intent_id: payment_intent_id,
            status: 'completed',
            processed_at: new Date().toISOString(),
          })
      }

      return NextResponse.json({
        success: true,
        payment_intent: paymentIntent,
        message: 'Payment verified and processed successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: `Payment failed with status: ${paymentIntent.status}`,
        payment_intent: paymentIntent
      })
    }
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}






