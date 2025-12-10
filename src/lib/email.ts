import nodemailer from 'nodemailer'
import { createLogger } from '@/lib/logger'

const log = createLogger('lib')

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export const createEmailTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Gmail credentials not configured')
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
    },
  })
}

export const sendEmail = async (options: EmailOptions) => {
  const transporter = createEmailTransporter()
  
  const mailOptions = {
    from: `"${process.env.COMPANY_NAME || 'ClearChoice Photo Booth'}" <${process.env.GMAIL_USER}>`,
    to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    attachments: options.attachments,
  }

  try {
    const result = await transporter.sendMail(mailOptions)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    log.error({ error }, 'Error sending email')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export const generateInvoiceEmailHTML = (invoice: any, pdfBuffer?: Buffer) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoice.invoice_number}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .invoice-details { background: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .line-items { margin: 20px 0; }
        .line-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .total { font-weight: bold; font-size: 1.2em; margin-top: 20px; padding-top: 20px; border-top: 2px solid #333; }
        .payment-button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Invoice ${invoice.invoice_number}</h1>
        <p>Thank you for your business with ClearChoice Photo Booth!</p>
      </div>
      
      <div class="invoice-details">
        <h2>Invoice Details</h2>
        <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
        <p><strong>Issue Date:</strong> ${formatDate(invoice.issue_date)}</p>
        <p><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>
        <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
        ${invoice.payment_terms ? `<p><strong>Payment Terms:</strong> ${invoice.payment_terms}</p>` : ''}
      </div>

      <div class="line-items">
        <h3>Line Items</h3>
        ${invoice.line_items.map((item: any) => `
          <div class="line-item">
            <span>${item.description} (Qty: ${item.quantity})</span>
            <span>${formatCurrency(item.total_price)}</span>
          </div>
        `).join('')}
        
        <div class="line-item">
          <span>Subtotal:</span>
          <span>${formatCurrency(invoice.subtotal)}</span>
        </div>
        
        ${invoice.tax_amount && invoice.tax_amount > 0 ? `
          <div class="line-item">
            <span>Tax (${((invoice.tax_rate || 0) * 100).toFixed(1)}%):</span>
            <span>${formatCurrency(invoice.tax_amount)}</span>
          </div>
        ` : ''}
        
        <div class="line-item total">
          <span>Total Amount:</span>
          <span>${formatCurrency(invoice.total_amount)}</span>
        </div>
        
        ${invoice.paid_amount && invoice.paid_amount > 0 ? `
          <div class="line-item">
            <span>Amount Paid:</span>
            <span style="color: green;">${formatCurrency(invoice.paid_amount)}</span>
          </div>
          <div class="line-item">
            <span>Balance Due:</span>
            <span style="color: ${invoice.balance_amount > 0 ? 'red' : 'green'};">
              ${formatCurrency(invoice.balance_amount)}
            </span>
          </div>
        ` : ''}
      </div>

      ${invoice.balance_amount > 0 ? `
        <div style="text-align: center;">
          <a href="${process.env.NEXTAUTH_URL}/clearchoice/invoices/${invoice.id}/pay" class="payment-button">
            Pay Now with Stripe
          </a>
        </div>
      ` : ''}

      ${invoice.notes ? `
        <div class="invoice-details">
          <h3>Notes</h3>
          <p>${invoice.notes}</p>
        </div>
      ` : ''}

      <div class="footer">
        <p>If you have any questions about this invoice, please contact us at:</p>
        <p>Email: ${process.env.GMAIL_USER}</p>
        <p>Phone: (555) 123-4567</p>
        <p>Website: ${process.env.NEXTAUTH_URL}</p>
      </div>
    </body>
    </html>
  `
}






