import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:public:contracts')

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

/**
 * Public API to sign a contract
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { signature } = body

    if (!signature || !signature.trim()) {
      return NextResponse.json(
        { error: 'Signature is required' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role key
    const supabaseUrl = process.env.DEFAULT_TENANT_DATA_URL
    const supabaseServiceKey = process.env.DEFAULT_TENANT_DATA_SERVICE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get contract
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
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
      if (y > pageHeight - margin - 120) {
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

    // Add signature in script font
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

    // Update contract with signature
    const { data: updatedContract, error: updateError } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signature_data: signature,
        signed_at: signedAt,
        signed_by: signature,
        ip_address: clientIp
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

    // Update the attachment entry status if event_id exists
    if (contract.event_id) {
      try {
        const { data: attachment } = await supabase
          .from('attachments')
          .select('id, description')
          .eq('tenant_id', contract.tenant_id)
          .eq('entity_id', contract.event_id)
          .eq('entity_type', 'event')
          .like('description', `%[CONTRACT:${id}]%`)
          .single()

        if (attachment) {
          const updatedDescription = attachment.description.replace(/\[STATUS:[^\]]+\]/, '[STATUS:signed]')
          await supabase
            .from('attachments')
            .update({ description: updatedDescription })
            .eq('id', attachment.id)
        }
      } catch (err) {
        log.error({ err }, 'Error updating attachment entry')
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
