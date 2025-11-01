import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
export async function POST(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const params = await routeContext.params
    const quoteId = params.id

    const body = await request.json()
    const { event_id, due_date } = body

    if (!event_id) {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 })
    }

    // Fetch the quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (quoteError || !quote) {
      console.error('Error fetching quote:', quoteError)
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Check if quote is already converted
    if (quote.invoice_id) {
      return NextResponse.json({ error: 'Quote already converted to invoice' }, { status: 400 })
    }

    // Fetch the event to get event date
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('start_date, account_id, contact_id')
      .eq('id', event_id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (eventError || !event) {
      console.error('Error fetching event:', eventError)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Fetch quote line items
    const { data: quoteLineItems } = await supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', quoteId)
      .eq('tenant_id', dataSourceTenantId)
      .order('sort_order', { ascending: true })

    // Generate invoice number
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const lastNumber = lastInvoice?.invoice_number ? parseInt(lastInvoice.invoice_number.replace('INV-', '')) : 0
    const invoiceNumber = `INV-${String(lastNumber + 1).padStart(4, '0')}`

    // Calculate due date if not provided (default: 30 days after event start date)
    let calculatedDueDate = due_date
    if (!calculatedDueDate) {
      const eventDate = new Date(event.start_date)
      eventDate.setDate(eventDate.getDate() + 30)
      calculatedDueDate = eventDate.toISOString().split('T')[0]
    }

    // Create invoice
    const invoiceData = {
      tenant_id: dataSourceTenantId,
      quote_id: quote.id,
      event_id: event_id,
      account_id: quote.account_id || event.account_id,
      contact_id: quote.contact_id || event.contact_id,
      invoice_number: invoiceNumber,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: calculatedDueDate,
      subtotal: quote.subtotal,
      tax_amount: quote.tax_amount,
      total_amount: quote.total_amount,
      status: 'draft',
      notes: quote.notes
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single()

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError)
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
    }

    // Copy quote line items to invoice line items
    if (quoteLineItems && quoteLineItems.length > 0) {
      const invoiceLineItemsData = quoteLineItems.map((item: any) => ({
        tenant_id: dataSourceTenantId,
        invoice_id: invoice.id,
        description: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total
      }))

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(invoiceLineItemsData)

      if (lineItemsError) {
        console.error('Error creating invoice line items:', lineItemsError)
      }
    }

    // Update quote with invoice_id reference
    await supabase
      .from('quotes')
      .update({ invoice_id: invoice.id })
      .eq('id', quoteId)
      .eq('tenant_id', dataSourceTenantId)

    return NextResponse.json({
      success: true,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
