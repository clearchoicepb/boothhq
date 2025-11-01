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
    const opportunityId = params.id

    const { data, error } = await supabase
      .from('opportunity_line_items')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .eq('tenant_id', dataSourceTenantId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching opportunity line items:', error)
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
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await routeContext.params
    const opportunityId = params.id

    const body = await request.json()
    const lineItemData = {
      tenant_id: dataSourceTenantId,
      opportunity_id: opportunityId,
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
      .insert(lineItemData)
      .select()
      .single()

    if (error) {
      console.error('Error creating line item:', error)
      return NextResponse.json({ error: 'Failed to create line item' }, { status: 500 })
    }

    // Update opportunity amount
    await updateOpportunityAmount(supabase, opportunityId, session.user.tenantId)

    return NextResponse.json(data)
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
