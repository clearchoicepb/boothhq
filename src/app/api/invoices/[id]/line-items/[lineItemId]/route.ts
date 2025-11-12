import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string; lineItemId: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const params = await routeContext.params
    const body = await request.json()

    console.log('[Update Line Item] Received taxable value:', body.taxable, 'type:', typeof body.taxable)

    const updateData: any = {
      item_type: body.item_type,
      package_id: body.package_id || null,
      add_on_id: body.add_on_id || null,
      name: body.name,
      description: body.description || null,
      quantity: parseFloat(body.quantity),
      unit_price: parseFloat(body.unit_price),
      total_price: parseFloat(body.quantity) * parseFloat(body.unit_price),
      sort_order: body.sort_order || 0,
      taxable: body.taxable !== undefined ? body.taxable : true
    }

    console.log('[Update Line Item] Setting taxable to:', updateData.taxable, 'type:', typeof updateData.taxable)

    const { data, error } = await supabase
      .from('invoice_line_items')
      .update(updateData)
      .eq('id', params.lineItemId)
      .eq('invoice_id', params.id)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating line item:', error)
      return NextResponse.json({ error: 'Failed to update line item' }, { status: 500 })
    }

    // Update invoice totals
    await updateInvoiceTotals(supabase, params.id, dataSourceTenantId)

    // Normalize field names for response
    const normalizedData = {
      ...data,
      total: data.total_price
    }

    const response = NextResponse.json(normalizedData)
    // Invalidate cache after mutation
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string; lineItemId: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const params = await routeContext.params

    const { error } = await supabase
      .from('invoice_line_items')
      .delete()
      .eq('id', params.lineItemId)
      .eq('invoice_id', params.id)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      console.error('Error deleting line item:', error)
      return NextResponse.json({ error: 'Failed to delete line item' }, { status: 500 })
    }

    // Update invoice totals
    await updateInvoiceTotals(supabase, params.id, dataSourceTenantId)

    const response = NextResponse.json({ success: true })
    // Invalidate cache after mutation
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function updateInvoiceTotals(supabase: any, invoiceId: string, tenantId: string) {
  // Calculate subtotal from all line items
  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('total_price, taxable')
    .eq('invoice_id', invoiceId)
    .eq('tenant_id', tenantId)

  console.log('[Invoice Totals] Line items:', lineItems?.map(item => ({
    total_price: item.total_price,
    taxable: item.taxable,
    taxableType: typeof item.taxable
  })))

  const subtotal = lineItems?.reduce((sum: number, item: any) => sum + parseFloat(item.total_price), 0) || 0

  // Calculate taxable subtotal (exclude items explicitly marked as non-taxable)
  const taxableSubtotal = lineItems?.reduce((sum: number, item: any) => {
    // Only exclude from tax if explicitly set to false
    if (item.taxable === false) {
      console.log('[Invoice Totals] Excluding non-taxable item:', item.total_price)
      return sum
    }
    console.log('[Invoice Totals] Including taxable item:', item.total_price)
    return sum + parseFloat(item.total_price)
  }, 0) || 0

  console.log('[Invoice Totals] Subtotal:', subtotal, 'Taxable Subtotal:', taxableSubtotal)

  // Get current tax rate
  const { data: invoice } = await supabase
    .from('invoices')
    .select('tax_rate')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .single()

  const taxRate = parseFloat(invoice?.tax_rate || 0)
  const taxAmount = taxableSubtotal * taxRate  // Only apply tax to taxable items
  const totalAmount = subtotal + taxAmount
  const balanceAmount = totalAmount // Assuming no payments yet; adjust if paid_amount exists

  // Update invoice totals
  await supabase
    .from('invoices')
    .update({
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      balance_amount: balanceAmount,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
}
