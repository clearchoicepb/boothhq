import { NextRequest, NextResponse } from 'next/server';
import { getTenantDatabaseClient } from '@/lib/supabase-client';
import { createLogger } from '@/lib/logger'

const log = createLogger('api:public')

// GET /api/public/invoices/[tenantId]/[token] - View invoice details (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string; token: string } }
) {
  try {
    const { tenantId, token } = params;

    if (!tenantId || !token || token.length !== 64) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Connect to the specific tenant's database
    const supabase = await getTenantDatabaseClient(tenantId);

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
        event_id,
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
        ),
        events (
          id,
          title,
          start_date
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

    // Don't allow viewing DRAFT invoices publicly
    if (invoice.status === 'draft') {
      return NextResponse.json(
        { error: 'Invoice not available' },
        { status: 404 }
      );
    }

    // Fetch line items separately
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('sort_order', { ascending: true });

    if (lineItemsError) {
      return NextResponse.json(
        { error: 'Failed to fetch line items' },
        { status: 500 }
      );
    }

    // Fetch tenant appearance settings (logo)
    const { data: logoSetting } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', invoice.tenant_id)
      .eq('setting_key', 'appearance.logoUrl')
      .single();

    const logoUrl = logoSetting?.setting_value || null;

    // Cast events as single object (many-to-one relationship)
    const event = invoice.events as { id: string; title: string; start_date: string } | null

    return NextResponse.json({
      invoice: {
        ...invoice,
        line_items: lineItems || [],
        event_name: event?.title || null,
        event_date: event?.start_date || null,
      },
      tenant: {
        id: invoice.tenant_id,
        name: process.env.TENANT_NAME || 'Invoice Payment',
        subdomain: process.env.TENANT_SUBDOMAIN || '',
        logoUrl: logoUrl,
      },
    });

  } catch (error) {
    log.error({ error }, 'Error fetching public invoice');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
