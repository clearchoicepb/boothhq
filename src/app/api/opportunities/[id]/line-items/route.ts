import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const opportunityId = params.id

    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('opportunity_line_items')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .eq('tenant_id', session.user.tenantId)
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const opportunityId = params.id

    const body = await request.json()
    const supabase = createServerSupabaseClient()

    const lineItemData = {
      tenant_id: session.user.tenantId,
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
