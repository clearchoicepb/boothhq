import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

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
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data, error } = await supabase
      .from('equipment_types')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating equipment type:', error)
      return NextResponse.json({ error: 'Failed to update equipment type' }, { status: 500 })
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
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { error } = await supabase
      .from('equipment_types')
      .delete()
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)

    if (error) {
      console.error('Error deleting equipment type:', error)
      return NextResponse.json({ error: 'Failed to delete equipment type' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
