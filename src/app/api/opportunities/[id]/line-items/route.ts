import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'

// GET - Fetch all line items for an opportunity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: opportunityId } = await params
    const supabase = createServerSupabaseClient()

    const { data: lineItems, error } = await supabase
      .from('opportunity_line_items')
      .select(`
        *,
        package:packages(id, name),
        add_on:add_ons(id, name)
      `)
      .eq('opportunity_id', opportunityId)
      .eq('tenant_id', session.user.tenantId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching line items:', error)
      return NextResponse.json({
        error: 'Failed to fetch line items',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json(lineItems || [])
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add a line item to an opportunity
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: opportunityId } = await params
    const body = await request.json()
    const {
      item_type,
      package_id,
      add_on_id,
      name,
      description,
      quantity = 1,
      unit_price,
      sort_order = 0,
    } = body

    if (!item_type || !name || unit_price === undefined) {
      return NextResponse.json({
        error: 'Missing required fields: item_type, name, unit_price'
      }, { status: 400 })
    }

    const total = Number(quantity) * Number(unit_price)

    const supabase = createServerSupabaseClient()

    const { data: lineItem, error: createError } = await supabase
      .from('opportunity_line_items')
      .insert({
        tenant_id: session.user.tenantId,
        opportunity_id: opportunityId,
        item_type,
        package_id: package_id || null,
        add_on_id: add_on_id || null,
        name,
        description,
        quantity,
        unit_price,
        total,
        sort_order,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating line item:', createError)
      return NextResponse.json({
        error: 'Failed to create line item',
        details: createError.message
      }, { status: 500 })
    }

    // Update opportunity amount
    await updateOpportunityAmount(supabase, opportunityId, session.user.tenantId)

    return NextResponse.json({ success: true, lineItem })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to update opportunity amount based on line items
async function updateOpportunityAmount(supabase: any, opportunityId: string, tenantId: string) {
  // Sum all line item totals
  const { data: lineItems } = await supabase
    .from('opportunity_line_items')
    .select('total')
    .eq('opportunity_id', opportunityId)
    .eq('tenant_id', tenantId)

  const totalAmount = lineItems?.reduce((sum: number, item: any) => sum + Number(item.total || 0), 0) || 0

  // Update opportunity amount
  await supabase
    .from('opportunities')
    .update({ amount: totalAmount })
    .eq('id', opportunityId)
    .eq('tenant_id', tenantId)
}
