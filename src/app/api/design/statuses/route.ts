import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

// GET - Fetch all design statuses for tenant
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data, error } = await supabase
      .from('design_statuses')
      .select('*')
      .eq('tenant_id', session.user.tenantId)
      .order('display_order')

    if (error) throw error

    return NextResponse.json({ statuses: data || [] })
  } catch (error: any) {
    console.error('Error fetching design statuses:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new design status
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data, error } = await supabase
      .from('design_statuses')
      .insert({
        ...body,
        tenant_id: session.user.tenantId
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ status: data })
  } catch (error: any) {
    console.error('Error creating design status:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
