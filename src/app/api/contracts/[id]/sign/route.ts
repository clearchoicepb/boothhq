import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import jsPDF from 'jspdf'

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
      console.error('Error updating contract:', updateError)
      return NextResponse.json(
        { error: 'Failed to save signature' },
        { status: 500 }
      )
    }

    // Create attachment/file record
    if (contract.event_id) {
      try {
        await supabase.from('attachments').insert({
          tenant_id: dataSourceTenantId,
          entity_type: 'events',
          entity_id: contract.event_id,
          file_name: `${contract.title} - Signed.pdf`,
          file_type: 'application/pdf',
          file_url: signedPdfUrl,
          file_size: Buffer.from(pdfBase64, 'base64').length,
          uploaded_by: contract.created_by
        })
      } catch (err) {
        console.error('Error creating attachment:', err)
        // Don't fail the whole operation if attachment creation fails
      }
    }

    return NextResponse.json({
      success: true,
      contract: updatedContract,
      message: 'Contract signed successfully'
    })
  } catch (error) {
    console.error('Error signing contract:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

