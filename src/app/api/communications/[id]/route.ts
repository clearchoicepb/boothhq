import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data, error } = await supabase
      .from('communications')
      .select(`
        *,
        contacts (
          first_name,
          last_name
        ),
        accounts (
          name
        ),
        leads (
          first_name,
          last_name
        )
      `)
      .eq('id', (await params).id)
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (error) {
      console.error('Error fetching communication:', error)
      return NextResponse.json({ error: 'Failed to fetch communication' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data, error } = await supabase
      .from('communications')
      .update(body)
      .eq('id', (await params).id)
      .eq('tenant_id', session.user.tenantId)
      .select(`
        *,
        contacts (
          first_name,
          last_name
        ),
        accounts (
          name
        ),
        leads (
          first_name,
          last_name
        )
      `)
      .single()

    if (error) {
      console.error('Error updating communication:', error)
      return NextResponse.json({ error: 'Failed to update communication', details: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { error } = await supabase
      .from('communications')
      .delete()
      .eq('id', (await params).id)
      .eq('tenant_id', session.user.tenantId)

    if (error) {
      console.error('Error deleting communication:', error)
      return NextResponse.json({ error: 'Failed to delete communication', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
