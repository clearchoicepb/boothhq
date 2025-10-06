import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const id = params.id
    const body = await request.json()
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('booth_types')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating booth type:', error)
      return NextResponse.json({ error: 'Failed to update booth type' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const id = params.id
    const supabase = createServerSupabaseClient()

    const { error } = await supabase
      .from('booth_types')
      .delete()
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)

    if (error) {
      console.error('Error deleting booth type:', error)
      return NextResponse.json({ error: 'Failed to delete booth type' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
