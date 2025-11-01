import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active_only') === 'true'

    let query = supabase
      .from('staff_roles')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('type', { ascending: true })
      .order('sort_order', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching staff roles:', error)
      return NextResponse.json({ error: 'Failed to fetch staff roles' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    // Check if user has admin role
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const roleData = {
      tenant_id: dataSourceTenantId,
      name: body.name,
      type: body.type,
      is_active: body.is_active ?? false,
      is_default: false, // Custom roles are never default
      sort_order: body.sort_order ?? 0
    }

    const { data, error } = await supabase
      .from('staff_roles')
      .insert(roleData)
      .select()
      .single()

    if (error) {
      console.error('Error creating staff role:', error)
      return NextResponse.json({ error: 'Failed to create staff role', details: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
