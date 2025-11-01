import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { stripe, formatAmountForStripe } from '@/lib/stripe'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { id } = await params
    // Get invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        accounts!invoices_account_id_fkey(name, email, phone),
        invoice_line_items(*)
      `)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.balance_amount <= 0) {
      return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 })
    }

    const body = await request.json()
    const { payment_method_id, amount } = body

    // Validate amount
    const paymentAmount = amount || invoice.balance_amount
    if (paymentAmount > invoice.balance_amount) {
      return NextResponse.json({ error: 'Payment amount exceeds balance' }, { status: 400 })
    }

    try {
      // Get the base URL for return URLs
      const { origin } = new URL(request.url)
      const returnUrl = `${origin}/clearchoice/invoices/${invoice.id}/pay/return`

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: formatAmountForStripe(paymentAmount, 'usd'),
        currency: 'usd',
        payment_method: payment_method_id,
        confirmation_method: 'manual',
        confirm: true,
        return_url: returnUrl,
        metadata: {
          invoice_id: invoice.id,
          tenant_id: dataSourceTenantId,
          invoice_number: invoice.invoice_number,
        },
        description: `Payment for invoice ${invoice.invoice_number}`,
        receipt_email: invoice.accounts?.email || undefined,
      })

      if (paymentIntent.status === 'succeeded') {
        // Update invoice with payment
        const newPaidAmount = (invoice.paid_amount || 0) + paymentAmount
        const newBalanceAmount = invoice.total_amount - newPaidAmount
        const newStatus = newBalanceAmount <= 0 ? 'paid' : invoice.status

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
            payment_intent_id: paymentIntent.id,
            status: 'completed',
            processed_at: new Date().toISOString(),
          })

        return NextResponse.json({
          success: true,
          payment_intent: paymentIntent,
          invoice: {
            ...invoice,
            paid_amount: newPaidAmount,
            balance_amount: newBalanceAmount,
            status: newStatus,
          }
        })
      } else if (paymentIntent.status === 'requires_action') {
        return NextResponse.json({
          success: false,
          requires_action: true,
          payment_intent: paymentIntent,
        })
      } else {
        return NextResponse.json({
          success: false,
          error: 'Payment failed',
          payment_intent: paymentIntent,
        })
      }
    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError)
      return NextResponse.json({
        success: false,
        error: stripeError.message || 'Payment processing failed',
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    
    const { id } = await params
    // Get invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        accounts!invoices_account_id_fkey(name, email, phone)
      `)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Get the base URL for return URLs
    const { origin } = new URL(request.url)
    const returnUrl = `${origin}/clearchoice/invoices/${invoice.id}/pay/return`

    // Create payment intent for the balance amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(invoice.balance_amount, 'usd'),
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always'
      },
      metadata: {
        invoice_id: invoice.id,
        tenant_id: dataSourceTenantId,
        invoice_number: invoice.invoice_number,
      },
      description: `Payment for invoice ${invoice.invoice_number}`,
    })

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        balance_amount: invoice.balance_amount,
        total_amount: invoice.total_amount,
        account_name: invoice.accounts?.name,
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
