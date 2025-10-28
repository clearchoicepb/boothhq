import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

// GET - Fetch all packages
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const activeOnly = searchParams.get('active') === 'true'

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    let query = supabase
      .from('packages')
      .select('*')
      .eq('tenant_id', session.user.tenantId)
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
      console.error('Error fetching packages:', error)
      return NextResponse.json({
        error: 'Failed to fetch packages',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json(packages || [])
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new package
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data: package_data, error: createError } = await supabase
      .from('packages')
      .insert({
        tenant_id: session.user.tenantId,
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
      console.error('Error creating package:', createError)
      return NextResponse.json({
        error: 'Failed to create package',
        details: createError.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, package: package_data })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
