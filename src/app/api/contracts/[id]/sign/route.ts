import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import jsPDF from 'jspdf'
import { createLogger } from '@/lib/logger'
import { addInvoiceToDocument } from '@/lib/pdf-generator'

const log = createLogger('api:contracts')

// Get client IP address
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  if (realIp) {
    return realIp
  }
  return 'unknown'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = await params
    const body = await request.json()
    const { signature } = body

    if (!signature || !signature.trim()) {
      return NextResponse.json(
        { error: 'Signature is required' },
        { status: 400 }
      )
    }

    // Get contract
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Debug: Log Schedule A relevant fields
    log.debug({
      contractId: contract.id,
      eventId: contract.event_id,
      includeInvoiceAttachment: contract.include_invoice_attachment,
      hasEventId: !!contract.event_id,
      hasIncludeFlag: !!contract.include_invoice_attachment
    }, 'Schedule A debug: contract fields')

    // Check if already signed
    if (contract.status === 'signed') {
      return NextResponse.json(
        { error: 'Contract has already been signed' },
        { status: 400 }
      )
    }

    // Check if expired
    if (contract.expires_at && new Date(contract.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Contract has expired' },
        { status: 410 }
      )
    }

    // Capture IP and user agent
    const clientIp = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const signedAt = new Date().toISOString()

    // Generate signed PDF
    const pdf = new jsPDF('p', 'pt', 'letter')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 40

    // Add content
    const contentLines = contract.content.split('\n')
    let y = margin

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')

    for (const line of contentLines) {
      if (y > pageHeight - margin - 120) { // Reserve space for signature
        pdf.addPage()
        y = margin
      }

      const splitLines = pdf.splitTextToSize(line || ' ', pageWidth - (margin * 2))
      for (const splitLine of splitLines) {
        if (y > pageHeight - margin - 120) {
          pdf.addPage()
          y = margin
        }
        pdf.text(splitLine, margin, y)
        y += 16
      }
    }

    // Add signature section
    if (y > pageHeight - margin - 120) {
      pdf.addPage()
      y = margin
    }

    y += 30
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text('SIGNED BY:', margin, y)
    y += 20

    // Add signature in script font (simulate with italic)
    pdf.setFontSize(24)
    pdf.setFont('times', 'italic')
    pdf.text(signature, margin, y)
    y += 10

    // Add signature line
    pdf.setLineWidth(1)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 15

    // Add signature details
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Signed on: ${new Date(signedAt).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })}`, margin, y)
    y += 12
    pdf.text(`IP Address: ${clientIp}`, margin, y)
    y += 12
    pdf.text(`Document ID: ${contract.id}`, margin, y)

    // Schedule A - Invoice Attachment (if enabled)
    log.debug({
      willCheckScheduleA: true,
      includeFlag: contract.include_invoice_attachment,
      eventId: contract.event_id,
      conditionMet: !!(contract.include_invoice_attachment && contract.event_id)
    }, 'Schedule A: checking condition')

    if (contract.include_invoice_attachment && contract.event_id) {
      log.debug({}, 'Schedule A: condition passed, fetching invoices')
      try {
        // Fetch invoices for this event
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select(`
            *,
            invoice_line_items(*),
            accounts(*),
            contacts(*)
          `)
          .eq('tenant_id', dataSourceTenantId)
          .eq('event_id', contract.event_id)
          .order('created_at', { ascending: true })

        log.debug({
          invoicesFound: invoices?.length || 0,
          invoicesError: invoicesError?.message,
          eventId: contract.event_id
        }, 'Schedule A: invoice query results')

        if (!invoicesError && invoices && invoices.length > 0) {
          // Fetch tenant info for company details
          const { data: tenant } = await supabase
            .from('tenants')
            .select('name, address, phone, email, logo_url')
            .eq('id', dataSourceTenantId)
            .single()

          const companyInfo = {
            name: tenant?.name || 'Company',
            address: tenant?.address || '',
            phone: tenant?.phone || '',
            email: tenant?.email || ''
          }

          // Add Schedule A header page
          pdf.addPage()
          pdf.setFontSize(18)
          pdf.setFont('helvetica', 'bold')
          pdf.text('Schedule A - Invoice(s)', margin, margin + 20)

          pdf.setFontSize(10)
          pdf.setFont('helvetica', 'normal')
          pdf.text(`The following invoice(s) are attached as part of this agreement.`, margin, margin + 40)
          pdf.text(`Total invoices: ${invoices.length}`, margin, margin + 55)

          // Add each invoice
          for (const inv of invoices) {
            pdf.addPage()

            // Calculate paid amount from payments if not stored
            let paidAmount = inv.paid_amount || 0
            // Note: payments aren't fetched in current query, but keeping this for future compatibility
            const payments = (inv as { payments?: Array<{ status: string; amount: number }> }).payments
            if (!paidAmount && payments) {
              paidAmount = payments
                .filter((p) => p.status === 'completed')
                .reduce((sum, p) => sum + (p.amount || 0), 0)
            }

            const invoiceData = {
              id: inv.id,
              invoice_number: inv.invoice_number || 'N/A',
              account_name: inv.accounts?.name || null,
              contact_name: inv.contacts ? `${inv.contacts.first_name || ''} ${inv.contacts.last_name || ''}`.trim() : null,
              opportunity_name: null,
              event_date: null,
              issue_date: inv.issue_date || inv.created_at,
              due_date: inv.due_date || inv.issue_date || inv.created_at,
              status: inv.status || 'draft',
              subtotal: inv.subtotal || inv.total_amount || 0,
              tax_rate: inv.tax_rate || null,
              tax_amount: inv.tax_amount || null,
              total_amount: inv.total_amount || 0,
              paid_amount: paidAmount,
              balance_amount: (inv.total_amount || 0) - paidAmount,
              purchase_order: inv.purchase_order || null,
              payment_terms: inv.payment_terms || null,
              notes: inv.notes || null,
              terms: inv.terms || null,
              line_items: (inv.invoice_line_items || []).map((item: any) => ({
                name: item.name || item.description || 'Item',
                description: item.description || null,
                quantity: item.quantity || 1,
                unit_price: item.unit_price || 0,
                total_price: item.total_price || (item.quantity || 1) * (item.unit_price || 0),
                taxable: item.taxable
              }))
            }

            addInvoiceToDocument(pdf, invoiceData, companyInfo)
          }

          log.debug({ invoiceCount: invoices.length }, 'Added Schedule A invoices to contract PDF')
        } else {
          log.debug({
            hasError: !!invoicesError,
            invoiceCount: invoices?.length || 0,
            reason: invoicesError ? 'query error' : 'no invoices found'
          }, 'Schedule A: no invoices to attach')
        }
      } catch (scheduleAError) {
        log.error({
          error: scheduleAError instanceof Error ? scheduleAError.message : String(scheduleAError),
          stack: scheduleAError instanceof Error ? scheduleAError.stack : undefined
        }, 'Error adding Schedule A invoices (continuing without)')
        // Don't fail the signing - just skip the invoice attachment
      }
    } else {
      log.debug({
        includeFlag: contract.include_invoice_attachment,
        eventId: contract.event_id,
        reason: !contract.include_invoice_attachment ? 'include_invoice_attachment is false/undefined' : 'no event_id'
      }, 'Schedule A: condition not met, skipping')
    }

    // Get PDF as base64
    const pdfBase64 = pdf.output('datauristring').split(',')[1]

    // Upload signed PDF to storage (we'll add this later)
    // For now, just store the base64 data
    const signedPdfUrl = `data:application/pdf;base64,${pdfBase64}`

    // Update contract with signature (using actual database column names)
    // Note: Database uses ip_address (not signed_ip), signed_by for signer name
    // signature_user_agent and signed_pdf_url don't exist in current schema
    const { data: updatedContract, error: updateError } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signature_data: signature,
        signed_at: signedAt,
        signed_by: signature, // Store the typed signature name
        ip_address: clientIp // Database uses 'ip_address' not 'signed_ip'
        // Note: signature_user_agent and signed_pdf_url columns don't exist in schema
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      log.error({ updateError }, 'Error updating contract')
      return NextResponse.json(
        { error: 'Failed to save signature' },
        { status: 500 }
      )
    }

    // Update the attachment entry status to 'signed' in description field
    if (contract.event_id) {
      try {
        // Find the attachment entry for this contract
        const { data: attachment } = await supabase
          .from('attachments')
          .select('id, description')
          .eq('tenant_id', dataSourceTenantId)
          .eq('entity_id', contract.event_id)
          .eq('entity_type', 'event')
          .like('description', `%[CONTRACT:${id}]%`)
          .single()
        
        if (attachment) {
          // Update description to reflect signed status
          const updatedDescription = attachment.description.replace(/\[STATUS:[^\]]+\]/, '[STATUS:signed]')
          
          await supabase
            .from('attachments')
            .update({
              description: updatedDescription
            })
            .eq('id', attachment.id)
          
          log.debug({}, 'Attachment entry status updated to signed')
        } else {
          log.debug({}, 'No attachment entry found for contract')
        }
      } catch (err) {
        log.error({ err }, 'Error updating attachment entry')
        // Don't fail the whole operation if attachment update fails
      }
    }

    return NextResponse.json({
      success: true,
      contract: updatedContract,
      message: 'Contract signed successfully'
    })
  } catch (error) {
    log.error({ error }, 'Error signing contract')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

