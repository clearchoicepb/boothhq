import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:equipment-types')
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const isActiveFilter = searchParams.get('is_active')
    const categoryFilter = searchParams.get('category')

    let query = supabase
      .from('equipment_types')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('sort_order', { ascending: true })

    if (isActiveFilter === 'true') {
      query = query.eq('is_active', true)
    }

    if (categoryFilter && categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter)
    }

    const { data, error } = await query

    if (error) {
      log.error({ error }, 'Error fetching equipment types')
      return NextResponse.json({ error: 'Failed to fetch equipment types' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const body = await request.json()
    const { data, error } = await supabase
      .from('equipment_types')
      .insert({
        ...body,
        tenant_id: dataSourceTenantId
      })
      .select()
      .single()

    if (error) {
      log.error({ error }, 'Error creating equipment type')
      return NextResponse.json({ error: 'Failed to create equipment type' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
