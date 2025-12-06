import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { generateQuotePDF } from '@/lib/pdf-generator'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:quotes')

export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const params = await routeContext.params
    const quoteId = params.id

    // Fetch quote with related data
    const { data: quote, error } = await supabase
      .from('quotes')
      .select(`
        *,
        accounts!quotes_account_id_fkey(name, email, phone, billing_address),
        contacts!quotes_contact_id_fkey(first_name, last_name, email, phone),
        opportunities!quotes_opportunity_id_fkey(name)
      `)
      .eq('id', quoteId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      log.error({ error }, 'Error fetching quote')
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', quoteId)
      .eq('tenant_id', dataSourceTenantId)
      .order('sort_order', { ascending: true })

    // Update viewed timestamp if status is 'sent'
    if (quote.status === 'sent' && !quote.viewed_at) {
      await supabase
        .from('quotes')
        .update({ viewed_at: new Date().toISOString(), status: 'viewed' })
        .eq('id', quoteId)
        .eq('tenant_id', dataSourceTenantId)
    }

    // Get tenant settings for logo
    const { data: logoSetting } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', dataSourceTenantId)
      .eq('setting_key', 'appearance.logoUrl')
      .single()

    const logoUrl = logoSetting?.setting_value || null

    // Generate PDF
    const pdfBuffer = await generateQuotePDF({
      quote: {
        id: quote.id,
        quote_number: quote.quote_number,
        account_name: quote.accounts?.name || null,
        contact_name: quote.contacts ? `${quote.contacts.first_name} ${quote.contacts.last_name}` : null,
        opportunity_name: quote.opportunities?.name || null,
        issue_date: quote.issue_date,
        valid_until: quote.valid_until,
        status: quote.status,
        subtotal: quote.subtotal,
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
        total_amount: quote.total_amount,
        notes: quote.notes,
        terms: quote.terms,
        line_items: (lineItems || [])
          .map((item: any) => ({
            name: item.name || item.description || 'Unnamed Item',
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total,
            taxable: item.taxable
          })),
      },
      companyInfo: {
        name: process.env.COMPANY_NAME || 'ClearChoice Photo Booth',
        address: process.env.COMPANY_ADDRESS || 'Your Company Address',
        phone: process.env.COMPANY_PHONE || '(555) 123-4567',
        email: process.env.GMAIL_USER || 'sales@yourcompany.com',
        logoUrl: logoUrl,
      },
    })

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quote-${quote.quote_number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
