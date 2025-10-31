import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
// GET - Fetch a single add-on
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { id } = await params
    const { data: addOn, error } = await supabase
      .from('add_ons')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error || !addOn) {
      return NextResponse.json({ error: 'Add-on not found' }, { status: 404 })
    }

    return NextResponse.json(addOn)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update an add-on
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      name,
      description,
      price,
      unit,
      category,
      is_active,
      sort_order,
    } = body

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (price !== undefined) updateData.price = price
    if (unit !== undefined) updateData.unit = unit
    if (category !== undefined) updateData.category = category
    if (is_active !== undefined) updateData.is_active = is_active
    if (sort_order !== undefined) updateData.sort_order = sort_order

    const { data: addOn, error: updateError } = await supabase
      .from('add_ons')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating add-on:', updateError)
      return NextResponse.json({
        error: 'Failed to update add-on',
        details: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, addOn })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete an add-on
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { error: deleteError } = await supabase
      .from('add_ons')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (deleteError) {
      console.error('Error deleting add-on:', deleteError)
      return NextResponse.json({
        error: 'Failed to delete add-on',
        details: deleteError.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
