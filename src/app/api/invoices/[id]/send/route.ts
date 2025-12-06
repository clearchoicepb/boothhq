import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, generateInvoiceEmailHTML } from '@/lib/email'
import { generateInvoicePDF } from '@/lib/pdf-generator'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:invoices')

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
        accounts!invoices_account_id_fkey(name, email, phone, billing_address),
        contacts!invoices_contact_id_fkey(first_name, last_name, email),
        invoice_line_items(*)
      `)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const body = await request.json()
    const { to, subject, message, includePDF = true } = body

    // Determine recipient email
    let recipientEmail = to
    if (!recipientEmail) {
      recipientEmail = invoice.contacts?.email || invoice.accounts?.email
    }

    if (!recipientEmail) {
      return NextResponse.json({ error: 'No email address found for recipient' }, { status: 400 })
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
    const { data: logoSetting } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', dataSourceTenantId)
      .eq('setting_key', 'appearance.logoUrl')
      .single()

    const logoUrl = logoSetting?.setting_value || null

    // Generate PDF if requested
    let pdfBuffer: Buffer | undefined
    if (includePDF) {
      try {
        pdfBuffer = await generateInvoicePDF({
          invoice: {
            ...invoice,
            account_name: invoice.accounts?.name || null,
            contact_name: invoice.contacts ? `${invoice.contacts.first_name} ${invoice.contacts.last_name}` : null,
            opportunity_name: opportunityName,
            line_items: invoice.invoice_line_items
              .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
              .map((item: any) => ({
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
      } catch (error) {
        log.error({ error }, 'Error generating PDF')
        // Continue without PDF if generation fails
      }
    }

    // Generate email content
    const emailHTML = generateInvoiceEmailHTML(invoice, pdfBuffer)
    const emailSubject = subject || `Invoice ${invoice.invoice_number} from ${process.env.COMPANY_NAME || 'ClearChoice Photo Booth'}`
    
    // Prepare email options
    const emailOptions = {
      to: recipientEmail,
      subject: emailSubject,
      html: emailHTML,
      text: message || `Please find attached invoice ${invoice.invoice_number}. Thank you for your business!`,
      attachments: pdfBuffer ? [{
        filename: `invoice-${invoice.invoice_number}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }] : undefined,
    }

    // Send email
    const emailResult = await sendEmail(emailOptions)

    if (!emailResult.success) {
      return NextResponse.json({ 
        error: 'Failed to send email', 
        details: emailResult.error 
      }, { status: 500 })
    }

    // Update invoice status to 'sent' if it was 'draft'
    if (invoice.status === 'draft') {
      await supabase
        .from('invoices')
        .update({ 
          status: 'sent',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)
        .eq('tenant_id', dataSourceTenantId)
    }

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
      recipient: recipientEmail,
      invoice: {
        ...invoice,
        status: invoice.status === 'draft' ? 'sent' : invoice.status,
      }
    })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
