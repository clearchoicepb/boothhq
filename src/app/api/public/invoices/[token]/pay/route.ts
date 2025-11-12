import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantStripe, getTenantStripeConfig, formatAmountForStripe } from '@/lib/stripe';

// GET /api/public/invoices/[token]/pay - Create payment intent (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const { searchParams } = new URL(request.url);
    const amount = searchParams.get('amount');

    if (!token || token.length !== 64) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch invoice by public token
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, tenant_id, invoice_number, total_amount, balance_amount, status')
      .eq('public_token', token)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if invoice can be paid
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      );
    }

    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Invoice is cancelled' },
        { status: 400 }
      );
    }

    // Determine payment amount
    let paymentAmount: number;
    if (amount) {
      paymentAmount = parseFloat(amount);
      const remainingBalance = invoice.balance_amount ?? invoice.total_amount;

      if (paymentAmount <= 0 || paymentAmount > remainingBalance) {
        return NextResponse.json(
          { error: `Payment amount must be between $0.01 and $${remainingBalance}` },
          { status: 400 }
        );
      }
    } else {
      paymentAmount = invoice.balance_amount ?? invoice.total_amount;
    }

    if (paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'No balance remaining to pay' },
        { status: 400 }
      );
    }

    // Get tenant-specific Stripe configuration
    const stripeConfig = await getTenantStripeConfig(supabase, invoice.tenant_id);

    if (!stripeConfig.secretKey) {
      return NextResponse.json(
        { error: 'Payment processing is not configured for this invoice' },
        { status: 400 }
      );
    }

    const stripe = getTenantStripe(stripeConfig.secretKey);

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(paymentAmount, 'usd'),
      currency: 'usd',
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        tenant_id: invoice.tenant_id,
        public_payment: 'true',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey: stripeConfig.publishableKey,
      amount: paymentAmount,
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

// POST /api/public/invoices/[token]/pay - Process payment (no auth required)
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await request.json();
    const { payment_intent_id, amount } = body;

    if (!token || token.length !== 64) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      );
    }

    if (!payment_intent_id) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch invoice by public token
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, tenant_id, invoice_number, total_amount, paid_amount, balance_amount, status')
      .eq('public_token', token)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Get tenant-specific Stripe configuration
    const stripeConfig = await getTenantStripeConfig(supabase, invoice.tenant_id);

    if (!stripeConfig.secretKey) {
      return NextResponse.json(
        { error: 'Payment processing is not configured' },
        { status: 400 }
      );
    }

    const stripe = getTenantStripe(stripeConfig.secretKey);

    // Retrieve PaymentIntent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not completed', status: paymentIntent.status },
        { status: 400 }
      );
    }

    // Calculate new amounts
    const paymentAmountUSD = paymentIntent.amount / 100;
    const currentPaidAmount = invoice.paid_amount || 0;
    const newPaidAmount = currentPaidAmount + paymentAmountUSD;
    const newBalanceAmount = invoice.total_amount - newPaidAmount;
    const newStatus = newBalanceAmount <= 0 ? 'paid' : invoice.status;

    // Update invoice with payment
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        paid_amount: newPaidAmount,
        balance_amount: newBalanceAmount,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.id);

    if (updateError) {
      console.error('Error updating invoice:', updateError);
      return NextResponse.json(
        { error: 'Failed to update invoice' },
        { status: 500 }
      );
    }

    // Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        tenant_id: invoice.tenant_id,
        invoice_id: invoice.id,
        amount: paymentAmountUSD,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'stripe',
        payment_intent_id: payment_intent_id,
        status: 'completed',
        processed_at: new Date().toISOString(),
        reference_number: paymentIntent.id,
        notes: 'Payment via public invoice link',
      });

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
    }

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        paid_amount: newPaidAmount,
        balance_amount: newBalanceAmount,
        status: newStatus,
      },
      payment: {
        amount: paymentAmountUSD,
        payment_intent_id,
        status: 'completed',
      },
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
