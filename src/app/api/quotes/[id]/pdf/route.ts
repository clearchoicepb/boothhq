import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const quoteId = params.id

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

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
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (error) {
      console.error('Error fetching quote:', error)
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', quoteId)
      .eq('tenant_id', session.user.tenantId)
      .order('sort_order', { ascending: true })

    // Update viewed timestamp if status is 'sent'
    if (quote.status === 'sent' && !quote.viewed_at) {
      await supabase
        .from('quotes')
        .update({ viewed_at: new Date().toISOString(), status: 'viewed' })
        .eq('id', quoteId)
        .eq('tenant_id', session.user.tenantId)
    }

    // TODO: Implement actual PDF generation using a library like PDFKit or Puppeteer
    // For now, return a simple HTML response that can be printed as PDF

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quote ${quote.quote_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .details { margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f8f9fa; }
          .total { text-align: right; font-size: 18px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>QUOTE</h1>
          <p>Quote #: ${quote.quote_number}</p>
        </div>

        <div class="details">
          <p><strong>Issue Date:</strong> ${new Date(quote.issue_date).toLocaleDateString()}</p>
          ${quote.valid_until ? `<p><strong>Valid Until:</strong> ${new Date(quote.valid_until).toLocaleDateString()}</p>` : ''}
          <p><strong>Bill To:</strong> ${quote.accounts?.name || 'N/A'}</p>
          ${quote.opportunities?.name ? `<p><strong>RE:</strong> ${quote.opportunities.name}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItems?.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>$${parseFloat(item.unit_price).toFixed(2)}</td>
                <td>$${parseFloat(item.total).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          <p>Subtotal: $${parseFloat(quote.subtotal).toFixed(2)}</p>
          <p>Tax (${(parseFloat(quote.tax_rate) * 100).toFixed(1)}%): $${parseFloat(quote.tax_amount).toFixed(2)}</p>
          <p><strong>Total: $${parseFloat(quote.total_amount).toFixed(2)}</strong></p>
        </div>

        ${quote.notes ? `<div><p><strong>Notes:</strong> ${quote.notes}</p></div>` : ''}
        ${quote.terms ? `<div><p><strong>Terms & Conditions:</strong> ${quote.terms}</p></div>` : ''}
      </body>
      </html>
    `

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
