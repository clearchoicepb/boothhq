import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:equipment')
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'all'
    const conditionFilter = searchParams.get('condition') || 'all'

    let query = supabase
      .from('equipment')
      .select(`
        *,
        equipment_categories!equipment_category_id_fkey(name)
      `)
      .eq('tenant_id', dataSourceTenantId)
      .order('name', { ascending: true })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (conditionFilter !== 'all') {
      query = query.eq('condition', conditionFilter)
    }

    const { data, error } = await query

    if (error) {
      log.error({ error }, 'Error fetching equipment')
      return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 })
    }

    // Transform the data to include category_name
    const transformedData = data?.map(item => ({
      ...item,
      category_name: item.equipment_categories?.name || null
    })) || []

    return NextResponse.json(transformedData)
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
      .from('equipment')
      .insert({
        ...body,
        tenant_id: dataSourceTenantId
      })
      .select()
      .single()

    if (error) {
      log.error({ error }, 'Error creating equipment')
      return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}






