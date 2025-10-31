import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; lineItemId: string } }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const body = await request.json()
    const updateData: any = {
      item_type: body.item_type,
      package_id: body.package_id || null,
      add_on_id: body.add_on_id || null,
      name: body.name,
      description: body.description || null,
      quantity: parseFloat(body.quantity),
      unit_price: parseFloat(body.unit_price),
      total: parseFloat(body.quantity) * parseFloat(body.unit_price),
      sort_order: body.sort_order || 0
    }

    const { data, error } = await supabase
      .from('opportunity_line_items')
      .update(updateData)
      .eq('id', params.lineItemId)
      .eq('opportunity_id', params.id)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating line item:', error)
      return NextResponse.json({ error: 'Failed to update line item' }, { status: 500 })
    }

    // Update opportunity amount
    await updateOpportunityAmount(supabase, params.id, session.user.tenantId)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; lineItemId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('opportunity_line_items')
      .delete()
      .eq('id', params.lineItemId)
      .eq('opportunity_id', params.id)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      console.error('Error deleting line item:', error)
      return NextResponse.json({ error: 'Failed to delete line item' }, { status: 500 })
    }

    // Update opportunity amount
    await updateOpportunityAmount(supabase, params.id, session.user.tenantId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function updateOpportunityAmount(supabase: any, opportunityId: string, tenantId: string) {
  // Calculate total from all line items
  const { data: lineItems } = await supabase
    .from('opportunity_line_items')
    .select('total')
    .eq('opportunity_id', opportunityId)
    .eq('tenant_id', tenantId)

  const totalAmount = lineItems?.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0) || 0

  // Update opportunity amount
  await supabase
    .from('opportunities')
    .update({ amount: totalAmount })
    .eq('id', opportunityId)
    .eq('tenant_id', tenantId)
}
