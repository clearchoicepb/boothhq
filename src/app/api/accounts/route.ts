import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// Create a module-specific logger
const log = createLogger('api:accounts')

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)
    const filterType = searchParams.get('filterType') || 'all'

    let query = supabase
      .from('accounts')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })

    if (filterType !== 'all') {
      query = query.eq('account_type', filterType)
    }

    const { data, error } = await query

    if (error) {
      log.error({ error, tenantId: dataSourceTenantId }, 'Failed to fetch accounts')
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    log.debug({ count: data?.length, filterType }, 'Accounts fetched successfully')

    const response = NextResponse.json(data || [])
    response.headers.set('Cache-Control', 'private, no-cache, must-revalidate')
    return response
  } catch (error) {
    log.error({ error }, 'Unexpected error in GET /api/accounts')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    let body
    try {
      body = await request.json()
    } catch (error) {
      log.warn({ error }, 'Invalid JSON in request body')
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    log.debug({ tenantId: dataSourceTenantId }, 'Creating account')

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        ...body,
        tenant_id: dataSourceTenantId
      })
      .select()
      .single()

    if (error) {
      log.error({ 
        error, 
        tenantId: dataSourceTenantId,
        errorCode: error.code,
        hint: error.hint 
      }, 'Failed to create account')
      
      return NextResponse.json({ 
        error: 'Failed to create account',
        details: error.message,
        hint: error.hint,
        code: error.code
      }, { status: 500 })
    }

    log.info({ accountId: data.id, tenantId: dataSourceTenantId }, 'Account created successfully')

    // Revalidate the accounts list page
    const tenantSubdomain = session.user.tenantSubdomain || 'default'
    revalidatePath(`/${tenantSubdomain}/accounts`)

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Unexpected error in POST /api/accounts')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
