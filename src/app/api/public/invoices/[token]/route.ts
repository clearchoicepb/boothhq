import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/public/invoices/[token] - View invoice details (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token || token.length !== 64) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      );
    }

    // Create Supabase client without auth context
    const supabase = await createClient();

    // Fetch invoice by public token
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        tenant_id,
        invoice_number,
        issue_date,
        due_date,
        subtotal,
        tax_amount,
        total_amount,
        status,
        notes,
        paid_amount,
        balance_amount,
        account_id,
        contact_id,
        accounts (
          id,
          name,
          email,
          phone
        ),
        contacts (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('public_token', token)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Fetch line items separately
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('created_at', { ascending: true });

    if (lineItemsError) {
      return NextResponse.json(
        { error: 'Failed to fetch line items' },
        { status: 500 }
      );
    }

    // Fetch tenant info for display
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, subdomain')
      .eq('id', invoice.tenant_id)
      .single();

    if (tenantError) {
      return NextResponse.json(
        { error: 'Failed to fetch tenant information' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      invoice: {
        ...invoice,
        line_items: lineItems || [],
      },
      tenant,
    });

  } catch (error) {
    console.error('Error fetching public invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
