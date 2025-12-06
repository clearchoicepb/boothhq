import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { sendEmail } from '@/lib/email'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:contracts')

export async function POST(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const body = await request.json()
    const {
      to,
      subject,
      message,
      pdfBase64,
      contractName,
    } = body

    if (!to || !pdfBase64 || !contractName) {
      return NextResponse.json({
        error: 'Missing required fields: to, pdfBase64, contractName'
      }, { status: 400 })
    }

    // Convert base64 PDF to Buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64')

    // Generate email content
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
          .content { background: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666; text-align: center; }
          .signature { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${contractName}</h1>
          <p>Please review the attached contract</p>
        </div>

        <div class="content">
          <p>${message || 'Please find the attached contract for your review. If you have any questions or concerns, please don\'t hesitate to reach out.'}</p>

          <div class="signature">
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Review the attached contract PDF</li>
              <li>Sign where indicated</li>
              <li>Return the signed copy to us</li>
            </ol>
          </div>
        </div>

        <div class="footer">
          <p>If you have any questions about this contract, please contact us at:</p>
          <p>Email: ${process.env.GMAIL_USER}</p>
          <p>Phone: (555) 123-4567</p>
        </div>
      </body>
      </html>
    `

    const emailSubject = subject || `Contract: ${contractName}`

    // Prepare email options
    const emailOptions = {
      to,
      subject: emailSubject,
      html: emailHTML,
      text: message || `Please find attached contract: ${contractName}. Thank you for your business!`,
      attachments: [{
        filename: `${contractName}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    }

    // Send email
    const emailResult = await sendEmail(emailOptions)

    if (!emailResult.success) {
      return NextResponse.json({
        error: 'Failed to send email',
        details: emailResult.error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
      recipient: to,
    })
  } catch (error) {
    log.error({ error }, 'Error sending contract')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
