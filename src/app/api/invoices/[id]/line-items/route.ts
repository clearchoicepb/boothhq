import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const params = await routeContext.params
    const invoiceId = params.id

    const { data, error } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .eq('tenant_id', dataSourceTenantId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching invoice line items:', error)
      return NextResponse.json({ error: 'Failed to fetch line items' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const params = await routeContext.params
    const invoiceId = params.id

    const body = await request.json()
    const lineItemData = {
      tenant_id: dataSourceTenantId,
      invoice_id: invoiceId,
      item_type: body.item_type,
      package_id: body.package_id || null,
      add_on_id: body.add_on_id || null,
      name: body.name,
      description: body.description || null,
      quantity: parseFloat(body.quantity),
      unit_price: parseFloat(body.unit_price),
      total_price: parseFloat(body.quantity) * parseFloat(body.unit_price),
      sort_order: body.sort_order || 0
    }

    const { data, error } = await supabase
      .from('invoice_line_items')
      .insert(lineItemData)
      .select()
      .single()

    if (error) {
      console.error('Error creating line item:', error)
      return NextResponse.json({ error: 'Failed to create line item' }, { status: 500 })
    }

    // Update invoice totals
    await updateInvoiceTotals(supabase, invoiceId, dataSourceTenantId)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function updateInvoiceTotals(supabase: any, invoiceId: string, tenantId: string) {
  // Calculate subtotal from all line items
  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('total_price')
    .eq('invoice_id', invoiceId)
    .eq('tenant_id', tenantId)

  const subtotal = lineItems?.reduce((sum: number, item: any) => sum + parseFloat(item.total_price), 0) || 0

  // Get current tax rate
  const { data: invoice } = await supabase
    .from('invoices')
    .select('tax_rate')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .single()

  const taxRate = parseFloat(invoice?.tax_rate || 0)
  const taxAmount = subtotal * taxRate
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
