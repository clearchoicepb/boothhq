import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    // Get event data
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        accounts!events_account_id_fkey(name, email, phone, billing_address),
        contacts!events_contact_id_fkey(first_name, last_name, email)
      `)
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const body = await request.json()
    const { 
      requirePayment = false, 
      paymentTerms = 'Net 30',
      taxRate = 0.08,
      customLineItems = []
    } = body

    // Check if invoice already exists for this event
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('event_id', id)
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (existingInvoice) {
      return NextResponse.json({ 
        error: 'Invoice already exists for this event',
        invoiceId: existingInvoice.id
      }, { status: 400 })
    }

    // Generate invoice number
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('tenant_id', session.user.tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const lastNumber = lastInvoice?.invoice_number ? parseInt(lastInvoice.invoice_number.replace('INV-', '')) : 0
    const invoiceNumber = `INV-${String(lastNumber + 1).padStart(4, '0')}`

    // Create line items from event
    const lineItems = []
    
    // Base photo booth rental
    if (event.total_cost && event.total_cost > 0) {
      lineItems.push({
        description: `Photo Booth Rental - ${event.name}`,
        quantity: 1,
        unit_price: event.total_cost,
        total_price: event.total_cost,
      })
    }

    // Add custom line items
    customLineItems.forEach((item: any) => {
      lineItems.push({
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total_price: (item.quantity || 1) * (item.unit_price || 0),
      })
    })

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.total_price, 0)
    const taxAmount = subtotal * taxRate
    const totalAmount = subtotal + taxAmount
    const balanceAmount = totalAmount // Balance is always the full amount for new invoices

    // Create invoice
    const invoiceData = {
      tenant_id: session.user.tenantId,
      invoice_number: invoiceNumber,
      account_id: event.account_id,
      contact_id: event.contact_id,
      event_id: event.id,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      status: 'sent', // Always create as 'sent' (live) invoice, not draft
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      paid_amount: 0, // New invoices start with 0 paid amount
      balance_amount: balanceAmount,
      payment_terms: paymentTerms,
      notes: `Invoice generated from event: ${event.name} on ${new Date(event.event_date).toLocaleDateString()}`,
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

    // Insert line items
    if (lineItems.length > 0) {
      const lineItemsData = lineItems.map((item) => ({
        ...item,
        tenant_id: session.user.tenantId,
        invoice_id: invoice.id,
      }))

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsData)

      if (lineItemsError) {
        console.error('Error creating line items:', lineItemsError)
        // Don't fail the entire request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      invoice: {
        ...invoice,
        line_items: lineItems,
        event_name: event.name,
        account_name: event.accounts?.name,
        contact_name: event.contacts ? `${event.contacts.first_name} ${event.contacts.last_name}` : null,
      },
      requirePayment,
      paymentUrl: requirePayment ? `/clearchoice/invoices/${invoice.id}/pay` : null,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
