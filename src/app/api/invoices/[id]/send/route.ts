import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, generateInvoiceEmailHTML } from '@/lib/email'
import { generateInvoicePDF } from '@/lib/pdf-generator'

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

    // Generate PDF if requested
    let pdfBuffer: Buffer | undefined
    if (includePDF) {
      try {
        pdfBuffer = await generateInvoicePDF({
          invoice: {
            ...invoice,
            line_items: invoice.invoice_line_items,
          },
          companyInfo: {
            name: process.env.COMPANY_NAME || 'ClearChoice Photo Booth',
            address: process.env.COMPANY_ADDRESS || 'Your Company Address',
            phone: process.env.COMPANY_PHONE || '(555) 123-4567',
            email: process.env.GMAIL_USER || 'billing@yourcompany.com',
          },
        })
      } catch (error) {
        console.error('Error generating PDF:', error)
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
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
