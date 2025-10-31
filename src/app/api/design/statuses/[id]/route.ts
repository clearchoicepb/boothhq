import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
// PUT - Update design status
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
  try {
    const { id } = await params
    const body = await request.json()
    const { data, error } = await supabase
      .from('design_statuses')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ status: data })
  } catch (error: any) {
    console.error('Error updating design status:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete design status
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  , { status: 401 })
  }

  try {
    const { id } = await params
    const { error } = await supabase
      .from('design_statuses')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting design status:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
