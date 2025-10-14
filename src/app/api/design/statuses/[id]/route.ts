import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

// PUT - Update design status
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('design_statuses')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)
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
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const supabase = createServerSupabaseClient()

    const { error } = await supabase
      .from('design_statuses')
      .delete()
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting design status:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
