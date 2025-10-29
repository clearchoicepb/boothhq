import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'
import { revalidatePath } from 'next/cache'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filterType = searchParams.get('filterType') || 'all'

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    let query = supabase
      .from('accounts')
      .select('*')
      .eq('tenant_id', session.user.tenantId)
      .order('created_at', { ascending: false })

    if (filterType !== 'all') {
      query = query.eq('account_type', filterType)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching accounts:', error)
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    const response = NextResponse.json(data || [])
    // Reduced cache time to 5 seconds for better UX after creates/updates
    response.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30')
    return response
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error('Error parsing request body:', error)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    console.log('[ACCOUNTS POST] Getting tenant database client for tenant:', session.user.tenantId)
    const supabase = await getTenantDatabaseClient(session.user.tenantId)
    console.log('[ACCOUNTS POST] Got tenant database client, inserting account...')

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        ...body,
        tenant_id: session.user.tenantId
      })
      .select()
      .single()

    console.log('[ACCOUNTS POST] Insert result - error:', error, 'data:', data ? 'success' : 'null')

    if (error) {
      console.error('Error creating account:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      console.error('Request body:', JSON.stringify(body, null, 2))
      return NextResponse.json({ 
        error: 'Failed to create account',
        details: error.message,
        hint: error.hint,
        code: error.code
      }, { status: 500 })
    }

    // Revalidate the accounts list page to show new account immediately
    const tenantSubdomain = session.user.tenantSubdomain || 'default'
    revalidatePath(`/${tenantSubdomain}/accounts`)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}