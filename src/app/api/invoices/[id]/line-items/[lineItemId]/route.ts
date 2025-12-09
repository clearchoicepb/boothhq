import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:invoices')

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

    log.debug({ invoiceId: params.id, lineItemId: params.lineItemId, tenantId: dataSourceTenantId }, 'Request params')
    log.debug({ body }, 'Request body')
    log.debug({ keys: Object.keys(body) }, 'Body keys')

    // Support partial updates - only update fields that are provided
    const updateData: any = {}

    // If this is a sort_order-only update (drag/drop reorder)
    if (body.sort_order !== undefined && Object.keys(body).length === 1) {
      log.debug({}, 'Detected sort_order-only update (drag/drop)')
      updateData.sort_order = body.sort_order
    } else {
      log.debug({}, 'Full update detected')
      // Full update - all fields required
      updateData.item_type = body.item_type
      updateData.package_id = body.package_id || null
      updateData.add_on_id = body.add_on_id || null
      updateData.name = body.name
      updateData.description = body.description || null
      updateData.quantity = parseFloat(body.quantity)
      updateData.unit_price = parseFloat(body.unit_price)
      updateData.total_price = parseFloat(body.quantity) * parseFloat(body.unit_price)
      updateData.taxable = body.taxable !== undefined ? body.taxable : true

      // Include sort_order if provided
      if (body.sort_order !== undefined) {
        updateData.sort_order = body.sort_order
      }
    }

    log.debug({ updateData }, 'Update data')

    const { data, error } = await supabase
      .from('invoice_line_items')
      .update(updateData)
      .eq('id', params.lineItemId)
      .eq('invoice_id', params.id)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      log.error({ error }, '[Update Line Item] Database error')
      return NextResponse.json({ error: 'Failed to update line item', details: error.message }, { status: 500 })
    }

    log.debug({ data }, 'Successfully updated')

    // Only update invoice totals if this wasn't a sort_order-only update
    if (!(body.sort_order !== undefined && Object.keys(body).length === 1)) {
      await updateInvoiceTotals(supabase, params.id, dataSourceTenantId)
    }

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
    log.error({ error }, 'Error')
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
      log.error({ error }, 'Error deleting line item')
      return NextResponse.json({ error: 'Failed to delete line item' }, { status: 500 })
    }

    // Update invoice totals
    await updateInvoiceTotals(supabase, params.id, dataSourceTenantId)

    const response = NextResponse.json({ success: true })
    // Invalidate cache after mutation
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response
  } catch (error) {
    log.error({ error }, 'Error')
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

  log.debug({ lineItems: lineItems?.map(item => ({
    total_price: item.total_price,
    taxable: item.taxable,
    taxableType: typeof item.taxable
  })) }, 'Line items')

  const subtotal = lineItems?.reduce((sum: number, item: any) => sum + parseFloat(item.total_price), 0) || 0

  // Calculate taxable subtotal (exclude items explicitly marked as non-taxable)
  const taxableSubtotal = lineItems?.reduce((sum: number, item: any) => {
    // Only exclude from tax if explicitly set to false
    if (item.taxable === false) {
      log.debug({ price: item.total_price }, 'Excluding non-taxable item')
      return sum
    }
    log.debug({ price: item.total_price }, 'Including taxable item')
    return sum + parseFloat(item.total_price)
  }, 0) || 0

  log.debug({ subtotal, taxableSubtotal }, 'Subtotals calculated')

  // Get current tax rate and paid amount
  const { data: invoice } = await supabase
    .from('invoices')
    .select('tax_rate, paid_amount')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .single()

  const taxRate = parseFloat(invoice?.tax_rate || 0)
  const taxAmount = taxableSubtotal * taxRate  // Only apply tax to taxable items
  const totalAmount = subtotal + taxAmount
  const paidAmount = parseFloat(invoice?.paid_amount || 0)
  const balanceAmount = totalAmount - paidAmount  // Calculate balance considering payments

  log.debug({ totalAmount, paidAmount, balanceAmount }, 'Totals calculated')

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
