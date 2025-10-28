import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; lineItemId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

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
      .eq('tenant_id', session.user.tenantId)
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

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { error } = await supabase
      .from('opportunity_line_items')
      .delete()
      .eq('id', params.lineItemId)
      .eq('opportunity_id', params.id)
      .eq('tenant_id', session.user.tenantId)

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
