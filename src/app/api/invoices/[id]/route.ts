import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { id } = await params
    // Get invoice with related data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        accounts!invoices_account_id_fkey(name, email, phone),
        contacts!invoices_contact_id_fkey(first_name, last_name, email, phone),
        events!invoices_event_id_fkey(id, title, start_date, status)
      `)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (invoiceError) {
      console.error('Error fetching invoice:', invoiceError)
      return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Get line items
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', id)
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: true })

    if (lineItemsError) {
      console.error('Error fetching line items:', lineItemsError)
    }

    // Transform the data
    const transformedInvoice = {
      ...invoice,
      account_name: invoice.accounts?.name || null,
      account_email: invoice.accounts?.email || null,
      account_phone: invoice.accounts?.phone || null,
      contact_name: invoice.contacts ? `${invoice.contacts.first_name} ${invoice.contacts.last_name}` : null,
      contact_email: invoice.contacts?.email || null,
      contact_phone: invoice.contacts?.phone || null,
      event_name: invoice.events?.title || null,
      event_date: invoice.events?.start_date || null,
      line_items: lineItems || []
    }

    return NextResponse.json(transformedInvoice)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    
    const { id } = await params
    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error('Error parsing request body:', error)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    // Calculate totals if line_items are provided
    if (body.line_items) {
      const subtotal = body.line_items.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0)
      const taxAmount = subtotal * (body.tax_rate || 0)
      const totalAmount = subtotal + taxAmount
      const balanceAmount = totalAmount - (body.paid_amount || 0)

      body.subtotal = subtotal
      body.tax_amount = taxAmount
      body.total_amount = totalAmount
      body.balance_amount = balanceAmount
    }

    // Remove line_items from the main update data
    const { line_items, ...updateData } = body

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (invoiceError) {
      console.error('Error updating invoice:', invoiceError)
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
    }

    // Update line items if provided
    if (line_items) {
      // Delete existing line items
      await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', id)
        .eq('tenant_id', dataSourceTenantId)

      // Insert new line items
      if (line_items.length > 0) {
        const lineItemsData = line_items.map((item: any) => ({
          ...item,
          tenant_id: dataSourceTenantId,
          invoice_id: id
        }))

        const { error: lineItemsError } = await supabase
          .from('invoice_line_items')
          .insert(lineItemsData)

        if (lineItemsError) {
          console.error('Error updating line items:', lineItemsError)
        }
      }
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    
    const { id } = await params
    // Delete line items first (due to foreign key constraint)
    await supabase
      .from('invoice_line_items')
      .delete()
      .eq('invoice_id', id)
      .eq('tenant_id', dataSourceTenantId)

    // Delete the invoice
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      console.error('Error deleting invoice:', error)
      return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Invoice deleted successfully' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
