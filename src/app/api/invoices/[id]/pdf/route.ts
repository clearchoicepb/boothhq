import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import { generateInvoicePDF } from '@/lib/pdf-generator'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    const supabase = createServerSupabaseClient()

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
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF({
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
