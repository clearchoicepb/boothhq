import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:leads')
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const filterType = searchParams.get('filterType') || 'all'
    
    let query = supabase
      .from('leads')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })

    if (filterType !== 'all') {
      query = query.eq('status', filterType)
    }

    const { data, error } = await query

    if (error) {
      log.error({ error }, 'Error fetching leads')
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    const response = NextResponse.json(data)

    // Use no-cache to ensure deleted leads disappear immediately
    // This prevents stale data from being served after DELETE operations
    response.headers.set('Cache-Control', 'private, no-cache, must-revalidate')

    return response
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
      .from('leads')
      .insert({
        ...body,
        tenant_id: dataSourceTenantId
      })
      .select()
      .single()

    if (error) {
      log.error({ error }, 'Error creating lead')
      return NextResponse.json({ error: 'Failed to create lead', details: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}