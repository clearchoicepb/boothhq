import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:invoices')
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
        accounts(name, email, phone),
        contacts(first_name, last_name, email, phone),
        events(id, title, start_date)
      `)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (invoiceError) {
      log.error({ invoiceError }, 'Error fetching invoice')
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
      .order('sort_order', { ascending: true })

    if (lineItemsError) {
      log.error({ lineItemsError }, 'Error fetching line items')
    }

    // Get opportunity name if opportunity_id exists
    let opportunityName = null
    if (invoice.opportunity_id) {
      const { data: opportunity } = await supabase
        .from('opportunities')
        .select('name')
        .eq('id', invoice.opportunity_id)
        .eq('tenant_id', dataSourceTenantId)
        .single()

      opportunityName = opportunity?.name || null
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
      opportunity_name: opportunityName,
      event_name: invoice.events?.title || null,
      event_date: invoice.events?.start_date || null,
      event: invoice.events || null,
      invoice_type: invoice.invoice_type || (invoice.event_id ? 'event' : 'general'), // Default for backwards compatibility
      line_items: (lineItems || []).map((item: any) => ({
        ...item,
        total: item.total_price // Map database field to component field
      }))
    }

    const response = NextResponse.json(transformedInvoice)
    // Use short-lived cache to ensure fresh data after mutations
    response.headers.set('Cache-Control', 'private, no-cache, must-revalidate, max-age=0')
    return response
  } catch (error) {
    log.error({ error }, 'Error')
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
      log.error({ error }, 'Error parsing request body')
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
      log.error({ invoiceError }, 'Error updating invoice')
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
          log.error({ lineItemsError }, 'Error updating line items')
        }
      }
    }

    const response = NextResponse.json(invoice)
    // Invalidate cache after mutation
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response
  } catch (error) {
    log.error({ error }, 'Error')
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
      log.error({ error }, 'Error deleting invoice')
      return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
    }

    const response = NextResponse.json({ message: 'Invoice deleted successfully' })
    // Invalidate cache after mutation
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
