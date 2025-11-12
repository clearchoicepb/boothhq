import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { generateInvoicePDF } from '@/lib/pdf-generator'

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
        accounts(name, email, phone, billing_address),
        contacts(first_name, last_name, email),
        invoice_line_items(*)
      `)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice for PDF:', invoiceError)
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Get opportunity name if opportunity_id exists
    let opportunityName = null
    if (invoice.opportunity_id) {
      const { data: opportunity } = await supabase
        .from('opportunities')
        .select('name')
        .eq('id', invoice.opportunity_id)
        .eq('tenant_id', dataSourceTenantId)
        .single()

      opportunityName = opportunity?.name || null
    }

    // Get tenant settings for logo
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('tenant_id', dataSourceTenantId)
      .eq('key', 'appearance')
      .single()

    const logoUrl = settings?.value?.logoUrl || null

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF({
      invoice: {
        ...invoice,
        account_name: invoice.accounts?.name || null,
        contact_name: invoice.contacts ? `${invoice.contacts.first_name} ${invoice.contacts.last_name}` : null,
        opportunity_name: opportunityName,
        line_items: invoice.invoice_line_items.map((item: any) => ({
          name: item.name || item.description || 'Unnamed Item',
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          taxable: item.taxable
        })),
      },
      companyInfo: {
        name: process.env.COMPANY_NAME || 'ClearChoice Photo Booth',
        address: process.env.COMPANY_ADDRESS || 'Your Company Address',
        phone: process.env.COMPANY_PHONE || '(555) 123-4567',
        email: process.env.GMAIL_USER || 'billing@yourcompany.com',
        logoUrl: logoUrl,
      },
    })

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
