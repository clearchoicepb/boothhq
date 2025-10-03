import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'

// PUT - Update a line item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lineItemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: opportunityId, lineItemId } = await params
    const body = await request.json()
    const {
      name,
      description,
      quantity,
      unit_price,
      sort_order,
    } = body

    const supabase = createServerSupabaseClient()

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (quantity !== undefined) updateData.quantity = quantity
    if (unit_price !== undefined) updateData.unit_price = unit_price
    if (sort_order !== undefined) updateData.sort_order = sort_order

    // Recalculate total if quantity or unit_price changed
    if (quantity !== undefined || unit_price !== undefined) {
      const { data: currentItem } = await supabase
        .from('opportunity_line_items')
        .select('quantity, unit_price')
        .eq('id', lineItemId)
        .eq('tenant_id', session.user.tenantId)
        .single()

      const newQuantity = quantity !== undefined ? quantity : currentItem?.quantity || 1
      const newUnitPrice = unit_price !== undefined ? unit_price : currentItem?.unit_price || 0

      updateData.total = Number(newQuantity) * Number(newUnitPrice)
    }

    const { data: lineItem, error: updateError } = await supabase
      .from('opportunity_line_items')
      .update(updateData)
      .eq('id', lineItemId)
      .eq('opportunity_id', opportunityId)
      .eq('tenant_id', session.user.tenantId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating line item:', updateError)
      return NextResponse.json({
        error: 'Failed to update line item',
        details: updateError.message
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

// DELETE - Delete a line item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lineItemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: opportunityId, lineItemId } = await params
    const supabase = createServerSupabaseClient()

    const { error: deleteError } = await supabase
      .from('opportunity_line_items')
      .delete()
      .eq('id', lineItemId)
      .eq('opportunity_id', opportunityId)
      .eq('tenant_id', session.user.tenantId)

    if (deleteError) {
      console.error('Error deleting line item:', deleteError)
      return NextResponse.json({
        error: 'Failed to delete line item',
        details: deleteError.message
      }, { status: 500 })
    }

    // Update opportunity amount
    await updateOpportunityAmount(supabase, opportunityId, session.user.tenantId)

    return NextResponse.json({ success: true })
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
