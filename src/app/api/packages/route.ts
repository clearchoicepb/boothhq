import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:packages')
// GET - Fetch all packages
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const activeOnly = searchParams.get('active') === 'true'

    let query = supabase
      .from('packages')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: packages, error } = await query

    if (error) {
      log.error({ error }, 'Error fetching packages')
      return NextResponse.json({
        error: 'Failed to fetch packages',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json(packages || [])
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new package
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const body = await request.json()
    const {
      name,
      description,
      base_price,
      category,
      is_active = true,
      sort_order = 0,
    } = body

    if (!name || base_price === undefined) {
      return NextResponse.json({
        error: 'Missing required fields: name, base_price'
      }, { status: 400 })
    }

    const { data: package_data, error: createError } = await supabase
      .from('packages')
      .insert({
        tenant_id: dataSourceTenantId,
        name,
        description,
        base_price,
        category,
        is_active,
        sort_order,
      })
      .select()
      .single()

    if (createError) {
      log.error({ createError }, 'Error creating package')
      return NextResponse.json({
        error: 'Failed to create package',
        details: createError.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, package: package_data })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
