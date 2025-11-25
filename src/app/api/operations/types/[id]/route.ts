import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'

// GET - Fetch single operations type
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId } = context

  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('operations_item_types')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) throw error

    return NextResponse.json({ type: data })
  } catch (error: any) {
    console.error('Error fetching operations type:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Update operations type
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId } = context

  try {
    const { id } = await params
    const body = await request.json()
    const { data, error } = await supabase
      .from('operations_item_types')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ type: data })
  } catch (error: any) {
    console.error('Error updating operations type:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete operations type
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId } = context

  try {
    const { id } = await params
    const { error } = await supabase
      .from('operations_item_types')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting operations type:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
